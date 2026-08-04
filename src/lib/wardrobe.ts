import type { ProcessingStage, ProcessingStatus } from "@/lib/atelier";

export const CATEGORIES = [
  "T-Shirts",
  "Shirts",
  "Polos",
  "Hoodies",
  "Jackets",
  "Sweaters",
  "Jeans",
  "Trousers",
  "Shorts",
  "Shoes",
  "Sneakers",
  "Boots",
  "Watches",
  "Rings",
  "Bracelets",
  "Necklaces",
  "Sunglasses",
  "Caps",
  "Bags",
  "Belts",
  "Other accessories",
] as const;

export const TOP_CATEGORIES = ["T-Shirts", "Shirts", "Polos", "Hoodies", "Sweaters"];
export const BOTTOM_CATEGORIES = ["Jeans", "Trousers", "Shorts"];
export const SHOE_CATEGORIES = ["Shoes", "Sneakers", "Boots"];
export const OUTERWEAR_CATEGORIES = ["Jackets"];
export const ACCESSORY_CATEGORIES = [
  "Watches",
  "Rings",
  "Bracelets",
  "Necklaces",
  "Sunglasses",
  "Caps",
  "Bags",
  "Belts",
  "Other accessories",
];

export const OCCASIONS = [
  "Casual",
  "Office",
  "Business",
  "Wedding",
  "Party",
  "Vacation",
  "Date Night",
  "Formal",
  "Smart Casual",
  "Travel",
  "Rainy Day",
  "Summer",
  "Winter",
] as const;

export const SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All Season"] as const;

export const COLORS = [
  "Black",
  "White",
  "Grey",
  "Navy",
  "Blue",
  "Beige",
  "Brown",
  "Cream",
  "Green",
  "Olive",
  "Red",
  "Burgundy",
  "Pink",
  "Purple",
  "Yellow",
  "Orange",
  "Silver",
  "Gold",
  "Multi",
] as const;

export const MATERIALS = [
  "Cotton",
  "Linen",
  "Wool",
  "Cashmere",
  "Denim",
  "Leather",
  "Suede",
  "Silk",
  "Polyester",
  "Nylon",
  "Blend",
  "Metal",
  "Other",
] as const;

export const PATTERNS = [
  "Solid",
  "Striped",
  "Checked",
  "Plaid",
  "Floral",
  "Graphic",
  "Textured",
  "Camo",
  "Other",
] as const;

export const FITS = ["Slim", "Regular", "Relaxed", "Oversized", "Tailored", "Cropped"] as const;

export const TRIP_TYPES = [
  "Business",
  "Beach",
  "City Break",
  "Adventure",
  "Wedding",
  "Family Visit",
  "Ski",
] as const;

export const WEATHER_OPTIONS = [
  "Hot & dry",
  "Warm & humid",
  "Mild",
  "Cool",
  "Cold",
  "Rainy",
  "Snowy",
] as const;

export const PRIORITIES = ["High", "Medium", "Low"] as const;

export const ESSENTIALS: { label: string; categories: string[] }[] = [
  { label: "White tee", categories: ["T-Shirts"] },
  { label: "Oxford shirt", categories: ["Shirts"] },
  { label: "Knitwear", categories: ["Sweaters"] },
  { label: "Denim", categories: ["Jeans"] },
  { label: "Tailored trousers", categories: ["Trousers"] },
  { label: "Clean sneakers", categories: ["Sneakers"] },
  { label: "Leather shoes or boots", categories: ["Shoes", "Boots"] },
  { label: "A good jacket", categories: ["Jackets"] },
  { label: "A belt", categories: ["Belts"] },
  { label: "A watch", categories: ["Watches"] },
];

export type ClothingItem = {
  id: string;
  user_id: string;
  name: string;
  image_url: string | null;
  original_image_url: string | null;
  extracted_image_url: string | null;
  refined_image_url: string | null;
  image_processing_status: ProcessingStatus | null;
  image_processing_stage: ProcessingStage | null;
  image_processed_at: string | null;
  category: string;
  brand: string | null;
  color: string | null;
  material: string | null;
  pattern: string | null;
  fit: string | null;
  occasions: string[];
  seasons: string[];
  purchase_price: number | null;
  purchase_date: string | null;
  favorite: boolean;
  notes: string | null;
  wear_count: number;
  last_worn_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  price: number | null;
  store: string | null;
  link: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
};

export type Outfit = {
  id: string;
  user_id: string;
  title: string;
  occasion: string | null;
  score: number | null;
  explanation: string | null;
  item_ids: string[];
  created_at: string;
};

export type CalendarPlan = {
  id: string;
  user_id: string;
  plan_date: string;
  title: string | null;
  occasion: string | null;
  outfit_id: string | null;
  item_ids: string[];
  created_at: string;
};

export type PackingList = {
  id: string;
  user_id: string;
  destination: string;
  weather: string | null;
  duration_days: number;
  trip_type: string | null;
  checklist: { item_id?: string; label: string; note?: string; packed?: boolean }[];
  notes: string | null;
  created_at: string;
};

export const currency = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
