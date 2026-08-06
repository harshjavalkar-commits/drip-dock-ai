import { useEffect, useRef, useState } from "react";
import defaultOutfit from "@/assets/miniyou-default-outfit.jpg";
import { useSignedUrl } from "@/components/ItemImage";
import { cn } from "@/lib/utils";

/**
 * Premium full-body MiniYou card — slow float + gentle pointer parallax.
 * Never renders empty: falls back to the house DripDock look.
 */
export function MiniYouCard({
  path,
  fallback,
  caption,
  className,
}: {
  path: string | null | undefined;
  fallback?: boolean;
  caption?: string;
  className?: string;
}) {
  const { data: url } = useSignedUrl(path);
  const frame = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onMove(event: PointerEvent) {
      const rect = node!.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: px, y: py });
    }
    function onLeave() {
      setTilt({ x: 0, y: 0 });
    }
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const src = url ?? defaultOutfit;
  const showingFallback = !url || fallback;

  return (
    <div
      ref={frame}
      className={cn("spotlight relative select-none", className)}
      style={{ perspective: "1200px" }}
    >
      <div className="mx-auto max-w-xs">
        <div className="rail" />
        <div className="mx-auto -mt-1 h-5 w-px bg-walnut/40" />
      </div>

      <div
        className="float-slow mx-auto mt-1 max-w-xs"
        style={{
          transform: `rotateY(${tilt.x * 7}deg) rotateX(${tilt.y * -6}deg) translate3d(${tilt.x * 10}px, ${tilt.y * 8}px, 0)`,
          transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="surface overflow-hidden rounded-3xl">
          <img
            src={src}
            alt={showingFallback ? "Default DripDock look" : "Your MiniYou"}
            width={768}
            height={1024}
            className="aspect-[3/4] w-full bg-ivory object-cover"
          />
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="eyebrow">{showingFallback ? "House look" : "MiniYou"}</span>
            <span className="text-xs text-muted-foreground">
              {caption ?? (showingFallback ? "Default DripDock outfit" : "Your fashion identity")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
