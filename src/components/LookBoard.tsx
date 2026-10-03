import { Shirt } from "lucide-react";
import { useSignedUrl } from "@/components/ItemImage";
import { stickerPath } from "@/lib/stickers";
import { LOOK_THEMES, lookLayout, type LookTheme } from "@/lib/lookbook";
import type { ClothingItem } from "@/lib/wardrobe";

export function GarmentSticker({
  item,
  className = "",
}: {
  item: ClothingItem;
  className?: string;
}) {
  const { data: url } = useSignedUrl(stickerPath(item));
  return url ? (
    <img
      src={url}
      alt={item.name}
      draggable={false}
      className={`h-full w-full object-contain ${className}`}
    />
  ) : (
    <div className="grid h-full w-full place-items-center text-muted-foreground">
      <Shirt size={28} />
    </div>
  );
}
export function LookBoard({
  items,
  title,
  mood,
  theme,
  miniYouUrl,
}: {
  items: ClothingItem[];
  title: string;
  mood: string;
  theme: LookTheme;
  miniYouUrl?: string | null;
}) {
  const palette = LOOK_THEMES[theme];
  const layout = lookLayout(items.length);
  return (
    <div
      className="look-board relative mx-auto aspect-[4/5] w-full max-w-[480px] overflow-hidden rounded-[1.75rem] border border-black/5 shadow-[var(--shadow-lift)]"
      style={{ background: palette.background, color: palette.ink }}
    >
      <div className="absolute inset-x-[7%] top-[5%] flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-[.25em] sm:text-xs">
          The personal style issue
        </span>
        <span className="text-[10px] uppercase tracking-widest">{mood}</span>
      </div>
      <div className="display absolute inset-x-[7%] top-[10%] text-[clamp(2.4rem,6vw,4rem)] leading-none tracking-tighter">
        DRIPDOCK
      </div>
      <div className="absolute inset-x-[7%] bottom-[19%] top-[25%]">
        {items.map((item, i) => {
          const box = layout[i]!;
          return (
            <div
              key={item.id}
              className="absolute p-1 transition-all duration-300 motion-reduce:transition-none"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
                transform: `rotate(${box.angle}deg)`,
              }}
            >
              <GarmentSticker item={item} className="garment-sticker" />
            </div>
          );
        })}
        {!items.length && (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-current/20 text-center">
            <Shirt size={40} strokeWidth={1} />
            <p className="display mt-4 text-3xl">A look only you could make.</p>
            <p className="mt-2 text-xs opacity-65">Tap pieces from your wardrobe to begin.</p>
          </div>
        )}
      </div>
      <div className="absolute inset-x-[7%] bottom-[6%] flex items-end justify-between gap-3 border-t border-current/20 pt-3">
        <div className="min-w-0">
          <p className="mb-1 text-[9px] uppercase tracking-[.2em]">Worn your way</p>
          <h2 className="truncate text-2xl sm:text-3xl">{title || "The everyday edit"}</h2>
          <p className="mt-1 text-[10px] opacity-65">My wardrobe. My point of view.</p>
        </div>
        {miniYouUrl && (
          <img
            src={miniYouUrl}
            alt="Your MiniYou signature"
            className="h-14 w-12 shrink-0 rounded-t-full object-cover"
          />
        )}
      </div>
    </div>
  );
}
