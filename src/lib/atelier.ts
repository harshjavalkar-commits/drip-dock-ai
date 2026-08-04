import { supabase } from "@/lib/supabase";

export const PROCESSING_STAGES = [
  "uploading",
  "orienting",
  "extracting",
  "refining",
  "complete",
] as const;
export type ProcessingStage = (typeof PROCESSING_STAGES)[number];

export type ProcessingStatus = "idle" | "processing" | "ready" | "failed" | "skipped";

export const STAGE_LABELS: Record<ProcessingStage, string> = {
  uploading: "Saving original",
  orienting: "Correcting orientation",
  extracting: "Lifting garment off the background",
  refining: "Setting the studio backdrop",
  complete: "Atelier finish ready",
};

export type AtelierImages = {
  image_url: string | null;
  original_image_url: string | null;
  extracted_image_url: string | null;
  refined_image_url: string | null;
  image_processing_status: ProcessingStatus;
  image_processing_stage: ProcessingStage | null;
  image_processed_at: string | null;
};

export function emptyAtelier(): AtelierImages {
  return {
    image_url: null,
    original_image_url: null,
    extracted_image_url: null,
    refined_image_url: null,
    image_processing_status: "idle",
    image_processing_stage: null,
    image_processed_at: null,
  };
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

const MAX_EDGE = 1600;

/** Decodes a file and bakes in EXIF orientation (iPhone photos). */
async function decodeUpright(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      type,
      quality,
    );
  });
}

/**
 * Background extraction — deterministic, on-device.
 * Flood-fills from the borders, removing pixels close to the sampled
 * backdrop colour, then crops to the garment's bounding box.
 * This is the pre-AI pipeline; the AI pass will replace this step later.
 */
function extractGarment(source: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = source;
  const ctx = source.getContext("2d")!;
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;

  const px = (x: number, y: number) => (y * w + x) * 4;
  // Sample the border to learn the backdrop.
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let x = 0; x < w; x += 2) {
    for (const y of [0, h - 1]) {
      const i = px(x, y);
      sr += data[i]!;
      sg += data[i + 1]!;
      sb += data[i + 2]!;
      n++;
    }
  }
  for (let y = 0; y < h; y += 2) {
    for (const x of [0, w - 1]) {
      const i = px(x, y);
      sr += data[i]!;
      sg += data[i + 1]!;
      sb += data[i + 2]!;
      n++;
    }
  }
  const br = sr / n;
  const bg = sg / n;
  const bb = sb / n;
  const TOL = 46 * 46 * 3;

  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) {
    stack.push(x, 0, x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    stack.push(0, y, w - 1, y);
  }

  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const idx = y * w + x;
    if (seen[idx]) continue;
    const i = idx * 4;
    const dr = data[i]! - br;
    const dg = data[i + 1]! - bg;
    const db = data[i + 2]! - bb;
    if (dr * dr + dg * dg + db * db > TOL) continue;
    seen[idx] = 1;
    data[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // Feather the cut edge so it doesn't read as a sticker.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (seen[idx]) continue;
      const neighbours =
        seen[idx - 1]! + seen[idx + 1]! + seen[idx - w]! + seen[idx + w]!;
      if (neighbours) data[idx * 4 + 3] = 255 - neighbours * 45;
    }
  }

  // Bounding box of what survived.
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = w - 1;
    maxY = h - 1;
  }

  const cut = document.createElement("canvas");
  cut.width = w;
  cut.height = h;
  cut.getContext("2d")!.putImageData(image, 0, 0);

  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w - cx, maxX - minX + pad * 2);
  const ch = Math.min(h - cy, maxY - minY + pad * 2);

  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(cut, cx, cy, cw, ch, 0, 0, cw, ch);
  return out;
}

/**
 * Refinement pass — places the cut-out on a catalogue backdrop with a
 * soft contact shadow and gentle contrast lift. Placeholder for the AI
 * relight/regenerate pass.
 */
function refineGarment(cutout: HTMLCanvasElement, intensity = 1): HTMLCanvasElement {
  const SIZE_W = 1000;
  const SIZE_H = 1333;
  const out = document.createElement("canvas");
  out.width = SIZE_W;
  out.height = SIZE_H;
  const ctx = out.getContext("2d")!;

  // Ivory studio wall with a spotlight pool.
  ctx.fillStyle = "#f6f1e8";
  ctx.fillRect(0, 0, SIZE_W, SIZE_H);
  const glow = ctx.createRadialGradient(
    SIZE_W / 2,
    SIZE_H * 0.36,
    40,
    SIZE_W / 2,
    SIZE_H * 0.46,
    SIZE_H * 0.72,
  );
  glow.addColorStop(0, "rgba(255,253,247,0.95)");
  glow.addColorStop(1, "rgba(232,222,206,0.35)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE_W, SIZE_H);

  const margin = 0.86 - 0.03 * (intensity - 1);
  const scale = Math.min(
    (SIZE_W * margin) / cutout.width,
    (SIZE_H * margin) / cutout.height,
  );
  const dw = cutout.width * scale;
  const dh = cutout.height * scale;
  const dx = (SIZE_W - dw) / 2;
  const dy = (SIZE_H - dh) / 2;

  // Contact shadow.
  ctx.save();
  ctx.filter = "blur(26px)";
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#4a3a2c";
  ctx.beginPath();
  ctx.ellipse(SIZE_W / 2, dy + dh * 0.99, dw * 0.34, dh * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.filter = `contrast(${1 + 0.05 * intensity}) saturate(${1 + 0.06 * intensity}) brightness(${1 + 0.02 * intensity})`;
  ctx.drawImage(cutout, dx, dy, dw, dh);
  ctx.restore();

  return out;
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

export function assetFolder(userId: string, assetId: string) {
  return `${userId}/${assetId}`;
}

async function upload(path: string, blob: Blob, contentType: string) {
  const { error } = await supabase.storage.from("wardrobe").upload(path, blob, {
    contentType,
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

export type PipelineUpdate = { stage: ProcessingStage; images: AtelierImages };

/**
 * Full on-device pipeline: original -> upright -> extracted -> refined.
 * Reports each stage so the UI can narrate progress.
 */
export async function runAtelierPipeline(
  file: File,
  userId: string,
  onStage: (update: PipelineUpdate) => void,
): Promise<AtelierImages> {
  const assetId = crypto.randomUUID();
  const folder = assetFolder(userId, assetId);
  const images: AtelierImages = { ...emptyAtelier(), image_processing_status: "processing" };

  const emit = (stage: ProcessingStage) => {
    images.image_processing_stage = stage;
    onStage({ stage, images: { ...images } });
  };

  emit("uploading");
  const upright = await decodeUpright(file);

  emit("orienting");
  const originalBlob = await toBlob(upright, "image/jpeg", 0.92);
  images.original_image_url = await upload(`${folder}/original.jpg`, originalBlob, "image/jpeg");
  images.image_url = images.original_image_url;
  emit("orienting");

  emit("extracting");
  const cutout = extractGarment(upright);
  const cutBlob = await toBlob(cutout, "image/png");
  images.extracted_image_url = await upload(`${folder}/extracted.png`, cutBlob, "image/png");
  emit("extracting");

  emit("refining");
  const refined = refineGarment(cutout);
  const refinedBlob = await toBlob(refined, "image/jpeg", 0.93);
  images.refined_image_url = await upload(`${folder}/refined.jpg`, refinedBlob, "image/jpeg");
  images.image_url = images.refined_image_url;

  images.image_processing_status = "ready";
  images.image_processed_at = new Date().toISOString();
  emit("complete");
  return images;
}

/** Re-runs only the refinement pass on the existing cut-out, harder each time. */
export async function refineAgain(
  images: AtelierImages,
  pass: number,
): Promise<AtelierImages> {
  const source = images.extracted_image_url ?? images.original_image_url;
  if (!source) throw new Error("Nothing to refine yet");
  const { data, error } = await supabase.storage
    .from("wardrobe")
    .download(source);
  if (error || !data) throw new Error(error?.message ?? "Could not load the cut-out");

  const canvas = await decodeUpright(data);
  const cutout = source.endsWith(".png") ? canvas : extractGarment(canvas);
  const refined = refineGarment(cutout, Math.min(pass, 4));
  const blob = await toBlob(refined, "image/jpeg", 0.93);
  const path = source.replace(/\/[^/]+$/, `/refined-${pass}.jpg`);
  await upload(path, blob, "image/jpeg");

  return {
    ...images,
    refined_image_url: path,
    image_url: path,
    image_processing_status: "ready",
    image_processing_stage: "complete",
    image_processed_at: new Date().toISOString(),
  };
}
