import { supabase } from "@/lib/supabase";
import type { ClothingItem } from "@/lib/wardrobe";

export const MAX_IMPORT_BYTES = 15 * 1024 * 1024;
export const MAX_IMPORT_FILES = 12;
export function validatePhoto(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG, WebP or iPhone photo.");
  }
  if (file.size > MAX_IMPORT_BYTES) throw new Error("Choose a photo smaller than 15 MB.");
  if (!file.size) throw new Error("This photo is empty. Choose another.");
}

export function stickerPath(
  item: Pick<ClothingItem, "extracted_image_url" | "image_url" | "original_image_url">,
) {
  return item.extracted_image_url ?? item.image_url ?? item.original_image_url;
}

/** Store the exact original independently of the user-approved styling image. */
export async function saveSticker(input: {
  userId: string;
  original: File;
  sticker: Blob;
  name: string;
  category: string;
}) {
  validatePhoto(input.original);
  const folder = `${input.userId}/${crypto.randomUUID()}`;
  const ext =
    (
      {
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
        "image/heif": "heif",
      } as Record<string, string>
    )[input.original.type] ?? "jpg";
  const originalPath = `${folder}/original.${ext}`;
  const stickerFilePath = `${folder}/sticker.png`;
  const uploaded: string[] = [];
  try {
    for (const [path, blob] of [
      [originalPath, input.original],
      [stickerFilePath, input.sticker],
    ] as const) {
      const { error } = await supabase.storage
        .from("wardrobe")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      uploaded.push(path);
    }
    const { data, error } = await supabase
      .from("clothing_items")
      .insert({
        user_id: input.userId,
        name: input.name.trim(),
        category: input.category,
        image_url: stickerFilePath,
        original_image_url: originalPath,
        extracted_image_url: stickerFilePath,
        image_processing_status: "ready",
        image_processing_stage: "complete",
        image_processed_at: new Date().toISOString(),
        refinement_status: "approved",
      } as never)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ClothingItem;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("wardrobe").remove(uploaded);
    throw error;
  }
}
