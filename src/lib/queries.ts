import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CalendarPlan,
  ClothingItem,
  Outfit,
  PackingList,
  WishlistItem,
} from "@/lib/wardrobe";

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClothingItem[];
    },
  });
}

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WishlistItem[];
    },
  });
}

export function useOutfits() {
  return useQuery({
    queryKey: ["outfits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Outfit[];
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_plans")
        .select("*")
        .order("plan_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CalendarPlan[];
    },
  });
}

export function usePackingLists() {
  return useQuery({
    queryKey: ["packing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packing_lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PackingList[];
    },
  });
}
