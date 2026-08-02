import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useItems } from "@/lib/queries";
import { ItemImage } from "@/components/ItemImage";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currency, type ClothingItem } from "@/lib/wardrobe";

export const Route = createFileRoute("/_authenticated/dock")({
  head: () => ({
    meta: [
      { title: "Dock — your wardrobe | DripDock" },
      { name: "description", content: "Browse, search and filter every piece in your wardrobe." },
      { property: "og:title", content: "Dock — your wardrobe" },
      { property: "og:description", content: "Every piece you own, in one place." },
    ],
  }),
  component: Dock,
});

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              onClick={() => onChange(active ? null : option)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Dock() {
  const { data: items = [], isLoading } = useItems();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const options = useMemo(
    () => ({
      categories: [...new Set(items.map((i) => i.category))].sort(),
      colors: [...new Set(items.map((i) => i.color).filter(Boolean))].sort() as string[],
      brands: [...new Set(items.map((i) => i.brand).filter(Boolean))].sort() as string[],
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (favOnly && !item.favorite) return false;
      if (category && item.category !== category) return false;
      if (color && item.color !== color) return false;
      if (brand && item.brand !== brand) return false;
      if (!q) return true;
      return [item.name, item.brand, item.color, item.category, item.material, item.notes]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [items, query, category, color, brand, favOnly]);

  const toggleFavorite = useMutation({
    mutationFn: async (item: ClothingItem) => {
      const { error } = await supabase
        .from("clothing_items")
        .update({ favorite: !item.favorite })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
    onError: () => toast.error("Couldn't update favorite"),
  });

  const activeFilters = [category, color, brand].filter(Boolean).length + (favOnly ? 1 : 0);

  return (
    <>
      <PageHeader
        eyebrow={`${items.length} ${items.length === 1 ? "piece" : "pieces"}`}
        title="The Dock"
        description="Everything you own, catalogued and searchable."
        action={
          <Button asChild size="lg" className="rounded-full">
            <Link to="/upload">
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Add piece
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, brand, colour…"
            className="h-11 rounded-full border-border bg-card pl-10"
          />
        </div>
        <Button
          variant="outline"
          className="h-11 shrink-0 rounded-full bg-card"
          onClick={() => setShowFilters((s) => !s)}
        >
          <SlidersHorizontal className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
          Filters{activeFilters ? ` · ${activeFilters}` : ""}
        </Button>
      </div>

      {showFilters ? (
        <div className="surface rise mb-8 space-y-5 p-5">
          <FilterRow
            label="Category"
            options={options.categories}
            value={category}
            onChange={setCategory}
          />
          <FilterRow label="Colour" options={options.colors} value={color} onChange={setColor} />
          <FilterRow label="Brand" options={options.brands} value={brand} onChange={setBrand} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFavOnly((f) => !f)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                favOnly
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              Favorites only
            </button>
            {activeFilters ? (
              <button
                onClick={() => {
                  setCategory(null);
                  setColor(null);
                  setBrand(null);
                  setFavOnly(false);
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <h2 className="text-2xl">{items.length ? "Nothing matches" : "Your dock is empty"}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {items.length
              ? "Try a different search or clear your filters."
              : "Add your first piece and the stylist starts working immediately."}
          </p>
          {items.length === 0 ? (
            <Button asChild className="mt-2 rounded-full">
              <Link to="/upload">Add your first piece</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <article key={item.id} className="group relative">
              <Link
                to="/item/$itemId"
                params={{ itemId: item.id }}
                className="block overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <ItemImage path={item.image_url} alt={item.name} className="aspect-[3/4]" />
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[item.brand, item.category].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currency(item.purchase_price)} · worn {item.wear_count}×
                  </p>
                </div>
              </Link>
              <button
                onClick={() => toggleFavorite.mutate(item)}
                aria-label="Toggle favorite"
                className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-background/85 backdrop-blur transition-colors hover:bg-background"
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    item.favorite ? "fill-clay text-clay" : "text-muted-foreground",
                  )}
                  strokeWidth={1.5}
                />
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
