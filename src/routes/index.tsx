import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, CalendarDays, Luggage, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DripDock — AI wardrobe intelligence & personal stylist" },
      {
        name: "description",
        content:
          "DripDock turns the clothes you already own into outfits worth wearing. Catalogue your wardrobe, get AI styling, track cost per wear, plan outfits and pack smarter.",
      },
      { property: "og:title", content: "DripDock — AI wardrobe intelligence & personal stylist" },
      {
        property: "og:description",
        content: "DripDock turns the clothes you already own into outfits worth wearing. Catalogue your wardrobe, get AI styling, track cost per wear, plan outfits and pack smarter.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "Stylist",
    body: "Outfits generated only from pieces you own, with a compatibility score and the reasoning behind every pairing.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Wardrobe value, cost per wear, unused purchases and the essentials still missing from your rotation.",
  },
  {
    icon: CalendarDays,
    title: "Calendar",
    body: "Plan what you'll wear before the week starts, and log wears automatically as the days pass.",
  },
  {
    icon: Luggage,
    title: "Packing",
    body: "Destination, weather and trip length in — a precise checklist built from your own closet out.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="display text-xl">DripDock</span>
        <Link
          to="/auth"
          className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:pt-20">
        <div className="rise max-w-3xl">
          <span className="eyebrow">Wardrobe intelligence</span>
          <h1 className="mt-5 text-5xl leading-[1.02] sm:text-7xl">
            Dress better with
            <br />
            the clothes you
            <br />
            already own.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground">
            DripDock is a quiet, considered home for your wardrobe. Catalogue every piece, then let
            the stylist compose outfits, surface what you never wear, and tell you what's actually
            missing.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open your dock
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              to="/auth"
              className="rounded-full border border-border px-6 py-3 text-sm transition-colors hover:bg-accent"
            >
              Create an account
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="surface p-7">
              <feature.icon className="h-5 w-5 text-clay" strokeWidth={1.5} />
              <h2 className="mt-5 text-2xl">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          DripDock — personal wardrobe intelligence.
        </div>
      </footer>
    </div>
  );
}
