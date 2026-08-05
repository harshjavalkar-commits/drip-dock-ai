import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCw, Sparkles, Undo2, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { useSignedUrl } from "@/components/ItemImage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PROCESSING_STAGES,
  STAGE_LABELS,
  REFINEMENT_LABELS,
  emptyAtelier,
  refineAgain,
  runAtelierPipeline,
  type AtelierImages,
  type ProcessingStage,
  type RefinementStatus,
} from "@/lib/atelier";

function Frame({
  path,
  label,
  caption,
  active,
  onSelect,
  checkered,
}: {
  path: string | null;
  label: string;
  caption: string;
  active: boolean;
  onSelect?: () => void;
  checkered?: boolean;
}) {
  const { data: url } = useSignedUrl(path);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!path || !onSelect}
      className={cn(
        "group/frame text-left transition-all duration-500",
        onSelect && path ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-2xl border bg-muted transition-all duration-500",
          active
            ? "border-walnut shadow-[var(--shadow-lift)] ring-1 ring-walnut/40"
            : "border-border shadow-[var(--shadow-soft)]",
        )}
        style={
          checkered
            ? {
                backgroundImage:
                  "linear-gradient(45deg, rgba(0,0,0,0.045) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.045) 75%), linear-gradient(45deg, rgba(0,0,0,0.045) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.045) 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 8px 8px",
              }
            : undefined
        }
      >
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Pending
          </div>
        )}
        {active ? (
          <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-walnut text-walnut-foreground">
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </button>
  );
}

function Compare({ before, after }: { before: string | null; after: string | null }) {
  const { data: beforeUrl } = useSignedUrl(before);
  const { data: afterUrl } = useSignedUrl(after);
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const move = (clientX: number) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      setPos(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
    };
    const onMove = (e: PointerEvent) => dragging.current && move(e.clientX);
    const onUp = () => (dragging.current = false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (!beforeUrl || !afterUrl) return null;

  return (
    <div>
      <span className="eyebrow">Before · After</span>
      <div
        ref={ref}
        onPointerDown={(e) => {
          dragging.current = true;
          const box = ref.current!.getBoundingClientRect();
          setPos(Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100)));
        }}
        className="relative mt-3 aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-2xl border border-border bg-muted shadow-[var(--shadow-soft)]"
      >
        <img src={afterUrl} alt="Refined garment" className="h-full w-full object-contain" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img
            src={beforeUrl}
            alt="Original photo"
            className="h-full w-full object-contain"
            style={{ width: ref.current?.clientWidth ?? "100%", maxWidth: "none" }}
          />
        </div>
        <div
          className="absolute inset-y-0 w-px bg-walnut/70"
          style={{ left: `${pos}%` }}
        >
          <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-walnut/40 bg-background shadow-[var(--shadow-lift)]">
            <RotateCw className="h-4 w-4 text-walnut" strokeWidth={1.5} />
          </span>
        </div>
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] tracking-wide">
          Original
        </span>
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] tracking-wide">
          Atelier
        </span>
      </div>
    </div>
  );
}

function StageRail({ stage }: { stage: ProcessingStage | null }) {
  const index = stage ? PROCESSING_STAGES.indexOf(stage) : -1;
  return (
    <ol className="mt-4 space-y-2.5">
      {PROCESSING_STAGES.map((s, i) => {
        const done = index > i;
        const current = index === i;
        return (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border transition-colors duration-500",
                done
                  ? "border-walnut bg-walnut text-walnut-foreground"
                  : current
                    ? "border-walnut text-walnut"
                    : "border-border text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="h-3 w-3" strokeWidth={2.5} />
              ) : current ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
            </span>
            <span className={cn(current || done ? "text-foreground" : "text-muted-foreground")}>
              {STAGE_LABELS[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}


function StatusCard({
  label,
  state,
  detail,
  done,
}: {
  label: string;
  state: string;
  detail: string;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all duration-500",
        done
          ? "border-walnut/40 bg-walnut/5 shadow-[var(--shadow-soft)]"
          : "border-dashed border-border bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full border",
            done ? "border-walnut bg-walnut text-walnut-foreground" : "border-border",
          )}
        >
          {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium">{state}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusCards({ images }: { images: AtelierImages }) {
  const status: RefinementStatus = images.refinement_status ?? "not_started";
  const hasOriginal = Boolean(images.original_image_url);
  const hasRefined = Boolean(images.refined_image_url);
  const approved = status === "approved";
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <StatusCard
        label="Original"
        state={hasOriginal ? "Saved" : "Awaiting photo"}
        detail={hasOriginal ? "Upright, full resolution" : "Upload a garment photo"}
        done={hasOriginal}
      />
      <StatusCard
        label="Refined"
        state={REFINEMENT_LABELS[status]}
        detail={
          hasRefined
            ? "Catalogue version stored"
            : "Generated automatically after upload"
        }
        done={hasRefined}
      />
      <StatusCard
        label="Archive ready"
        state={approved ? "Approved" : "Pending approval"}
        detail={
          approved
            ? "Locked in as the wardrobe image"
            : "Approve once the finish looks right"
        }
        done={approved}
      />
    </div>
  );
}

export function AtelierStudio({
  images,
  onChange,
  userId,
}: {
  images: AtelierImages;
  onChange: (next: AtelierImages) => void;
  userId: string;
}) {
  const [stage, setStage] = useState<ProcessingStage | null>(null);
  const [busy, setBusy] = useState(false);
  const [pass, setPass] = useState(1);
  const processing = images.image_processing_status === "processing" || busy;

  async function handleFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Photo must be under 15MB");
      return;
    }
    setBusy(true);
    setPass(1);
    onChange({ ...emptyAtelier(), image_processing_status: "processing" });
    try {
      const result = await runAtelierPipeline(file, userId, (update) => {
        setStage(update.stage);
        onChange(update.images);
      });
      onChange(result);
      toast.success("Atelier finish ready");
    } catch (error) {
      onChange({
        ...emptyAtelier(),
        image_processing_status: "failed",
        image_processing_stage: stage,
      });
      toast.error("Couldn't process that photo", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  async function handleRefineAgain() {
    setBusy(true);
    setStage("refining");
    try {
      const next = pass + 1;
      const result = await refineAgain(images, next);
      setPass(next);
      onChange(result);
      toast.success(`Refined · pass ${next}`);
    } catch (error) {
      toast.error("Refine failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  const hasPhoto = Boolean(images.original_image_url);
  const usingRefined = images.image_url === images.refined_image_url && !!images.refined_image_url;

  return (
    <div className="surface spotlight overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow">Atelier</span>
        {hasPhoto ? (
          <span className="text-xs text-muted-foreground">
            {images.image_processing_status === "ready"
              ? "Catalogue finish ready"
              : images.image_processing_status === "failed"
                ? "Processing failed — use the original or retake"
                : "Processing…"}
          </span>
        ) : null}
      </div>

      {!hasPhoto && !processing ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/60 text-muted-foreground">
            <UploadIcon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs">No photo yet</span>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              Shoot the garment against any plain-ish surface. The Atelier straightens iPhone
              photos, lifts the piece off its background and sets it on a studio backdrop.
            </p>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent">
              <Camera className="h-4 w-4" strokeWidth={1.5} />
              Choose photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
          </div>
        </div>
      ) : null}

      {processing ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Preparing your garment…</p>
          <StageRail stage={stage} />
        </div>
      ) : null}

      {hasPhoto && !processing ? (
        <>
          <StatusCards images={images} />

          <p className="mt-6 text-xs text-muted-foreground">
            Pick the primary wardrobe image — the Dock always prefers the refined frame.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:gap-4">
            <Frame
              path={images.original_image_url}
              label="Original"
              caption="As shot, upright"
              active={images.image_url === images.original_image_url}
              onSelect={() => onChange({ ...images, image_url: images.original_image_url })}
            />
            <Frame
              path={images.extracted_image_url}
              label="Extracted"
              caption="Background removed"
              checkered
              active={images.image_url === images.extracted_image_url}
              onSelect={
                images.extracted_image_url
                  ? () => onChange({ ...images, image_url: images.extracted_image_url })
                  : undefined
              }
            />
            <Frame
              path={images.refined_image_url}
              label="Refined"
              caption="Catalogue finish"
              active={usingRefined}
              onSelect={
                images.refined_image_url
                  ? () => onChange({ ...images, image_url: images.refined_image_url })
                  : undefined
              }
            />
          </div>

          <div className="mt-6">
            <Compare before={images.original_image_url} after={images.refined_image_url} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-full"
              onClick={() => void handleRefineAgain()}
              disabled={!images.extracted_image_url}
            >
              <Sparkles className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              {images.refined_image_url ? "Refine again" : "Refine garment"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-card"
              onClick={() =>
                onChange({
                  ...images,
                  image_url: images.original_image_url,
                  image_processing_status: "skipped",
                  refinement_status: "not_started",
                })
              }
            >
              <Undo2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Use original
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-card"
              disabled={!images.refined_image_url || images.refinement_status === "approved"}
              onClick={() =>
                onChange({
                  ...images,
                  refinement_status: "approved",
                  image_url: images.refined_image_url ?? images.image_url,
                })
              }
            >
              <Check className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              {images.refinement_status === "approved" ? "Approved" : "Approve for archive"}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent">
              <Camera className="h-4 w-4" strokeWidth={1.5} />
              Retake
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Refinement is fully automatic — every pass runs on-device today, and the AI relight
            stage drops into the same slot without changing this flow.
          </p>
        </>
      ) : null}
    </div>
  );
}
