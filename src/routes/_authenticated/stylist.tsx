import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useItems, useOutfits } from "@/lib/queries";
import { generateOutfits, type GeneratedOutfit } from "@/lib/stylist.functions";
import { ItemImage } from "@/components/ItemImage";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { OCCASIONS } from "@/lib/wardrobe";

export const Route = createFileRoute("/_authenticated/stylist")({
  head: () => ({
    meta: [
      { title: "Stylist — outfits from your own closet | DripDock" },
      {
        name: "description",
        content:
          "Generate complete outfits from the clothes you already own, with a compatibility score and styling rationale.",
      },
      { property: "og:title", content: "Stylist — DripDock" },
      { property: "og:description", content: "AI outfits built only from pieces you own." },
    ],
  }),
  component: Stylist;
});

function Stylist() {
  return null;
}
