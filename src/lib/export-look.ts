import { supabase } from "@/lib/supabase";
import { stickerPath } from "@/lib/stickers";
import { LOOK_THEMES, lookLayout, type LookTheme } from "@/lib/lookbook";
import { toBlob } from "@/lib/atelier";
import type { ClothingItem } from "@/lib/wardrobe";

async function loadImage(path: string): Promise<ImageBitmap> {
  if (/^https?:/.test(path)) {
    const response = await fetch(path, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("A piece could not be loaded for export.");
    return createImageBitmap(await response.blob());
  }
  const { data, error } = await supabase.storage.from("wardrobe").download(path);
  if (error || !data) throw new Error("A piece could not be loaded for export.");
  return createImageBitmap(data);
}
function fit(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ratio = Math.min(w / img.width, h / img.height);
  ctx.drawImage(
    img,
    x + (w - img.width * ratio) / 2,
    y + (h - img.height * ratio) / 2,
    img.width * ratio,
    img.height * ratio,
  );
}
function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  let clipped = text;
  while (clipped.length && ctx.measureText(clipped).width > max) clipped = clipped.slice(0, -1);
  return clipped === text ? text : `${clipped.slice(0, -1)}…`;
}
export async function exportLook(input: {
  items: ClothingItem[];
  title: string;
  mood: string;
  theme: LookTheme;
  miniYouPath?: string | null;
}) {
  if (!input.items.length) throw new Error("Add at least one piece first.");
  await document.fonts.ready;
  const loaded: ImageBitmap[] = [];
  try {
    for (const item of input.items) {
      const path = stickerPath(item);
      if (!path) throw new Error(`${item.name} has no photo. Add one before exporting.`);
      loaded.push(await loadImage(path));
    }
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 1350;
    const ctx = c.getContext("2d")!;
    const p = LOOK_THEMES[input.theme];
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = p.ink;
    ctx.font = '22px "DM Sans", sans-serif';
    ctx.fillText("THE PERSONAL STYLE ISSUE", 76, 88);
    ctx.textAlign = "right";
    ctx.fillText(input.mood.toUpperCase(), 1004, 88);
    ctx.textAlign = "left";
    ctx.font = '132px "Instrument Serif", Georgia, serif';
    ctx.fillText("DRIPDOCK", 70, 238);
    const boxes = lookLayout(loaded.length);
    loaded.forEach((img, i) => {
      const b = boxes[i]!;
      const x = 76 + b.x * 928,
        y = 338 + b.y * 756,
        w = b.w * 928,
        h = b.h * 756;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((b.angle * Math.PI) / 180);
      ctx.shadowColor = "rgba(30,25,20,.14)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 12;
      fit(ctx, img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
    ctx.strokeStyle = p.accent;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(76, 1120);
    ctx.lineTo(1004, 1120);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = '20px "DM Sans", sans-serif';
    ctx.fillText("WORN YOUR WAY", 76, 1162);
    ctx.font = '64px "Instrument Serif", Georgia, serif';
    ctx.fillText(
      fitText(ctx, input.title || "The everyday edit", input.miniYouPath ? 760 : 920),
      76,
      1230,
    );
    ctx.font = '22px "DM Sans", sans-serif';
    ctx.fillText("My wardrobe. My point of view.", 76, 1270);
    if (input.miniYouPath) {
      const avatar = await loadImage(input.miniYouPath);
      loaded.push(avatar);
      fit(ctx, avatar, 880, 1140, 124, 135);
    }
    return new File(
      [await toBlob(c, "image/png")],
      `dripdock-${
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 50) || "my-look"
      }.png`,
      { type: "image/png" },
    );
  } finally {
    loaded.forEach((image) => image.close());
  }
}
