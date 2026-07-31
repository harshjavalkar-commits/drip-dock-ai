import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OutfitInput = z.object({ occasion: z.string().min(1).max(60), notes: z.string().max(300).optional() });
const PackingInput = z.object({
  destination: z.string().min(1).max(120),
  weather: z.string().min(1).max(60),
  duration_days: z.number().int().min(1).max(90),
  trip_type: z.string().min(1).max(60),
});

export type GeneratedOutfit = {
  title: string;
  score: number;
  explanation: string;
  item_ids: string[];
};

export type GeneratedPacking = {
  summary: string;
  checklist: { item_id?: string; label: string; note?: string }[];
};

export const generateOutfits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OutfitInput.parse(input))
  .handler(async ({ data, context }): Promise<GeneratedOutfit[]> => {
    const { callLovableAi, extractJson } = await import("@/lib/ai.server");
    const { data: items, error } = await context.supabase
      .from("clothing_items")
      .select("id,name,category,brand,color,material,pattern,fit,occasions,seasons,favorite")
      .limit(400);
    if (error) throw new Error(error.message);
    if (!items || items.length < 2) throw new Error("Add a few more pieces first.");

    const raw = await callLovableAi([
      {
        role: "system",
        content:
          "You are DripDock's personal stylist. You compose outfits ONLY from the wardrobe items given. " +
          "Never invent items or ids. Each outfit needs a top, a bottom, shoes, optional accessories and outerwear when the occasion needs it. " +
          'Reply with strict JSON only: {"outfits":[{"title":string,"score":number 0-100,"explanation":string,"item_ids":string[]}]} with exactly 3 outfits.',
      },
      {
        role: "user",
        content: `Occasion: ${data.occasion}\n${data.notes ? `Extra context: ${data.notes}\n` : ""}Wardrobe JSON:\n${JSON.stringify(items)}`,
      },
    ]);

    const parsed = extractJson<{ outfits?: GeneratedOutfit[] }>(raw);
    const valid = new Set(items.map((i) => i.id));
    return (parsed.outfits ?? [])
      .map((outfit) => ({
        title: String(outfit.title ?? "Outfit").slice(0, 120),
        score: Math.max(0, Math.min(100, Math.round(Number(outfit.score) || 0))),
        explanation: String(outfit.explanation ?? ""),
        item_ids: (outfit.item_ids ?? []).filter((id) => valid.has(id)),
      }))
      .filter((outfit) => outfit.item_ids.length > 1);
  });

export const generatePacking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PackingInput.parse(input))
  .handler(async ({ data, context }): Promise<GeneratedPacking> => {
    const { callLovableAi, extractJson } = await import("@/lib/ai.server");
    const { data: items, error } = await context.supabase
      .from("clothing_items")
      .select("id,name,category,brand,color,material,seasons,occasions")
      .limit(400);
    if (error) throw new Error(error.message);
    if (!items || items.length === 0) throw new Error("Add some pieces to your dock first.");

    const raw = await callLovableAi([
      {
        role: "system",
        content:
          "You are DripDock's packing assistant. Build a packing checklist using ONLY the wardrobe items provided, " +
          "sized correctly for the trip length and weather. You may add up to 3 generic essentials the user clearly lacks (leave item_id empty for those). " +
          'Reply with strict JSON only: {"summary":string,"checklist":[{"item_id":string|null,"label":string,"note":string}]}.',
      },
      {
        role: "user",
        content: `Destination: ${data.destination}\nWeather: ${data.weather}\nDuration: ${data.duration_days} days\nTrip type: ${data.trip_type}\nWardrobe JSON:\n${JSON.stringify(items)}`,
      },
    ]);

    const parsed = extractJson<GeneratedPacking>(raw);
    const valid = new Set(items.map((i) => i.id));
    return {
      summary: String(parsed.summary ?? ""),
      checklist: (parsed.checklist ?? []).slice(0, 60).map((entry) => ({
        ...(entry.item_id && valid.has(entry.item_id) ? { item_id: entry.item_id } : {}),
        label: String(entry.label ?? "").slice(0, 160),
        note: entry.note ? String(entry.note).slice(0, 200) : "",
      })),
    };
  });
