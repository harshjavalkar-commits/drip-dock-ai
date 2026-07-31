import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppShell";
import { ItemForm, toFormValues, toPayload, type ItemFormValues } from "@/components/ItemForm";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ClothingItem } from "@/lib/wardrobe";

export const Route = createFileRoute("/_authenticated/item/$itemId")({
  head: () => ({
    meta: [
      { title: "Edit piece — DripDock" },
      { name: "description", content: "Edit or remove a piece from your DripDock wardrobe." },
      { property: "og:title", content: "Edit piece — DripDock" },
      { property: "og:description", content: "Keep your wardrobe details accurate." },
    ],
  }),
  component: ItemDetail,
});

function ItemDetail() {
  const { itemId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ItemFormValues | null>(null);

  const { data: item } = useQuery({
    queryKey: ["item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ClothingItem | null;
    },
  });

  useEffect(() => {
    if (item && !values) setValues(toFormValues(item));
  }, [item, values]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["item", itemId] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user || !values) throw new Error("Missing data");
      const { user_id: _ignored, ...payload } = toPayload(values, user.id);
      const { error } = await supabase.from("clothing_items").update(payload).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Saved");
      navigate({ to: "/dock" });
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clothing_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Removed from your dock");
      navigate({ to: "/dock" });
    },
    onError: (error: Error) => toast.error("Couldn't delete", { description: error.message }),
  });

  const logWear = useMutation({
    mutationFn: async () => {
      if (!user || !item) throw new Error("Missing data");
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("wear_logs")
        .insert({ user_id: user.id, item_id: item.id, worn_on: today });
      if (error) throw error;
      const { error: updateError } = await supabase
        .from("clothing_items")
        .update({ wear_count: item.wear_count + 1, last_worn_at: today })
        .eq("id", item.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Wear logged");
    },
    onError: () => toast.error("Couldn't log wear"),
  });

  if (!item || !values || !user) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <>
      <PageHeader
        eyebrow={item.category}
        title={item.name}
        description={`Worn ${item.wear_count}× · added ${new Date(item.created_at).toLocaleDateString()}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full bg-card"
              onClick={() => logWear.mutate()}
              disabled={logWear.isPending}
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Log wear
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-full bg-card" aria-label="Delete item">
                  <Trash2 className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this piece?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {item.name} and its wear history. It can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />
      <ItemForm
        values={values}
        onChange={setValues}
        onSubmit={() => save.mutate()}
        submitting={save.isPending}
        submitLabel="Save changes"
        userId={user.id}
      />
    </>
  );
}
