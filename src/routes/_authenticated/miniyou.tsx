import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, ImagePlus, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { MiniYouCard } from "@/components/MiniYouCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useItems } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  MINI_YOU_STYLES,
  fetchMiniYou,
  miniYouPrompt,
  saveMiniYou,
  uploadMiniYouImage,
  wardrobeCompleteness,
  type MiniYouStyle,
} from "@/lib/miniyou";

export const Route = createFileRoute("/_authenticated/miniyou")({
  head: () => ({
    meta: [
      { title: "MiniYou — your digital fashion identity" },
      {
        name: "description",
        content:
          "Create MiniYou once: a guided flow that turns one selfie into a permanent, premium fashion identity for your DripDock wardrobe.",
      },
      { property: "og:title", content: "MiniYou — DripDock" },
      { property: "og:description", content: "Your permanent digital fashion identity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MiniYouPage,
});

const STEPS = [
  { title: "Take a selfie", body: "One clear, well-lit photo. Face visible, plain wall behind you." },
  { title: "Copy the DripDock prompt", body: "One tap below — it already includes your chosen style." },
  { title: "Open ChatGPT", body: "Any image-capable chat works. Start a fresh conversation." },
  { title: "Upload selfie and prompt", body: "Attach the selfie, paste the prompt, send." },
  { title: "Generate MiniYou", body: "Save the full-body image it returns." },
  { title: "Upload MiniYou back to DripDock", body: "Bring it home with the button below." },
];

function MiniYouPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [] } = useItems();
  const fileInput = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<MiniYouStyle>("minimal-3d");
  const [loaded, setLoaded] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: mini, isLoading } = useQuery({
    queryKey: ["mini-you", user?.id],
    enabled: !!user,
    queryFn: () => fetchMiniYou(user!.id),
  });

  useEffect(() => {
    if (mini && !loaded) {
      setPrompt(mini.prompt ?? "");
      if (mini.style) setStyle(mini.style);
      setLoaded(true);
    }
  }, [mini, loaded]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const path = await uploadMiniYouImage(user.id, file);
      return saveMiniYou(user.id, { image_url: path, style, status: "ready" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mini-you"] });
      setReplacing(false);
      toast.success("MiniYou saved", { description: "Your permanent fashion identity is set." });
    },
    onError: (error: Error) => toast.error("Couldn't save MiniYou", { description: error.message }),
  });

  const pickStyle = useMutation({
    mutationFn: async (next: MiniYouStyle) => {
      if (!user) throw new Error("Not signed in");
      return saveMiniYou(user.id, { style: next });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mini-you"] }),
    onError: (error: Error) => toast.error("Couldn't save style", { description: error.message }),
  });

  const savePrompt = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      return saveMiniYou(user.id, { prompt: prompt.trim().slice(0, 500) || null, style });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mini-you"] });
      toast.success("Style brief saved");
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  const completeness = wardrobeCompleteness(items);
  const hasMiniYou = !!mini?.image_url;
  const showFlow = !hasMiniYou || replacing;
  const fullPrompt = miniYouPrompt(style, prompt);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    upload.mutate(file);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Prompt copied", { description: "Paste it into ChatGPT with your selfie." });
    } catch {
      toast.error("Couldn't copy", { description: "Select the prompt text and copy it manually." });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="MiniYou"
        title={hasMiniYou && !replacing ? "Your MiniYou" : "Create your MiniYou"}
        description={
          hasMiniYou && !replacing
            ? "Your permanent digital fashion identity, dressed by the pieces you actually own."
            : "Created once, kept forever. Six guided steps turn one selfie into your fashion identity."
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
        <div className="rise lg:sticky lg:top-24">
          <MiniYouCard
            path={replacing ? null : mini?.image_url ?? null}
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
          <section className="surface rise p-6">
            <span className="eyebrow">Why MiniYou</span>
            <ul className="mt-3 grid gap-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-walnut" />
                MiniYou only needs to be created once.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-walnut" />
                It becomes your permanent digital fashion identity.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-walnut" />
                DripDock uses it for outfit cards, fashion doll mode and future visualisation.
              </li>
            </ul>
          </section>

          {hasMiniYou && !replacing ? (
            <section className="surface rise flex items-start gap-4 p-6">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-foreground">
                <UserRound className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl">MiniYou is set</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Style:{" "}
                  {MINI_YOU_STYLES.find((s) => s.id === mini?.style)?.label ?? "Minimal 3D"}. You can
                  replace it any time — replacements follow the same guided flow.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setReplacing(true)}>
                  Replace MiniYou
                </Button>
              </div>
            </section>
          ) : null}

          {showFlow ? (
            <>
              <section className="surface rise p-6">
                <span className="eyebrow">Step one · choose a style</span>
                <h2 className="mt-2 text-2xl">Pick your MiniYou look</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {MINI_YOU_STYLES.map((option) => {
                    const active = style === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setStyle(option.id);
                          pickStyle.mutate(option.id);
                        }}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-colors",
                          active
                            ? "border-walnut bg-accent"
                            : "border-border hover:border-walnut/50",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-base">{option.label}</span>
                          {active ? (
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-walnut text-walnut-foreground">
                              <Check className="h-3 w-3" strokeWidth={2} />
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs uppercase tracking-wide text-muted-foreground">
                          {option.tagline}
                        </span>
                        <span className="mt-2 block text-sm text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="surface p-6">
                <span className="eyebrow">The guided flow</span>
                <h2 className="mt-2 text-2xl">Six steps, once</h2>
                <ol className="mt-5 grid gap-4">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-xs">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm">{step.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="eyebrow">DripDock prompt</span>
                    <Button size="sm" variant="secondary" onClick={copyPrompt}>
                      {copied ? (
                        <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      )}
                      {copied ? "Copied" : "Copy prompt"}
                    </Button>
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
                    {fullPrompt}
                  </pre>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="outline" asChild>
                    <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Open ChatGPT
                    </a>
                  </Button>
                  <Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
                    <ImagePlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {upload.isPending
                      ? "Saving MiniYou…"
                      : hasMiniYou
                        ? "Upload replacement"
                        : "Upload MiniYou image"}
                  </Button>
                  {hasMiniYou ? (
                    <Button variant="ghost" onClick={() => setReplacing(false)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}

          <section className="surface p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-clay" strokeWidth={1.5} />
              <span className="eyebrow">Optional · personalise</span>
            </div>
            <h2 className="mt-2 text-xl">Style brief</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anything you add here is folded into the copied prompt and saved for future automatic
              MiniYou generation.
            </p>
            <Label htmlFor="miniyou-prompt" className="mt-4 block">
              Personal notes
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
