import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useItems, useOutfits, usePlans } from "@/lib/queries";
import { PageHeader } from "@/components/AppShell";
import { ItemImage } from "@/components/ItemImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OCCASIONS } from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — plan outfits ahead | DripDock" },
      {
        name: "description",
        content: "Plan what you'll wear for the week ahead and never repeat a look by accident.",
      },
      { property: "og:title", content: "Calendar — DripDock" },
      { property: "og:description", content: "Plan your looks day by day." },
    ],
  }),
  component: CalendarPage,
});

const iso = (date: Date) => date.toISOString().slice(0, 10);

function monthMatrix(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array.from({ length: offset }, () => null);
  const total = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= total; day += 1) {
    days.push(new Date(anchor.getFullYear(), anchor.getMonth(), day));
  }
  return days;
}

function CalendarPage() {
  const { user } = useAuth();
  const { data: plans = [] } = usePlans();
  const { data: items = [] } = useItems();
  const { data: outfits = [] } = useOutfits();
  const queryClient = useQueryClient();

  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => iso(new Date()));
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("Casual");
  const [outfitId, setOutfitId] = useState("none");

  const byId = new Map(items.map((item) => [item.id, item]));
  const days = useMemo(() => monthMatrix(anchor), [anchor]);
  const planByDate = new Map(plans.map((plan) => [plan.plan_date, plan]));
  const selectedPlan = planByDate.get(selected);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plans"] });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const outfit = outfits.find((o) => o.id === outfitId);
      const { error } = await supabase.from("calendar_plans").insert({
        user_id: user.id,
        plan_date: selected,
        title: title.trim() || outfit?.title || "Planned look",
        occasion,
        outfit_id: outfit?.id ?? null,
        item_ids: outfit?.item_ids ?? [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setTitle("");
      toast.success("Day planned");
    },
    onError: (error: Error) => toast.error("Couldn't plan", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Plan the week"
        description="Assign saved outfits to dates so mornings stay effortless."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="surface p-4 sm:p-6">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <h2 className="truncate text-2xl">
              {anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-card"
                aria-label="Previous month"
                onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-card"
                aria-label="Next month"
                onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </header>

          <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] tracking-wide text-muted-foreground uppercase">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const key = iso(day);
              const planned = planByDate.has(key);
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors",
                    key === selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-transparent hover:bg-accent",
                  )}
                >
                  {day.getDate()}
                  <span
                    className={cn(
                      "mt-1 h-1 w-1 rounded-full",
                      planned ? "bg-clay" : "bg-transparent",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <span className="eyebrow">
            {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>

          {selectedPlan ? (
            <div className="mt-4 rounded-lg border border-border p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg">{selectedPlan.title}</h3>
                  <p className="text-xs text-muted-foreground">{selectedPlan.occasion}</p>
                </div>
                <button
                  onClick={() => remove.mutate(selectedPlan.id)}
                  className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Remove plan"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {selectedPlan.item_ids.map((id) => {
                  const item = byId.get(id);
                  if (!item) return null;
                  return (
                    <ItemImage
                      key={id}
                      path={item.image_url}
                      alt={item.name}
                      className="h-20 w-16 shrink-0 rounded-md border border-border"
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={title}
                  maxLength={80}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Client meeting"
                  className="bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Occasion</Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCASIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Saved outfit</Label>
                <Select value={outfitId} onValueChange={setOutfitId}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {outfits.map((outfit) => (
                      <SelectItem key={outfit.id} value={outfit.id}>
                        {outfit.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full rounded-full"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                Plan this day
              </Button>
              {outfits.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Save an outfit in the Stylist to attach the actual pieces.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
