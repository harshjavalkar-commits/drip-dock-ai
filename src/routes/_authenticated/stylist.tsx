import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useItems, useOutfits } from "@/lib/queries";
import { generateOutfits, type GeneratedOutfit } from "@/lib/stylist.functions";
import { ItemImage } from "@/components/ItemImage";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { OCCASIONS } from "@/lib/wardrobe";

export const Route = createFileRoute("/_authenticated/stylist")({
  head: () => ({
    meta: [
      { title: "Stylist — outfits from your own closet | DripDock" },
      {
        name: "description",
        content:
          "Generate complete outfits from the clothes you already own, with a compatibility score and styling rationale.",
      },
      { property: "og:title", content: "Stylist — DripDock" },
      { property: "og:description", content: "AI outfits built only from pieces you own." },
    ],
  }),
  component: Stylist,
});

function Stylist() {
  const { user } = useAuth();
  const { data: items = [] } = useItems();
  const { data: saved = [] } = useOutfits();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateOutfits);

  const [occasion, setOccasion] = useState<string>("Smart Casual");
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<GeneratedOutfit[]>([]);

  const byId = new Map(items.map((item) => [item.id, item]));

  const run = useMutation({
    mutationFn: async () => generate({ data: { occasion, notes: notes.trim() || undefined } }),
    onSuccess: (data) => {
      setResults(data);
      if (data.length === 0) toast.error("The stylist couldn't build a full look — add more pieces.");
    },
    onError: (error: Error) => toast.error("Stylist unavailable", { description: error.message }),
  });

  const saveOutfit = useMutation({
    mutationFn: async (outfit: GeneratedOutfit) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("outfits").insert({
        user_id: user.id,
        title: outfit.title,
        occasion,
        score: outfit.score,
        explanation: outfit.explanation,
        item_ids: outfit.item_ids,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      toast.success("Outfit saved");
    },
    onError: () => toast.error("Couldn't save outfit"),
  });

  function OutfitCard({
    title,
    score,
    explanation,
    itemIds,
    onSave,
  }: {
    title: string;
    score: number | null;
    explanation: string | null;
    itemIds: string[];
    onSave?: () => void;
  }) {
    return (
      <article className="surface rise overflow-hidden p-5 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-2xl">{title}</h3>
            {score != null ? (
              <p className="mt-1 text-xs text-muted-foreground">Compatibility {score}/100</p>
            ) : null}
          </div>
          {onSave ? (
            <Button variant="outline" className="shrink-0 rounded-full bg-card" onClick={onSave}>
              <Bookmark className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Save
            </Button>
          ) : null}
        </div>

        {score != null ? (
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-clay" style={{ width: `${score}%` }} />
          </div>
        ) : null}

        <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {itemIds.map((id) => {
            const item = byId.get(id);
            if (!item) return null;
            return (
              <div key={id} className="w-28 shrink-0">
                <ItemImage
                  path={item.image_url}
                  alt={item.name}
                  className="aspect-[3/4] rounded-lg border border-border"
                />
                <p className="mt-1.5 truncate text-xs">{item.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{item.category}</p>
              </div>
            );
          })}
        </div>

        {explanation ? (
          <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
            {explanation}
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Stylist"
        title="What should I wear?"
        description="Outfits composed strictly from pieces already in your dock."
      />

      <section className="surface mb-10 p-5 sm:p-6">
        <span className="eyebrow">Occasion</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {OCCASIONS.map((option) => (
            <button
              key={option}
              onClick={() => setOccasion(option)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                occasion === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <Textarea
          value={notes}
          maxLength={300}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional: dinner outdoors, chilly evening, want to look sharp but relaxed."
          className="mt-5 min-h-20 rounded-lg bg-card"
        />
        <Button
          size="lg"
          className="mt-5 w-full rounded-full sm:w-auto"
          disabled={run.isPending || items.length < 2}
          onClick={() => run.mutate()}
        >
          {run.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} />
          )}
          {run.isPending ? "Styling…" : "Generate outfits"}
        </Button>
        {items.length < 2 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Add at least two pieces to your dock first.
          </p>
        ) : null}
      </section>

      {results.length > 0 ? (
        <section className="mb-12 space-y-5">
          <h2 className="text-2xl">Suggestions</h2>
          {results.map((outfit, index) => (
            <OutfitCard
              key={`${outfit.title}-${index}`}
              title={outfit.title}
              score={outfit.score}
              explanation={outfit.explanation}
              itemIds={outfit.item_ids}
              onSave={() => saveOutfit.mutate(outfit)}
            />
          ))}
        </section>
      ) : null}

      {saved.length > 0 ? (
        <section className="space-y-5">
          <h2 className="text-2xl">Saved outfits</h2>
          {saved.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              title={outfit.title}
              score={outfit.score}
              explanation={outfit.explanation}
              itemIds={outfit.item_ids}
            />
          ))}
        </section>
      ) : null}
    </>
  );
}
