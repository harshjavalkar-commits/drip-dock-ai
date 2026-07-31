import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { ItemImage } from "@/components/ItemImage";
import { useItems } from "@/lib/queries";
import { currency, ESSENTIALS, type ClothingItem } from "@/lib/wardrobe";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — wardrobe value & cost per wear | DripDock" },
      {
        name: "description",
        content:
          "See your wardrobe value, most and least worn pieces, cost per wear, unused purchases and missing essentials.",
      },
      { property: "og:title", content: "Analytics — DripDock" },
      { property: "og:description", content: "Understand what your wardrobe is really worth." },
    ],
  }),
  component: Analytics,
});

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface p-5">
      <span className="eyebrow">{label}</span>
      <p className="display mt-3 text-3xl">{value}</p>
      {sub ? <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function ItemRow({ item, meta }: { item: ClothingItem; meta: string }) {
  return (
    <Link
      to="/item/$itemId"
      params={{ itemId: item.id }}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
    >
      <ItemImage
        path={item.image_url}
        alt={item.name}
        className="h-14 w-11 shrink-0 rounded-md border border-border"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[item.brand, item.category].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
    </Link>
  );
}

function topOf(counts: Record<string, number>) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "—";
}

function Analytics() {
  const { data: items = [], isLoading } = useItems();

  const stats = useMemo(() => {
    const value = items.reduce((sum, i) => sum + Number(i.purchase_price ?? 0), 0);
    const worn = [...items].sort((a, b) => b.wear_count - a.wear_count);
    const colorCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    for (const item of items) {
      if (item.color) colorCounts[item.color] = (colorCounts[item.color] ?? 0) + 1;
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    }
    const withCpw = items
      .filter((i) => i.purchase_price != null)
      .map((i) => ({ item: i, cpw: Number(i.purchase_price) / Math.max(1, i.wear_count) }))
      .sort((a, b) => a.cpw - b.cpw);
    const unused = items.filter((i) => i.wear_count === 0 && i.purchase_price != null);
    const missing = ESSENTIALS.filter(
      (essential) => !items.some((item) => essential.categories.includes(item.category)),
    );
    const totalWears = items.reduce((sum, i) => sum + i.wear_count, 0);

    return {
      value,
      worn,
      favoriteColor: topOf(colorCounts),
      favoriteCategory: topOf(categoryCounts),
      withCpw,
      unused,
      missing,
      totalWears,
      avgCpw: totalWears > 0 ? value / totalWears : null,
    };
  }, [items]);

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  const mostWorn = stats.worn[0];
  const leastWorn = stats.worn[stats.worn.length - 1];

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Wardrobe intelligence"
        description="What you own, what you actually wear, and what it costs you."
      />

      {items.length === 0 ? (
        <div className="surface px-6 py-20 text-center">
          <h2 className="text-2xl">Nothing to measure yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add pieces to your dock and the numbers appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Wardrobe value"
              value={currency(stats.value)}
              sub={`${items.length} pieces`}
            />
            <Stat
              label="Average cost / wear"
              value={stats.avgCpw != null ? currency(stats.avgCpw) : "—"}
              sub={`${stats.totalWears} logged wears`}
            />
            <Stat label="Favorite colour" value={stats.favoriteColor} />
            <Stat label="Favorite category" value={stats.favoriteCategory} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface p-5">
              <span className="eyebrow">Most worn</span>
              <div className="mt-3">
                {mostWorn ? (
                  <ItemRow item={mostWorn} meta={`${mostWorn.wear_count}×`} />
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </div>
              <span className="eyebrow mt-6 block">Least worn</span>
              <div className="mt-3">
                {leastWorn ? (
                  <ItemRow item={leastWorn} meta={`${leastWorn.wear_count}×`} />
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </div>
            </section>

            <section className="surface p-5">
              <span className="eyebrow">Best cost per wear</span>
              <div className="mt-3 space-y-1">
                {stats.withCpw.slice(0, 4).map(({ item, cpw }) => (
                  <ItemRow key={item.id} item={item} meta={`${currency(cpw)}/wear`} />
                ))}
                {stats.withCpw.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add purchase prices to see this.</p>
                ) : null}
              </div>
            </section>

            <section className="surface p-5">
              <span className="eyebrow">Unused purchases</span>
              <div className="mt-3 space-y-1">
                {stats.unused.slice(0, 6).map((item) => (
                  <ItemRow key={item.id} item={item} meta={currency(item.purchase_price)} />
                ))}
                {stats.unused.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Everything you've bought has been worn. Impressive.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="surface p-5">
              <span className="eyebrow">Missing essentials</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.missing.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Your foundation is complete — build from here.
                  </p>
                ) : (
                  stats.missing.map((essential) => (
                    <span
                      key={essential.label}
                      className="rounded-full border border-dashed border-border px-3.5 py-1.5 text-xs text-muted-foreground"
                    >
                      {essential.label}
                    </span>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
