import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Camera, Check, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { StickerEditor } from "@/components/StickerEditor";
import { GooglePhotosImport } from "@/components/GooglePhotosImport";
import { CATEGORIES } from "@/lib/wardrobe";
import { MAX_IMPORT_FILES, saveSticker, validatePhoto } from "@/lib/stickers";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Add a piece — DripDock" }] }),
  component: UploadPage,
});
function UploadPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<File[]>([]);
  const [saved, setSaved] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("T-Shirts");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const blobGetter = useRef<(() => Promise<Blob>) | null>(null);
  const library = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const file = queue[0];
  function addFiles(files: File[]) {
    const accepted: File[] = [];
    for (const f of files) {
      try {
        validatePhoto(f);
        accepted.push(f);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Invalid photo.");
      }
    }
    setQueue((previous) => {
      const room = MAX_IMPORT_FILES - previous.length;
      return [...previous, ...accepted.slice(0, Math.max(0, room))];
    });
    if (files.length + queue.length > MAX_IMPORT_FILES) toast("Add up to 12 pieces at a time.");
  }
  function advance() {
    setQueue((q) => q.slice(1));
    setName("");
    setReady(false);
    blobGetter.current = null;
  }
  function paste(e: ClipboardEvent) {
    if (saving) return;
    const files = Array.from(e.clipboardData.files);
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!saving) addFiles(Array.from(e.dataTransfer.files));
  }
  async function save() {
    if (!user || !file || !blobGetter.current || saving) return;
    if (!name.trim()) {
      toast.error("Give this piece a short name.");
      return;
    }
    setSaving(true);
    try {
      await saveSticker({
        userId: user.id,
        original: file,
        sticker: await blobGetter.current(),
        name,
        category,
      });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      setSaved((n) => n + 1);
      advance();
      toast.success("Added to your wardrobe.");
    } catch (error) {
      toast.error("Could not save this piece.", {
        description:
          error instanceof Error ? error.message : "Try again. Your photo is still here.",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      onPaste={paste}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={dragging ? "rounded-3xl outline outline-2 outline-clay" : ""}
    >
      <PageHeader
        eyebrow="Your wardrobe, remixed"
        title="Good pieces. New possibilities."
        description="Bring a photo. Keep the piece. Make it part of your next look."
      />
      <input
        ref={library}
        aria-label="Choose garment photos"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        aria-label="Take garment photo"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {!file ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="capture-hero hidden rounded-[2rem] p-8 sm:p-12 lg:block">
            <div className="mb-10 inline-flex rounded-full border border-current/20 px-3 py-1 text-[10px] uppercase tracking-[.2em]">
              Your real clothes. Your signature.
            </div>
            <div className="capture-mark">
              <ImagePlus strokeWidth={1} size={64} />
              <span>01</span>
            </div>
            <h2 className="mt-8 text-4xl sm:text-5xl">
              Your next favourite look
              <br />
              <em>is already yours.</em>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed opacity-75">
              Start with a top, a bottom and your favourite shoes. No need to catalogue everything.
            </p>
          </div>
          <div className="surface flex flex-col justify-center p-6 sm:p-8">
            <span className="eyebrow">Add your first few pieces</span>
            <div className="mt-6 space-y-3">
              <button className="import-source w-full" onClick={() => camera.current?.click()}>
                <Camera size={22} />
                <span>
                  Take a photo<small>One piece, a little space around it</small>
                </span>
                <ArrowRight size={18} />
              </button>
              <button className="import-source w-full" onClick={() => library.current?.click()}>
                <ImagePlus size={22} />
                <span>
                  Choose photos<small>Photos, screenshots or ready-made cutouts</small>
                </span>
                <ArrowRight size={18} />
              </button>
              <GooglePhotosImport onFiles={addFiles} />
            </div>
            <div className="mt-6 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">An iPhone shortcut</strong>
              <p className="mt-1">
                In Photos, hold a garment to lift it, tap Copy, then paste here. Best with a photo
                of the garment on its own.
              </p>
              <textarea
                aria-label="Paste a garment cutout"
                placeholder="Tap here, then Paste"
                className="mt-3 h-12 w-full resize-none rounded-xl border bg-background px-3 py-3"
                onChange={(e) => {
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="surface p-5 sm:p-7">
            <div className="mb-4 flex justify-between">
              <span className="eyebrow">Make it yours</span>
              <span className="text-xs text-muted-foreground">{queue.length} to add</span>
            </div>
            <StickerEditor
              key={`${file.name}-${file.lastModified}-${saved}`}
              file={file}
              onReady={(getter) => {
                blobGetter.current = getter;
                setReady(!!getter);
              }}
            />
          </div>
          <form
            className="surface h-fit space-y-5 p-6 sm:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div>
              <span className="eyebrow">Just the essentials</span>
              <h2 className="mt-2 text-3xl">Meet your new piece.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep its details recognisable. You can add more later.
              </p>
            </div>
            <label className="block text-sm">
              Name
              <input
                required
                maxLength={120}
                disabled={saving}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My navy trousers"
                className="mt-2 h-12 w-full rounded-xl border bg-background px-4"
              />
            </label>
            <label className="block text-sm">
              Category
              <select
                aria-label="Category"
                disabled={saving}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border bg-background px-4"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <Button className="h-12 w-full rounded-full" disabled={!ready || saving} type="submit">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{" "}
              {saving ? "Saving your piece…" : "Add to my wardrobe"}
            </Button>
            <div className="flex justify-between">
              <button
                type="button"
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
                onClick={advance}
              >
                <X size={14} />
                Skip this photo
              </button>
              <button
                type="button"
                disabled={saving}
                className="min-h-11 text-sm underline underline-offset-4"
                onClick={() => library.current?.click()}
              >
                Add more photos
              </button>
            </div>
          </form>
        </div>
      )}
      {saved > 0 && (
        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5"
          role="status"
        >
          <p className="flex items-center gap-2 text-sm">
            <Check size={18} />
            {saved} {saved === 1 ? "piece" : "pieces"} added. Your next look is waiting.
          </p>
          <Button asChild className="rounded-full">
            <Link to="/looks">
              Style a look
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
