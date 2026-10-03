import { useEffect, useRef, useState } from "react";
import { ExternalLink, Images, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  googlePhotosConfigured,
  loadGooglePhotosAuth,
  requestPhotoToken,
  pollingMilliseconds,
  collectGooglePhotos,
} from "@/lib/google-photos";
import { googlePhotosRequest, type PhotoSession } from "@/lib/google-photos.functions";

export function GooglePhotosImport({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<PhotoSession | null>(null);
  const [status, setStatus] = useState("");
  const token = useRef("");
  const active = useRef<PhotoSession | null>(null);
  const run = useRef(0);
  const callback = useRef(onFiles);
  callback.current = onFiles;
  const authReady = useRef(false);

  useEffect(() => {
    if (!googlePhotosConfigured) return;
    let mounted = true;
    const runRef = run;
    void loadGooglePhotosAuth()
      .then(() => {
        if (mounted) {
          authReady.current = true;
          setReady(true);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
      runRef.current++;
      const old = active.current;
      const oldToken = token.current;
      if (old && oldToken)
        void googlePhotosRequest({
          data: { action: "delete", token: oldToken, sessionId: old.id },
        }).catch(() => {});
      token.current = "";
    };
  }, []);

  async function cancel() {
    run.current++;
    const old = active.current;
    const oldToken = token.current;
    active.current = null;
    token.current = "";
    setSession(null);
    setBusy(false);
    setStatus("");
    if (old && oldToken)
      await googlePhotosRequest({
        data: { action: "delete", token: oldToken, sessionId: old.id },
      }).catch(() => {});
  }

  async function start() {
    if (!authReady.current) {
      try {
        await loadGooglePhotosAuth();
        authReady.current = true;
        setReady(true);
        toast("Google is ready. Tap Google Photos to connect.");
      } catch {
        toast.error("Google could not load. Choose photos from your device instead.");
      }
      return;
    }
    const version = ++run.current;
    setBusy(true);
    setStatus("Connecting to Google…");
    let ownSession: PhotoSession | undefined;
    let ownToken = "";
    try {
      ownToken = await requestPhotoToken();
      if (version !== run.current) return;
      token.current = ownToken;
      const result = await googlePhotosRequest({ data: { action: "create", token: ownToken } });
      ownSession = result.session;
      if (!ownSession) throw new Error("Could not start Google Photos.");
      if (version !== run.current) return;
      const picker = new URL(ownSession.pickerUri);
      if (picker.protocol !== "https:" || picker.hostname !== "photos.google.com")
        throw new Error("Google returned an unexpected picker address.");
      active.current = ownSession;
      setSession(ownSession);
      setStatus("Choose photos in Google, then tap Done.");
      const deadline =
        Date.now() +
        Math.min(600000, pollingMilliseconds(ownSession.pollingConfig?.timeoutIn, 600000));
      let current = ownSession;
      while (!current.mediaItemsSet) {
        await new Promise((resolve) =>
          setTimeout(resolve, pollingMilliseconds(current.pollingConfig?.pollInterval)),
        );
        if (version !== run.current) return;
        if (Date.now() > deadline || current.pollingConfig?.timeoutIn === "0s")
          throw new Error("Selection expired. Connect again to choose photos.");
        const response = await googlePhotosRequest({
          data: { action: "poll", token: ownToken, sessionId: ownSession.id },
        });
        if (!response.session) throw new Error("Selection session ended. Try again.");
        current = response.session;
      }
      if (version !== run.current) return;
      setSession(null);
      setStatus("Bringing your photos into DripDock…");
      const imported = await collectGooglePhotos(ownToken, ownSession);
      if (version !== run.current) return;
      if (imported.files.length) callback.current(imported.files);
      else toast("No still photos selected.");
      if (imported.skipped) toast("Videos and photos beyond the first 12 were skipped.");
    } catch (error) {
      if (version === run.current)
        toast.error(error instanceof Error ? error.message : "Google Photos import failed.");
    } finally {
      if (ownSession && ownToken)
        void googlePhotosRequest({
          data: { action: "delete", token: ownToken, sessionId: ownSession.id },
        }).catch(() => {});
      if (version === run.current) {
        token.current = "";
        active.current = null;
        setSession(null);
        setBusy(false);
        setStatus("");
      }
    }
  }

  if (!googlePhotosConfigured)
    return (
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Have a cutout in Google Photos? Save it to your device, then choose it here.
      </p>
    );
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="import-source w-full"
        disabled={disabled || busy}
        onClick={() => void start()}
      >
        <Images size={20} />
        <span>
          Google Photos
          <small>{ready ? "Choose only the photos you want" : "Connect your photo library"}</small>
        </span>
        {busy && <Loader2 size={16} className="animate-spin" />}
      </button>
      {busy && (
        <div className="rounded-2xl border bg-card p-4" role="status">
          <p className="text-sm">{status}</p>
          {session && (
            <a
              href={session.pickerUri}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm text-primary-foreground"
            >
              Open Google Photos <ExternalLink size={15} />
            </a>
          )}
          <button
            type="button"
            onClick={() => void cancel()}
            className="ml-3 inline-flex min-h-11 items-center gap-1 text-sm"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
