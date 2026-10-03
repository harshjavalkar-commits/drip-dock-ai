import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDripDockAuth } from "@/lib/supabase-auth-middleware";

const Input = z.object({
  token: z.string().min(10).max(4096),
  action: z.enum(["create", "poll", "list", "download", "delete"]),
  sessionId: z.string().max(500).optional(),
  pageToken: z.string().max(4000).optional(),
  baseUrl: z.string().url().max(8000).optional(),
});
export type PickedPhoto = {
  id: string;
  type: string;
  mediaFile: { baseUrl: string; mimeType: string; filename?: string };
};
export type PhotoSession = {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
};
export type PhotoResponse = {
  session?: PhotoSession;
  mediaItems?: PickedPhoto[];
  nextPageToken?: string;
  image?: string;
  mimeType?: string;
};

export const googlePhotosRequest = createServerFn({ method: "POST" })
  .middleware([requireDripDockAuth])
  .inputValidator((value: unknown) => Input.parse(value))
  .handler(async ({ data }): Promise<PhotoResponse> => {
    const root = "https://photospicker.googleapis.com/v1";
    let url: string;
    let method = "GET";
    if (data.action === "create") {
      url = `${root}/sessions`;
      method = "POST";
    } else if (data.action === "download") {
      if (!data.baseUrl) throw new Error("Missing selected photo.");
      const parsed = new URL(data.baseUrl);
      // Only Google Photos media hosts; never forward the token to user-selected hosts.
      if (
        parsed.protocol !== "https:" ||
        !/^lh[0-9]+\.googleusercontent\.com$/.test(parsed.hostname) ||
        parsed.port ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
      )
        throw new Error("Invalid Google Photos image address.");
      url = `${parsed.href}=d`;
    } else {
      if (!data.sessionId) throw new Error("Missing photo selection session.");
      url =
        data.action === "list"
          ? `${root}/mediaItems?${new URLSearchParams({ sessionId: data.sessionId, pageSize: "100", ...(data.pageToken ? { pageToken: data.pageToken } : {}) })}`
          : `${root}/sessions/${encodeURIComponent(data.sessionId)}`;
      if (data.action === "delete") method = "DELETE";
    }
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${data.token}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST"
        ? { body: JSON.stringify({ pickingConfig: { maxItemCount: "12" } }) }
        : {}),
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("Google access expired. Connect again.");
      if (response.status === 403)
        throw new Error("Google Photos access was not granted or is not enabled for this app.");
      if (response.status === 429) throw new Error("Google Photos is busy. Try again shortly.");
      throw new Error(
        "Google Photos could not complete the import. Try again or upload the photo from your device.",
      );
    }
    if (data.action === "delete") return {};
    if (data.action === "download") {
      const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
      if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(mimeType))
        throw new Error("Select a still photo.");
      const limit = 15 * 1024 * 1024;
      if (Number(response.headers.get("content-length")) > limit)
        throw new Error("Choose a photo smaller than 15 MB.");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not read this photo.");
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > limit) {
          await reader.cancel();
          throw new Error("Choose a photo smaller than 15 MB.");
        }
        chunks.push(part.value);
      }
      // Buffer is supported by the existing server runtime, including its node compatibility layer.
      const { Buffer } = await import("node:buffer");
      return { image: Buffer.concat(chunks).toString("base64"), mimeType };
    }
    const result = await response.json();
    return data.action === "list"
      ? { mediaItems: result.mediaItems ?? [], nextPageToken: result.nextPageToken }
      : { session: result };
  });
