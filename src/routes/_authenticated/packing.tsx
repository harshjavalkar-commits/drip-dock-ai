import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Luggage, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePackingLists } from "@/lib/queries";
import { generatePacking } from "@/lib/stylist.functions";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRIP_TYPES, WEATHER_OPTIONS, type PackingList } from "@/lib/wardrobe";

export const Route = createFileRoute("/_authenticated/packing")({
  head: () => ({
    meta: [
      { title: "Packing assistant — pack from your own closet | DripDock" },
      {
        name: "description",
        content:
          "Generate a trip-ready packing checklist built from the clothes you own, sized to the weather and trip length.",
      },
      { property: "og:title", content: "Packing assistant — DripDock" },
      { property: "og:description", content: "Pack lighter, pack smarter." },
    ],
  }),
  component: Packing,
});

function Packing() {
  const { user } = useAuth();
  const { data: lists = [] } = usePackingLists();
  const queryClient = useQueryClient();
  const generate = useServerFn(generatePacking);

  const [destination, setDestination] = useState("");
  const [weather, setWeather] = useState<string>("Mild");
  const [tripType, setTripType] = useState<string>("City Break");
  const [days, setDays] = useState("5");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["packing"] });

  const run = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!destination.trim()) throw new Error("Where are you going?");
      const result = await generate({
        data: {
          destination: destination.trim(),
          weather,
          trip_type: tripType,
          duration_days: Math.max(1, Math.min(90, Number(days) || 1)),
        },
      });
      const { error } = await supabase.from("packing_lists").insert({
        user_id: user.id,
        destination: destination.trim(),
        weather,
        trip_type: tripType,
        duration_days: Math.max(1, Math.min(90, Number(days) || 1)),
        checklist: result.checklist.map((entry) => ({ ...entry, packed: false })),
        notes: result.summary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setDestination("");
      toast.success("Packing list ready");
    },
    onError: (error: Error) => toast.error("Couldn't pack", { description: error.message }),
  });

  const toggle = useMutation({
    mutationFn: async ({ list, index }: { list: PackingList; index: number }) => {
      const checklist = list.checklist.map((entry, i) =>
        i === index ? { ...entry, packed: !entry.packed } : entry,
      );
      const { error } = await supabase
        .from("packing_lists")
        .update({ checklist })
        .eq("id", list.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packing_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        eyebrow="Packing"
        title="Trip assistant"
        description="A checklist built from what's already hanging in your dock."
      />

      <section className="surface mb-10 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Destination</Label>
          <Input
            value={destination}
            maxLength={120}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Lisbon"
            className="bg-card"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Weather</Label>
          <Select value={weather} onValueChange={setWeather}>
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEATHER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Trip type</Label>
          <Select value={tripType} onValueChange={setTripType}>
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIP_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Days</Label>
          <Input
            type="number"
            min="1"
            max="90"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="bg-card"
          />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full rounded-full"
            disabled={run.isPending}
            onClick={() => run.mutate()}
          >
            {run.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Luggage className="mr-2 h-4 w-4" strokeWidth={1.5} />
            )}
            {run.isPending ? "Packing…" : "Build list"}
          </Button>
        </div>
      </section>

      <div className="space-y-5">
        {lists.map((list) => {
          const packed = list.checklist.filter((entry) => entry.packed).length;
          return (
            <article key={list.id} className="surface p-5 sm:p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-2xl">{list.destination}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[list.trip_type, list.weather, `${list.duration_days} days`]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {packed}/{list.checklist.length} packed
                  </p>
                </div>
                <button
                  onClick={() => remove.mutate(list.id)}
                  className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Delete ${list.destination} list`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              {list.notes ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{list.notes}</p>
              ) : null}

              <ul className="mt-4 divide-y divide-border border-t border-border">
                {list.checklist.map((entry, index) => (
                  <li key={`${list.id}-${index}`} className="flex items-start gap-3 py-2.5">
                    <Checkbox
                      checked={!!entry.packed}
                      onCheckedChange={() => toggle.mutate({ list, index })}
                      className="mt-0.5"
                      aria-label={entry.label}
                    />
                    <div className="min-w-0">
                      <p className="text-sm">{entry.label}</p>
                      {entry.note ? (
                        <p className="text-xs text-muted-foreground">{entry.note}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}
