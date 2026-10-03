import {
  BOTTOM_CATEGORIES,
  SHOE_CATEGORIES,
  TOP_CATEGORIES,
  type ClothingItem,
} from "@/lib/wardrobe";

export const LOOK_MOODS = ["Everyday", "Office", "After hours", "Weekend", "Travel"] as const;
export const LOOK_THEMES = {
  paper: { label: "Editorial", background: "#f3eee5", ink: "#282723", accent: "#78765e" },
  blush: { label: "Blush", background: "#efdce0", ink: "#482e38", accent: "#915e72" },
  olive: { label: "Olive", background: "#dce0cf", ink: "#33392d", accent: "#657447" },
} as const;
export type LookTheme = keyof typeof LOOK_THEMES;
export const SLOTS = ["All", "Tops", "Bottoms", "Shoes", "Extras"] as const;
export type LookSlot = (typeof SLOTS)[number];
export function itemSlot(category: string): LookSlot {
  if (TOP_CATEGORIES.includes(category)) return "Tops";
  if (BOTTOM_CATEGORIES.includes(category)) return "Bottoms";
  if (SHOE_CATEGORIES.includes(category)) return "Shoes";
  return "Extras";
}
export function toggleLookItem(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((i) => i !== id) : ids.length < 6 ? [...ids, id] : ids;
}
/** Simple local shuffle, not represented as an AI recommendation. Pinned pieces stay. */
export function remixLook(items: ClothingItem[], locked: string[], random = Math.random): string[] {
  const valid = new Map(items.map((item) => [item.id, item]));
  const picked = [...new Set(locked)].filter((id) => valid.has(id)).slice(0, 6);
  for (const slot of ["Tops", "Bottoms", "Shoes", "Extras"] as const) {
    if (picked.length >= 6 || picked.some((id) => itemSlot(valid.get(id)!.category) === slot))
      continue;
    const choices = items.filter(
      (item) => itemSlot(item.category) === slot && !picked.includes(item.id),
    );
    if (choices.length)
      picked.push(choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]!.id);
  }
  return picked;
}
/** Normalized rectangles used by both the live board and PNG renderer. */
export function lookLayout(count: number) {
  if (count <= 1) return [{ x: 0.2, y: 0.05, w: 0.6, h: 0.9, angle: -3 }];
  if (count === 2)
    return [
      { x: 0.03, y: 0.02, w: 0.49, h: 0.93, angle: -5 },
      { x: 0.5, y: 0.02, w: 0.47, h: 0.93, angle: 5 },
    ];
  const cols = count <= 4 ? 2 : 3;
  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols) / cols + 0.02,
    y: Math.floor(i / cols) * 0.5 + 0.02,
    w: 1 / cols - 0.04,
    h: 0.46,
    angle: i % 2 ? 5 : -5,
  }));
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
