import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Eraser, RotateCcw, Scissors, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { decodeUpright, extractGarment, toBlob } from "@/lib/atelier";
import { Button } from "@/components/ui/button";

export function StickerEditor({
  file,
  onReady,
}: {
  file: File;
  onReady: (getBlob: (() => Promise<Blob>) | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<HTMLCanvasElement | null>(null);
  const undo = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [erase, setErase] = useState(false);
  const [brush, setBrush] = useState(30);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    let disposed = false;
    ready.current(null);
    setLoading(true);
    setFailed(false);
    undo.current = [];
    setErase(false);
    void decodeUpright(file)
      .then((original) => {
        if (disposed || !canvas.current) return;
        source.current = original;
        const target = canvas.current;
        target.width = original.width;
        target.height = original.height;
        target.getContext("2d")!.drawImage(original, 0, 0);
        setLoading(false);
        ready.current(async () => {
          const ctx = target.getContext("2d")!;
          const pixels = ctx.getImageData(0, 0, target.width, target.height).data;
          let left = target.width,
            top = target.height,
            right = -1,
            bottom = -1;
          for (let y = 0; y < target.height; y++)
            for (let x = 0; x < target.width; x++) {
              if (pixels[(y * target.width + x) * 4 + 3]! > 12) {
                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x);
                bottom = Math.max(bottom, y);
              }
            }
          if (right < left || bottom < top)
            throw new Error("The piece is empty. Undo an edit or restore the original.");
          const pad = Math.max(8, Math.round(Math.max(right - left, bottom - top) * 0.04));
          const cropped = document.createElement("canvas");
          cropped.width = right - left + 1 + pad * 2;
          cropped.height = bottom - top + 1 + pad * 2;
          cropped
            .getContext("2d")!
            .drawImage(
              target,
              left,
              top,
              right - left + 1,
              bottom - top + 1,
              pad,
              pad,
              right - left + 1,
              bottom - top + 1,
            );
          return toBlob(cropped, "image/png");
        });
      })
      .catch(() => {
        if (!disposed) {
          setLoading(false);
          setFailed(true);
          toast.error("This photo could not be opened. Export it as JPG or PNG and try again.");
        }
      });
    return () => {
      disposed = true;
      ready.current(null);
    };
  }, [file]);
  function snapshot() {
    const c = canvas.current!;
    undo.current.push(c.getContext("2d")!.getImageData(0, 0, c.width, c.height));
    if (undo.current.length > 6) undo.current.shift();
    setRevision((v) => v + 1);
  }
  function reset() {
    if (!source.current || !canvas.current) return;
    snapshot();
    const c = canvas.current;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(source.current, 0, 0);
  }
  function autoCut() {
    if (!canvas.current) return;
    snapshot();
    const c = canvas.current;
    const cut = extractGarment(c);
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    const scale = Math.min(c.width / cut.width, c.height / cut.height) * 0.9;
    ctx.drawImage(
      cut,
      (c.width - cut.width * scale) / 2,
      (c.height - cut.height * scale) / 2,
      cut.width * scale,
      cut.height * scale,
    );
    toast("Preview the edges. Undo if any garment detail was removed.");
  }
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const c = canvas.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * c.width) / rect.width,
      y: ((e.clientY - rect.top) * c.height) / rect.height,
    };
  }
  function stroke(e: PointerEvent<HTMLCanvasElement>) {
    if (!erase || !last.current || !canvas.current) return;
    const c = canvas.current;
    const next = point(e);
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineWidth = (brush * c.width) / c.getBoundingClientRect().width;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x + 0.01, next.y + 0.01);
    ctx.stroke();
    ctx.restore();
    last.current = next;
  }
  return (
    <div className="space-y-4">
      <div className="sticker-preview flex min-h-64 items-center justify-center overflow-hidden rounded-3xl p-5">
        {loading && (
          <span className="text-sm" role="status">
            Opening your photo…
          </span>
        )}
        {failed && (
          <span className="text-sm" role="alert">
            Choose another photo to continue.
          </span>
        )}
        <canvas
          ref={canvas}
          aria-label="Garment preview. Use erase mode to remove unwanted areas."
          className={loading || failed ? "hidden" : "block max-h-[420px] max-w-full object-contain"}
          style={{ touchAction: erase ? "none" : "pan-y", cursor: erase ? "crosshair" : "default" }}
          onPointerDown={(e) => {
            if (!erase) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            snapshot();
            last.current = point(e);
            stroke(e);
          }}
          onPointerMove={stroke}
          onPointerUp={() => {
            last.current = null;
          }}
          onPointerCancel={() => {
            last.current = null;
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading || failed}
          onClick={autoCut}
          className="rounded-full"
        >
          <Scissors size={16} />
          Lift plain backdrop
        </Button>
        <Button
          type="button"
          variant={erase ? "default" : "outline"}
          aria-pressed={erase}
          disabled={loading || failed}
          onClick={() => setErase(!erase)}
          className="rounded-full"
        >
          <Eraser size={16} />
          Erase
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!undo.current.length || loading || failed}
          aria-label="Undo image edit"
          onClick={() => {
            const previous = undo.current.pop();
            if (previous) canvas.current!.getContext("2d")!.putImageData(previous, 0, 0);
            setRevision(revision + 1);
          }}
          className="rounded-full"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading || failed}
          aria-label="Restore original photo"
          onClick={reset}
          className="rounded-full"
        >
          <RotateCcw size={16} />
        </Button>
      </div>
      {erase && (
        <label className="flex items-center gap-3 text-sm">
          Brush size
          <input
            aria-label="Eraser size"
            type="range"
            min="5"
            max="90"
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            className="min-w-0 flex-1"
          />
        </label>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Already a cutout? Keep it as it is. Lift works best with one piece on a plain, contrasting
        background. Your original is always kept.
      </p>
    </div>
  );
}
