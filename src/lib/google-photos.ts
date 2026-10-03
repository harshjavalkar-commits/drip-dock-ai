import {
  googlePhotosRequest,
  type PhotoSession,
  type PickedPhoto,
} from "@/lib/google-photos.functions";

export const googlePhotosConfigured = Boolean(import.meta.env["VITE_GOOGLE_PHOTOS_CLIENT_ID"]);
type TokenResponse = { access_token?: string; error?: string };
type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback: () => void;
      }) => { requestAccessToken: () => void };
    };
  };
};
let scriptReady: Promise<void> | undefined;
export function loadGooglePhotosAuth() {
  if (!googlePhotosConfigured) return Promise.reject(new Error("Google Photos is not configured."));
  if ((window as Window & { google?: GoogleIdentity }).google?.accounts?.oauth2)
    return Promise.resolve();
  if (!scriptReady)
    scriptReady = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      const timeout = window.setTimeout(() => {
        script.remove();
        scriptReady = undefined;
        reject(new Error("Google could not load. Try again."));
      }, 15000);
      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        scriptReady = undefined;
        reject(new Error("Google could not load. Try again."));
      };
      document.head.append(script);
    });
  return scriptReady;
}
/** Call after preloading, directly from a click, so mobile browsers permit the OAuth popup. */
export function requestPhotoToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as Window & { google?: GoogleIdentity }).google;
    if (!google) {
      reject(new Error("Google is still loading. Try again."));
      return;
    }
    google.accounts.oauth2
      .initTokenClient({
        client_id: import.meta.env["VITE_GOOGLE_PHOTOS_CLIENT_ID"],
        scope: "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
        callback: (result) =>
          result.access_token && !result.error
            ? resolve(result.access_token)
            : reject(new Error("Google Photos permission was not granted.")),
        error_callback: () => reject(new Error("Google sign-in was closed or blocked. Try again.")),
      })
      .requestAccessToken();
  });
}
export function pollingMilliseconds(value?: string, fallback = 5000) {
  const seconds = Number(value?.replace(/s$/, ""));
  return Number.isFinite(seconds) && seconds > 0 ? Math.max(1000, seconds * 1000) : fallback;
}
export async function collectGooglePhotos(
  token: string,
  session: PhotoSession,
): Promise<{ files: File[]; skipped: number }> {
  const selected: PickedPhoto[] = [];
  let pageToken: string | undefined;
  do {
    const result = await googlePhotosRequest({
      data: { token, action: "list", sessionId: session.id, pageToken },
    });
    selected.push(...(result.mediaItems ?? []));
    pageToken = result.nextPageToken;
  } while (pageToken && selected.length < 100);
  const photos = selected.filter((p) => p.type === "PHOTO").slice(0, 12);
  const files: File[] = [];
  for (const photo of photos) {
    const result = await googlePhotosRequest({
      data: { token, action: "download", baseUrl: photo.mediaFile.baseUrl },
    });
    if (!result.image || !result.mimeType) throw new Error("This photo could not be imported.");
    const bytes = Uint8Array.from(atob(result.image), (c) => c.charCodeAt(0));
    files.push(
      new File([bytes], photo.mediaFile.filename ?? "Google Photos image", {
        type: result.mimeType,
      }),
    );
  }
  return { files, skipped: selected.length - photos.length };
}
