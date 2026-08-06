import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { MiniYouCard } from "@/components/MiniYouCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useItems } from "@/lib/queries";
import {
  fetchMiniYou,
  saveMiniYou,
  uploadMiniYouImage,
  wardrobeCompleteness,
} from "@/lib/miniyou";

export const Route = createFileRoute("/_authenticated/miniyou")({
  head: () => ({
    meta: [
      { title: "MiniYou — your digital fashion identity" },
      {
        name: "description",
        content:
          "Create MiniYou once: a permanent, premium full-body fashion identity for your DripDock wardrobe.",
      },
      { property: "og:title", content: "MiniYou — DripDock" },
      { property: "og:description", content: "Your permanent digital fashion identity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MiniYouPage,
});

function MiniYouPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [] } = useItems();
  const fileInput = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: mini, isLoading } = useQuery({
    queryKey: ["mini-you", user?.id],
    enabled: !!user,
    queryFn: () => fetchMiniYou(user!.id),
  });

  useEffect(() => {
    if (mini && !loaded) {
      setPrompt(mini.prompt ?? "");
      setLoaded(true);
    }
  }, [mini, loaded]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const path = await uploadMiniYouImage(user.id, file);
      return saveMiniYou(user.id, { image_url: path, status: "ready" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mini-you"] });
      toast.success("MiniYou created", { description: "You only ever do this once." });
    },
    onError: (error: Error) => toast.error("Couldn't save MiniYou", { description: error.message }),
  });

  const savePrompt = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      return saveMiniYou(user.id, { prompt: prompt.trim().slice(0, 500) || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mini-you"] });
      toast.success("Style brief saved");
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  const completeness = wardrobeCompleteness(items);
  const hasMiniYou = !!mini?.image_url;

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    upload.mutate(file);
  }

  return (
    <>
      <PageHeader
        eyebrow="MiniYou"
        title={hasMiniYou ? "Your MiniYou" : "Create your MiniYou"}
        description={
          hasMiniYou
            ? "Your permanent digital fashion identity, dressed by the pieces you actually own."
            : "A one-time setup. MiniYou is created once and stays with your wardrobe forever."
        }
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="rise">
          <MiniYouCard
            path={mini?.image_url ?? null}
            fallback={!completeness.complete}
            caption={
              hasMiniYou && !completeness.complete
                ? "Wearing the house look until your rails fill up"
                : undefined
            }
          />
          {isLoading ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">Opening the mirror…</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          {!hasMiniYou ? (
            <section className="surface rise p-6">
              <span className="eyebrow">Step one · once only</span>
              <h2 className="mt-2 text-2xl">Set your fashion identity</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload one clean full-body photo against a plain wall. MiniYou is not a cartoon
                avatar — it's the reference DripDock styles your real garments against.
              </p>
              <Button
                className="mt-5 w-full"
                onClick={() => fileInput.current?.click()}
                disabled={upload.isPending}
              >
                <ImagePlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {upload.isPending ? "Saving MiniYou…" : "Upload MiniYou image"}
              </Button>
            </section>
          ) : (
            <section className="surface rise flex items-start gap-4 p-6">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-foreground">
                <UserRound className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl">MiniYou is set</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Created once, kept forever. You can replace the reference image at any time.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInput.current?.click()}
                  disabled={upload.isPending}
                >
                  {upload.isPending ? "Replacing…" : "Replace image"}
                </Button>
              </div>
            </section>
          )}

          <section className="surface p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-clay" strokeWidth={1.5} />
              <span className="eyebrow">Future · AI MiniYou</span>
            </div>
            <h2 className="mt-2 text-xl">Style brief</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe how your MiniYou should look. Saved now, used when automatic MiniYou
              generation arrives — no AI is called yet.
            </p>
            <Label htmlFor="miniyou-prompt" className="mt-4 block">
              Prompt placeholder
            </Label>
            <Textarea
              id="miniyou-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder="Tall, warm skin tone, minimal editorial styling, neutral studio backdrop…"
              className="mt-2"
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => savePrompt.mutate()}
              disabled={savePrompt.isPending}
            >
              {savePrompt.isPending ? "Saving…" : "Save style brief"}
            </Button>
          </section>

          <section className="surface p-6">
            <span className="eyebrow">Wardrobe completeness</span>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-walnut transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(completeness.ratio * 100)}%` }}
              />
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {completeness.slots.map((slot) => (
                <li
                  key={slot.key}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className={
                        slot.filled
                          ? "grid h-5 w-5 place-items-center rounded-full bg-walnut text-walnut-foreground"
                          : "grid h-5 w-5 place-items-center rounded-full border border-border"
                      }
                    >
                      {slot.filled ? <Check className="h-3 w-3" strokeWidth={2} /> : null}
                    </span>
                    {slot.key}
                  </span>
                  <span className="text-xs text-muted-foreground">{slot.count}</span>
                </li>
              ))}
            </ul>
            {!completeness.complete ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Until tops, bottoms and shoes are in your dock, MiniYou wears the default DripDock
                outfit — it never appears incomplete.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
