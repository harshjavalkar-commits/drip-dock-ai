import { supabase } from "@/lib/supabase";
import {
  ACCESSORY_CATEGORIES,
  BOTTOM_CATEGORIES,
  SHOE_CATEGORIES,
  TOP_CATEGORIES,
  type ClothingItem,
} from "@/lib/wardrobe";

export type MiniYouStatus = "draft" | "ready";

export type MiniYouProfile = {
  id: string;
  user_id: string;
  image_url: string | null;
  /** Placeholder for the future AI-generated MiniYou prompt. */
  prompt: string | null;
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
  patch: { image_url?: string | null; prompt?: string | null; status?: MiniYouStatus },
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
