/** Empty hanger illustration — decorative only. */
export function Hanger({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      aria-hidden="true"
      className={className}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M60 26c-5 0-8-3.2-8-7.2S55 12 60 12s8 3 8 6.8c0 3.6-2.6 5-5 6.2-2 1-3 2-3 3.6V32"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M60 32 14 60a3.6 3.6 0 0 0 2 6.6h88a3.6 3.6 0 0 0 2-6.6L60 32Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A short row of hangers on a rail, used for empty states. */
export function EmptyHangers({ count = 4 }: { count?: number }) {
  return (
    <div className="relative w-full max-w-xs">
      <div className="rail" />
      <div className="flex items-start justify-center gap-4 px-4">
        {Array.from({ length: count }).map((_, i) => (
          <Hanger
            key={i}
            className="hang -mt-1 h-12 w-16 text-walnut/45"
            // stagger a gentle resting tilt
            style={{ transform: `rotate(${(i % 2 ? 1 : -1) * (1 + i * 0.4)}deg)` }}
          />
        ))}
      </div>
    </div>
  );
}
