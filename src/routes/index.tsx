import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bookmark, ImagePlus, Share2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DripDock — Your wardrobe. Your world." },
      {
        name: "description",
        content:
          "DripDock turns Your world. already own into outfits worth wearing. Collect your real clothes, create personal outfit cards and share your signature looks.",
      },
      { property: "og:title", content: "DripDock — Your wardrobe. Your world." },
      {
        property: "og:description",
        content:
          "DripDock turns Your world. already own into outfits worth wearing. Collect your real clothes, create personal outfit cards and share your signature looks.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ImagePlus,
    title: "Collect your pieces",
    body: "Bring photos or ready-made cutouts. Give each piece a name and start styling. Your original photo stays safe.",
  },
  {
    icon: Sparkles,
    title: "Make a look",
    body: "Pick your favourites, lock a piece, and shuffle the rest. A personal outfit board made from your actual wardrobe.",
  },
  {
    icon: Share2,
    title: "Your own cover story",
    body: "Give your look an editorial finish. Export a card, then share it wherever your friends are.",
  },
  {
    icon: Bookmark,
    title: "Keep the good ones",
    body: "Save your signature combinations and return to remix them. Your style, building one look at a time.",
  },
];

function Landing() {
  return (
    <div className="room min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="display text-xl">DripDock</span>
        <Link
          to="/auth"
          className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <section className="spotlight mx-auto max-w-6xl px-6 pb-20 pt-10 sm:pt-20">
        <div className="rise max-w-3xl">
          <span className="eyebrow">Your personal fashion world</span>
          <h1 className="mt-5 text-5xl leading-[1.02] sm:text-7xl">
            Your wardrobe.
            <br />
            Your world.
            <br />
            Worn your way.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground">
            Turn your real clothes into a personal fashion world. Collect your favourite pieces,
            remix them into outfit cards, and give your everyday style a little main-character
            energy.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create your first look
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

        <div className="rail-slide mt-20" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-1.5">
            <span className="rail-cap" />
            <span className="rail flex-1" />
            <span className="rail-cap" />
          </div>
          <div className="grid gap-4 pt-6 sm:grid-cols-2">
            {FEATURES.map((feature, i) => (
              <article
                key={feature.title}
                className="hang surface p-7 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
                style={{ transform: `rotate(${(i % 2 ? 1 : -1) * 0.25}deg)` }}
              >
                <feature.icon className="h-5 w-5 text-walnut" strokeWidth={1.5} />
                <h2 className="mt-5 text-2xl">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          DripDock — Your wardrobe. Your world.
        </div>
      </footer>
    </div>
  );
}
