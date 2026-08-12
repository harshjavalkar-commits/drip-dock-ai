import { supabase } from "@/lib/supabase";
import {
  ACCESSORY_CATEGORIES,
  BOTTOM_CATEGORIES,
  SHOE_CATEGORIES,
  TOP_CATEGORIES,
  type ClothingItem,
} from "@/lib/wardrobe";

export type MiniYouStatus = "draft" | "ready";
export type MiniYouStyle = "minimal-3d" | "realistic-chibi";

export const MINI_YOU_STYLES: {
  id: MiniYouStyle;
  label: string;
  tagline: string;
  description: string;
  promptStyle: string;
}[] = [
  {
    id: "minimal-3d",
    label: "Minimal 3D",
    tagline: "Editorial, matte, quietly premium",
    description:
      "A clean, matte 3D figure with soft studio light — closest to the DripDock house look.",
    promptStyle:
      "a minimal 3D character render: smooth matte surfaces, soft neutral studio lighting, realistic body proportions, understated editorial styling, no exaggerated cartoon features",
  },
  {
    id: "realistic-chibi",
    label: "Realistic Chibi",
    tagline: "Playful proportions, real face",
    description:
      "A collectible-figure look: slightly larger head, realistic facial likeness, toy-grade finish.",
    promptStyle:
      "a realistic chibi collectible figure: slightly enlarged head with an accurate, recognisable facial likeness, compact stylised body, fine toy-grade material detail, soft studio lighting",
  },
];

/** The exact prompt the user pastes into ChatGPT alongside their selfie. */
export function miniYouPrompt(style: MiniYouStyle, brief?: string | null): string {
  const preset = MINI_YOU_STYLES.find((s) => s.id === style) ?? MINI_YOU_STYLES[0]!;
  return [
    `Using the attached selfie as the facial reference, create ${preset.promptStyle}.`,
    "",
    "Requirements:",
    "- Full body, head to shoes, standing straight and facing the camera.",
    "- Keep the person's face, hair, skin tone and body type clearly recognisable.",
    "- Neutral plain ivory background, no props, no text, no watermark.",
    "- Soft natural shadow under the feet, centred composition, vertical 3:4 framing.",
    "- Simple neutral base outfit (plain tee, plain trousers, plain shoes) so garments can be layered later.",
    "- Photorealistic render quality, high detail, no distortion of hands or limbs.",
    brief?.trim() ? `- Personal notes: ${brief.trim()}` : "",
    "",
    "Output one image only.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type MiniYouProfile = {
  id: string;
  user_id: string;
  image_url: string | null;
  /** Placeholder for the future AI-generated MiniYou prompt. */
  prompt: string | null;
  style: MiniYouStyle | null;
  status: MiniYouStatus;
  created_at: string;
  updated_at: string;
};


/** The generated types file doesn't know about mini_you_profiles yet. */
const table = () =>
  (supabase as unknown as {
    from: (name: string) => ReturnType<typeof supabase.from>;
  }).from("mini_you_profiles");

export async function fetchMiniYou(userId: string): Promise<MiniYouProfile | null> {
  const { data, error } = await table()
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as MiniYouProfile) ?? null;
}

export async function uploadMiniYouImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/mini-you/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("wardrobe").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function saveMiniYou(
  userId: string,
  patch: {
    image_url?: string | null;
    prompt?: string | null;
    style?: MiniYouStyle | null;
    status?: MiniYouStatus;
  },
): Promise<MiniYouProfile> {
  const { data, error } = await table()
    .upsert(
      { user_id: userId, ...patch, updated_at: new Date().toISOString() } as never,
      { onConflict: "user_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as MiniYouProfile;
}

/* ------------------------------------------------------------------ */
/* Wardrobe completeness                                               */
/* ------------------------------------------------------------------ */

export const COMPLETENESS_SLOTS = [
  { key: "Tops", categories: TOP_CATEGORIES },
  { key: "Bottoms", categories: BOTTOM_CATEGORIES },
  { key: "Shoes", categories: SHOE_CATEGORIES },
  { key: "Accessories", categories: ACCESSORY_CATEGORIES },
] as const;

export type SlotState = { key: string; count: number; filled: boolean };

export function wardrobeCompleteness(items: ClothingItem[]): {
  slots: SlotState[];
  filled: number;
  ratio: number;
  complete: boolean;
} {
  const slots = COMPLETENESS_SLOTS.map((slot) => {
    const count = items.filter((item) => slot.categories.includes(item.category)).length;
    return { key: slot.key, count, filled: count > 0 };
  });
  const filled = slots.filter((slot) => slot.filled).length;
  return {
    slots,
    filled,
    ratio: filled / slots.length,
    // Tops + bottoms + shoes are the minimum for a complete look.
    complete: slots.slice(0, 3).every((slot) => slot.filled),
  };
}
