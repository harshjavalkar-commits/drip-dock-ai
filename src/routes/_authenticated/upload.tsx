import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppShell";
import { ItemForm, emptyItem, toPayload, type ItemFormValues } from "@/components/ItemForm";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Add a piece — DripDock" },
      { name: "description", content: "Add a new clothing item to your DripDock wardrobe." },
      { property: "og:title", content: "Add a piece — DripDock" },
      { property: "og:description", content: "Catalogue a new item in seconds." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ItemFormValues>(emptyItem());

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("clothing_items").insert(toPayload(values, user.id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Added to your dock");
      navigate({ to: "/dock" });
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Upload"
        title="Add a piece"
        description="The more detail you give, the sharper the stylist gets."
      />
      {user ? (
        <ItemForm
          values={values}
          onChange={setValues}
          onSubmit={() => save.mutate()}
          submitting={save.isPending}
          submitLabel="Add to dock"
          userId={user.id}
        />
      ) : null}
    </>
  );
}
