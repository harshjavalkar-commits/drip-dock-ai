import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/lib/queries";
import { PageHeader } from "@/components/AppShell";
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
import { CATEGORIES, currency, PRIORITIES } from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — plan your next purchase | DripDock" },
      {
        name: "description",
        content: "Track the pieces you want, their price and priority, so you buy with intent.",
      },
      { property: "og:title", content: "Wishlist — DripDock" },
      { property: "og:description", content: "Buy with intent, not impulse." },
    ],
  }),
  component: Wishlist,
});

const emptyForm = {
  name: "",
  category: "",
  price: "",
  store: "",
  link: "",
  priority: "Medium",
  notes: "",
};

function Wishlist() {
  const { user } = useAuth();
  const { data: wishes = [] } = useWishlist();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["wishlist"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!form.name.trim()) throw new Error("Give it a name");
      const { error } = await supabase.from("wishlist_items").insert({
        user_id: user.id,
        name: form.name.trim().slice(0, 120),
        category: form.category || null,
        price: form.price ? Number(form.price) : null,
        store: form.store.trim() || null,
        link: form.link.trim() || null,
        priority: form.priority,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      setOpen(false);
      toast.success("Added to wishlist");
    },
    onError: (error: Error) => toast.error("Couldn't add", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const total = wishes.reduce((sum, wish) => sum + Number(wish.price ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Wishlist"
        title="Next in line"
        description={`${wishes.length} pieces · ${currency(total)} to complete`}
        action={
          <Button className="rounded-full" onClick={() => setOpen((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            {open ? "Close" : "Add"}
          </Button>
        }
      />

      {open ? (
        <section className="surface rise mb-8 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Item</Label>
            <Input
              value={form.name}
              maxLength={120}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Charcoal wool overcoat"
              className="bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(value) => setForm({ ...form, priority: value })}
            >
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Price</Label>
            <Input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Store</Label>
            <Input
              value={form.store}
              maxLength={80}
              onChange={(e) => setForm({ ...form, store: e.target.value })}
              className="bg-card"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Link</Label>
            <Input
              value={form.link}
              maxLength={500}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://"
              className="bg-card"
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              className="w-full rounded-full sm:w-auto"
              disabled={add.isPending}
              onClick={() => add.mutate()}
            >
              Save to wishlist
            </Button>
          </div>
        </section>
      ) : null}

      {wishes.length === 0 ? (
        <div className="surface px-6 py-20 text-center">
          <h2 className="text-2xl">Nothing on the list</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the pieces you're saving for and keep the impulse buys out.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {wishes.map((wish) => (
            <article
              key={wish.id}
              className="surface grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] tracking-wide uppercase",
                      wish.priority === "High"
                        ? "bg-clay text-clay-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {wish.priority}
                  </span>
                  <h3 className="truncate text-lg">{wish.name}</h3>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[wish.category, wish.store, currency(wish.price)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {wish.link ? (
                  <a
                    href={wish.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Open ${wish.name}`}
                  >
                    <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                  </a>
                ) : null}
                <button
                  onClick={() => remove.mutate(wish.id)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Remove ${wish.name}`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
