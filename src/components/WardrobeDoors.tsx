import { useEffect, useState } from "react";

/**
 * Closet-door opening overlay. Purely atmospheric — renders above the page,
 * plays once, then removes itself.
 */
export function WardrobeDoors({ label = "Opening Wardrobe…" }: { label?: string }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setGone(true), reduce ? 400 : 2000);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      style={{ perspective: "1600px" }}
    >
      <div className="absolute inset-0 bg-ivory" style={{ animation: "fade-out 0.5s ease 1.5s both" }} />

      <div className="door-l door-panel absolute inset-y-0 left-0 w-1/2 shadow-[0_0_80px_rgba(0,0,0,0.35)]">
        <div className="absolute right-4 top-1/2 h-14 w-[6px] -translate-y-1/2 rounded-full bg-brass/80" />
      </div>
      <div className="door-r door-panel absolute inset-y-0 right-0 w-1/2 shadow-[0_0_80px_rgba(0,0,0,0.35)]">
        <div className="absolute left-4 top-1/2 h-14 w-[6px] -translate-y-1/2 rounded-full bg-brass/80" />
      </div>

      <div
        className="absolute inset-x-0 top-0 h-2/3"
        style={{
          animation: "glow-in 1.4s ease 0.8s both",
          background:
            "radial-gradient(50% 60% at 50% 0%, oklch(1 0 0 / 0.75), transparent 70%)",
        }}
      />

      <div className="absolute inset-0 grid place-items-center">
        <p
          className="display text-2xl text-walnut-foreground mix-blend-difference"
          style={{ animation: "fade-out 0.6s ease 1.1s both" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
