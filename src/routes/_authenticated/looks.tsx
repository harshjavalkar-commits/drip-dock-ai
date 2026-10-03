import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Check,
  Download,
  Loader2,
  LockKeyhole,
  Plus,
  Share2,
  Shuffle,
  UnlockKeyhole,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useItems, useOutfits } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { fetchMiniYou } from "@/lib/miniyou";
import {
  LOOK_MOODS,
  LOOK_THEMES,
  SLOTS,
  itemSlot,
  remixLook,
  toggleLookItem,
  type LookSlot,
  type LookTheme,
} from "@/lib/lookbook";
import { exportLook } from "@/lib/export-look";
import { LookBoard, GarmentSticker } from "@/components/LookBoard";
import { useSignedUrl } from "@/components/ItemImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/looks")({
  head: () => ({ meta: [{ title: "Your next look — DripDock" }] }),
  component: Looks,
});
function Looks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wardrobe = useItems();
  const outfits = useOutfits();
  const items = useMemo(() => wardrobe.data ?? [], [wardrobe.data]);
  const [ids, setIds] = useState<string[]>([]);
  const [locked, setLocked] = useState<string[]>([]);
  const [slot, setSlot] = useState<LookSlot>("All");
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<LookTheme>("paper");
  const [mood, setMood] = useState<string>("Everyday");
  const [title, setTitle] = useState("The everyday edit");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [signature, setSignature] = useState(false);
  const { data: miniYou } = useQuery({
    queryKey: ["mini-you", user?.id],
    enabled: !!user,
    queryFn: () => fetchMiniYou(user!.id),
    retry: false,
  });
  const { data: miniYouUrl } = useSignedUrl(miniYou?.image_url);
  const selected = useMemo(
    () => ids.map((id) => items.find((i) => i.id === id)).filter((i) => !!i),
    [ids, items],
  );
  const filtered = items.filter(
    (i) =>
      (slot === "All" || itemSlot(i.category) === slot) &&
      `${i.name} ${i.category} ${i.color ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const saved = (outfits.data ?? []).some(
    (o) =>
      o.title === title.trim() &&
      o.occasion === mood &&
      o.item_ids.join(",") === selected.map((i) => i.id).join(",") &&
      o.explanation === `DripDock studio · ${theme}`,
  );
  useEffect(() => {
    if (!shareFile) {
      setShareUrl(null);
      return;
    }
    const url = URL.createObjectURL(shareFile);
    setShareUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [shareFile]);
  function choose(id: string) {
    if (!ids.includes(id) && ids.length >= 6) {
      toast("Keep this look to six pieces. Remove one to add another.");
      return;
    }
    setIds((previous) => toggleLookItem(previous, id));
    setLocked((previous) => previous.filter((i) => i !== id));
  }
  async function save() {
    if (!user || !selected.length || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("outfits").insert({
        user_id: user.id,
        title: title.trim() || "My look",
        occasion: mood,
        item_ids: selected.map((i) => i.id),
        explanation: `DripDock studio · ${theme}`,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["outfits"] });
      toast.success("Saved to your looks.");
    } catch {
      toast.error("Could not save your look. Try again.");
    } finally {
      setSaving(false);
    }
  }
  async function prepareShare() {
    setExporting(true);
    try {
      setShareFile(
        await exportLook({
          items: selected,
          title,
          mood,
          theme,
          miniYouPath: signature ? miniYou?.image_url : null,
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare your card.");
    } finally {
      setExporting(false);
    }
  }
  async function share() {
    if (!shareFile) return;
    try {
      await navigator.share({ files: [shareFile], title: "My DripDock look" });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        toast.error("Sharing is unavailable. Use Download instead.");
    }
  }
  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">The everyday, reimagined</span>
          <h1 className="mt-2 text-4xl sm:text-5xl">
            Your wardrobe. <em>Your world.</em>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Collect pieces. Play with a look. Make it yours.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full bg-card">
          <Link to="/upload">
            <Plus size={16} />
            Add a piece
          </Link>
        </Button>
      </header>
      {wardrobe.isError ? (
        <div className="surface p-8" role="alert">
          <h2 className="text-2xl">Your wardrobe could not load.</h2>
          <Button className="mt-4 rounded-full" onClick={() => void wardrobe.refetch()}>
            Try again
          </Button>
        </div>
      ) : wardrobe.isLoading ? (
        <div className="surface grid min-h-80 place-items-center" role="status">
          <Loader2 className="animate-spin" />
          <span>Opening your wardrobe…</span>
        </div>
      ) : (
        <>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Look occasion">
            {LOOK_MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                aria-pressed={mood === m}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-5 text-sm transition-colors",
                  mood === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="grid items-start gap-7 lg:grid-cols-[1.1fr_1fr]">
            <section className="min-w-0 lg:sticky lg:top-8" aria-label="Your outfit card">
              <LookBoard
                items={selected}
                title={title}
                mood={mood}
                theme={theme}
                miniYouUrl={signature ? miniYouUrl : null}
              />
              <div className="mt-5 flex items-center justify-center gap-2" aria-label="Card theme">
                {Object.entries(LOOK_THEMES).map(([key, value]) => (
                  <button
                    key={key}
                    title={value.label}
                    aria-label={`${value.label} theme`}
                    aria-pressed={theme === key}
                    onClick={() => setTheme(key as LookTheme)}
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-full border",
                      theme === key ? "ring-1 ring-foreground ring-offset-2" : "",
                    )}
                    style={{ background: value.background, color: value.ink }}
                  >
                    {theme === key && <Check size={17} />}
                  </button>
                ))}
              </div>
              <label className="mt-5 block text-xs text-muted-foreground">
                Name your edit
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                  className="mt-2 h-12 w-full rounded-xl border bg-card px-4 text-sm text-foreground"
                  placeholder="The everyday edit"
                />
              </label>
              {miniYouUrl ? (
                <label className="mt-3 flex min-h-11 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={signature}
                    onChange={(e) => setSignature(e.target.checked)}
                  />
                  Add my MiniYou signature to this card
                </label>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Your clothes take centre stage.{" "}
                  <Link to="/miniyou" className="underline underline-offset-4">
                    Add a MiniYou signature
                  </Link>
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12 rounded-full bg-card"
                  disabled={!selected.length || saving || saved}
                  onClick={() => void save()}
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : saved ? (
                    <Check size={16} />
                  ) : (
                    <Bookmark size={16} />
                  )}{" "}
                  {saved ? "Saved" : "Save look"}
                </Button>
                <Button
                  className="h-12 rounded-full"
                  disabled={!selected.length || exporting}
                  onClick={() => void prepareShare()}
                >
                  {exporting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Share2 size={16} />
                  )}{" "}
                  {exporting ? "Preparing…" : "Share look"}
                </Button>
              </div>
            </section>
            <section className="surface min-w-0 p-5 sm:p-6" aria-label="Choose wardrobe pieces">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Your sticker drawer</span>
                  <h2 className="mt-1 text-2xl">The pieces that make you.</h2>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs">
                  {selected.length}/6
                </span>
              </div>
              {selected.length > 0 && (
                <div className="my-4 space-y-1 rounded-2xl bg-background p-2">
                  {selected.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-xl px-2">
                      <span className="min-w-0 flex-1 truncate text-xs">{item.name}</span>
                      <button
                        className="grid h-11 w-11 place-items-center"
                        aria-label={`${locked.includes(item.id) ? "Unlock" : "Keep"} ${item.name} during shuffle`}
                        aria-pressed={locked.includes(item.id)}
                        onClick={() =>
                          setLocked((previous) =>
                            previous.includes(item.id)
                              ? previous.filter((i) => i !== item.id)
                              : [...previous, item.id],
                          )
                        }
                      >
                        {locked.includes(item.id) ? (
                          <LockKeyhole size={15} />
                        ) : (
                          <UnlockKeyhole size={15} className="text-muted-foreground" />
                        )}
                      </button>
                      <button
                        aria-label={`Remove ${item.name}`}
                        className="grid h-11 w-11 place-items-center"
                        onClick={() => choose(item.id)}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                disabled={!items.length}
                className="my-4 h-11 w-full rounded-full"
                onClick={() => {
                  setIds(remixLook(items, locked));
                }}
              >
                <Shuffle size={16} />
                Remix my pieces
              </Button>
              <p className="-mt-2 mb-5 text-[11px] text-muted-foreground">
                A playful shuffle. Lock a piece to keep it in the mix.
              </p>
              <input
                aria-label="Find a wardrobe piece"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a piece…"
                className="h-11 w-full rounded-full border bg-background px-4 text-sm"
              />
              <div className="my-4 flex gap-1 overflow-x-auto">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                    className={cn(
                      "min-h-11 shrink-0 rounded-full px-3 text-xs",
                      slot === s ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {filtered.length ? (
                <div className="grid max-h-[560px] grid-cols-3 gap-3 overflow-y-auto p-1">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={ids.includes(item.id)}
                      aria-label={`Select ${item.name}`}
                      onClick={() => choose(item.id)}
                      className={cn(
                        "group relative rounded-2xl border p-2 text-left transition-colors",
                        ids.includes(item.id)
                          ? "border-walnut bg-walnut/5 ring-1 ring-walnut"
                          : "border-transparent bg-background hover:border-border",
                      )}
                    >
                      <div className="aspect-[3/4]">
                        <GarmentSticker item={item} />
                      </div>
                      <span className="mt-2 block truncate text-[11px]">{item.name}</span>
                      {ids.includes(item.id) && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-primary p-1 text-primary-foreground">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="display text-2xl">
                    {items.length ? "No pieces match." : "Start with three favourites."}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {items.length
                      ? "Try another category or search."
                      : "A top, a bottom and your go-to shoes."}
                  </p>
                  {!items.length && (
                    <Button asChild className="mt-5 rounded-full">
                      <Link to="/upload">
                        Add your first piece
                        <ArrowRight size={16} />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </section>
          </div>
          <section className="mt-12">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-3xl">Looks worth repeating.</h2>
              <span className="eyebrow">Your collection</span>
            </div>
            {outfits.isError ? (
              <p role="alert" className="text-sm">
                Saved looks could not load.{" "}
                <button className="underline" onClick={() => void outfits.refetch()}>
                  Retry
                </button>
              </p>
            ) : outfits.isLoading ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading saved looks…
              </p>
            ) : !outfits.data?.length ? (
              <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Save your first look and it will be waiting here.
              </p>
            ) : (
              <div className="flex snap-x gap-4 overflow-x-auto pb-4">
                {outfits.data.map((outfit) => (
                  <button
                    key={outfit.id}
                    className="surface w-56 shrink-0 snap-start p-4 text-left"
                    onClick={() => {
                      const remaining = outfit.item_ids.filter((id) =>
                        items.some((item) => item.id === id),
                      );
                      setIds(remaining.slice(0, 6));
                      setTitle(outfit.title);
                      setMood(outfit.occasion ?? "Everyday");
                      setLocked([]);
                      const savedTheme = outfit.explanation?.replace("DripDock studio · ", "");
                      if (savedTheme && savedTheme in LOOK_THEMES)
                        setTheme(savedTheme as LookTheme);
                      if (remaining.length < outfit.item_ids.length)
                        toast("Some pieces in this look are no longer in your wardrobe.");
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                  >
                    <div className="mb-3 flex h-28 gap-1 overflow-hidden rounded-xl bg-background p-2">
                      {outfit.item_ids.slice(0, 3).map((id) => {
                        const item = items.find((i) => i.id === id);
                        return item ? (
                          <div key={id} className="min-w-0 flex-1">
                            <GarmentSticker item={item} />
                          </div>
                        ) : null;
                      })}
                    </div>
                    <p className="truncate text-sm">{outfit.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {outfit.occasion ?? "Your edit"} · Tap to remix
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      <Dialog
        open={!!shareFile}
        onOpenChange={(open) => {
          if (!open) setShareFile(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
          <DialogTitle>Your look, ready to go.</DialogTitle>
          <DialogDescription>
            Share your card or save it to your photos. Your wardrobe stays private.
          </DialogDescription>
          {shareUrl && (
            <img
              src={shareUrl}
              alt="Your exported outfit card"
              className="mx-auto max-h-[48dvh] rounded-xl"
            />
          )}
          <div className="flex gap-2">
            {shareFile &&
              typeof navigator !== "undefined" &&
              navigator.canShare?.({ files: [shareFile] }) && (
                <Button className="flex-1 rounded-full" onClick={() => void share()}>
                  <Share2 size={16} />
                  Share
                </Button>
              )}
            {shareUrl && (
              <Button asChild variant="outline" className="flex-1 rounded-full">
                <a href={shareUrl} download={shareFile?.name}>
                  <Download size={16} />
                  Download
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
