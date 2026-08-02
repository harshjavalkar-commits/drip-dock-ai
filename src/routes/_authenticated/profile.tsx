import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useItems } from "@/lib/queries";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currency } from "@/lib/wardrobe";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — your DripDock account" },
      { name: "description", content: "Manage your DripDock display name, style notes and session." },
      { property: "og:title", content: "Profile — DripDock" },
      { property: "og:description", content: "Your account and style preferences." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: items = [] } = useItems();
  const [displayName, setDisplayName] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { display_name: string | null; style_notes: string | null } | null;
    },
  });

  useEffect(() => {
    if (profile && !loaded) {
      setDisplayName(profile.display_name ?? "");
      setStyleNotes(profile.style_notes ?? "");
      setLoaded(true);
    }
  }, [profile, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim().slice(0, 80) || null,
          style_notes: styleNotes.trim().slice(0, 500) || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const value = items.reduce((sum, item) => sum + Number(item.purchase_price ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Your account"
        description={user?.email ?? ""}
        action={
          <Button variant="outline" className="rounded-full bg-card" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            Sign out
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="surface space-y-4 p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input
              value={displayName}
              maxLength={80}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Style notes</Label>
            <Textarea
              value={styleNotes}
              maxLength={500}
              onChange={(e) => setStyleNotes(e.target.value)}
              placeholder="Neutral palette, relaxed tailoring, no logos."
              className="min-h-28 bg-card"
            />
          </div>
          <Button
            className="w-full rounded-full sm:w-auto"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            Save profile
          </Button>
        </section>

        <section className="surface p-5 sm:p-6">
          <span className="eyebrow">At a glance</span>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Pieces owned</dt>
              <dd>{items.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Wardrobe value</dt>
              <dd>{currency(value)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Favorites</dt>
              <dd>{items.filter((item) => item.favorite).length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Total wears</dt>
              <dd>{items.reduce((sum, item) => sum + item.wear_count, 0)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
