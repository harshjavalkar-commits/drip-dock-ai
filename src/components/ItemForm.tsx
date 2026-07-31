import { useState } from "react";
import { Loader2, Upload as UploadIcon, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSignedUrl } from "@/components/ItemImage";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  COLORS,
  FITS,
  MATERIALS,
  OCCASIONS,
  PATTERNS,
  SEASONS,
  type ClothingItem,
} from "@/lib/wardrobe";

export type ItemFormValues = {
  name: string;
  image_url: string | null;
  category: string;
  brand: string;
  color: string;
  material: string;
  pattern: string;
  fit: string;
  occasions: string[];
  seasons: string[];
  purchase_price: string;
  purchase_date: string;
  favorite: boolean;
  notes: string;
};

export function emptyItem(): ItemFormValues {
  return {
    name: "",
    image_url: null,
    category: "T-Shirts",
    brand: "",
    color: "",
    material: "",
    pattern: "",
    fit: "",
    occasions: [],
    seasons: [],
    purchase_price: "",
    purchase_date: "",
    favorite: false,
    notes: "",
  };
}

export function toFormValues(item: ClothingItem): ItemFormValues {
  return {
    name: item.name,
    image_url: item.image_url,
    category: item.category,
    brand: item.brand ?? "",
    color: item.color ?? "",
    material: item.material ?? "",
    pattern: item.pattern ?? "",
    fit: item.fit ?? "",
    occasions: item.occasions ?? [],
    seasons: item.seasons ?? [],
    purchase_price: item.purchase_price != null ? String(item.purchase_price) : "",
    purchase_date: item.purchase_date ?? "",
    favorite: item.favorite,
    notes: item.notes ?? "",
  };
}

export function toPayload(values: ItemFormValues, userId: string) {
  return {
    user_id: userId,
    name: values.name.trim(),
    image_url: values.image_url,
    category: values.category,
    brand: values.brand.trim() || null,
    color: values.color || null,
    material: values.material || null,
    pattern: values.pattern || null,
    fit: values.fit || null,
    occasions: values.occasions,
    seasons: values.seasons,
    purchase_price: values.purchase_price ? Number(values.purchase_price) : null,
    purchase_date: values.purchase_date || null,
    favorite: values.favorite,
    notes: values.notes.trim() || null,
  };
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() =>
              onChange(active ? value.filter((v) => v !== option) : [...value, option])
            }
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Picker({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="rounded-lg bg-card">
          <SelectValue placeholder={placeholder ?? "Select"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ItemForm({
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  userId,
}: {
  values: ItemFormValues;
  onChange: (next: ItemFormValues) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  userId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const { data: previewUrl } = useSignedUrl(values.image_url);
  const set = <K extends keyof ItemFormValues>(key: K, v: ItemFormValues[K]) =>
    onChange({ ...values, [key]: v });

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("wardrobe").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error("Upload failed", { description: error.message });
      return;
    }
    set("image_url", path);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.name.trim()) {
          toast.error("Give the piece a name");
          return;
        }
        onSubmit();
      }}
      className="space-y-8"
    >
      <div className="surface overflow-hidden p-5 sm:p-6">
        <span className="eyebrow">Photo</span>
        <div className="mt-4 grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-dashed border-border bg-muted">
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Item preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set("image_url", null)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground shadow-sm"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UploadIcon className="h-5 w-5" strokeWidth={1.5} />
                )}
                <span className="text-xs">{uploading ? "Uploading…" : "No photo yet"}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              A clean photo on a plain background helps the stylist read colour and texture.
            </p>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent">
              <UploadIcon className="h-4 w-4" strokeWidth={1.5} />
              {values.image_url ? "Replace photo" : "Choose photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="surface p-5 sm:p-6">
        <span className="eyebrow">Details</span>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={values.name}
              maxLength={120}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ecru heavyweight tee"
              className="rounded-lg bg-card"
            />
          </div>
          <Picker
            label="Category"
            options={CATEGORIES}
            value={values.category}
            onChange={(v) => set("category", v)}
          />
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={values.brand}
              maxLength={80}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="COS"
              className="rounded-lg bg-card"
            />
          </div>
          <Picker
            label="Colour"
            options={COLORS}
            value={values.color}
            onChange={(v) => set("color", v)}
          />
          <Picker
            label="Material"
            options={MATERIALS}
            value={values.material}
            onChange={(v) => set("material", v)}
          />
          <Picker
            label="Pattern"
            options={PATTERNS}
            value={values.pattern}
            onChange={(v) => set("pattern", v)}
          />
          <Picker label="Fit" options={FITS} value={values.fit} onChange={(v) => set("fit", v)} />
          <div className="space-y-2">
            <Label htmlFor="price">Purchase price</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={values.purchase_price}
              onChange={(e) => set("purchase_price", e.target.value)}
              placeholder="79"
              className="rounded-lg bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Purchase date</Label>
            <Input
              id="date"
              type="date"
              value={values.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)}
              className="rounded-lg bg-card"
            />
          </div>
        </div>
      </div>

      <div className="surface space-y-6 p-5 sm:p-6">
        <div>
          <span className="eyebrow">Occasions</span>
          <div className="mt-3">
            <Chips
              options={OCCASIONS}
              value={values.occasions}
              onChange={(v) => set("occasions", v)}
            />
          </div>
        </div>
        <div>
          <span className="eyebrow">Seasons</span>
          <div className="mt-3">
            <Chips options={SEASONS} value={values.seasons} onChange={(v) => set("seasons", v)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={values.notes}
            maxLength={1000}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Runs slightly large, best with tailored trousers."
            className="min-h-24 rounded-lg bg-card"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
          <div>
            <p className="text-sm font-medium">Favorite</p>
            <p className="text-xs text-muted-foreground">Prioritised by the stylist</p>
          </div>
          <Switch checked={values.favorite} onCheckedChange={(v) => set("favorite", v)} />
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting || uploading} className="w-full rounded-full sm:w-auto">
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
