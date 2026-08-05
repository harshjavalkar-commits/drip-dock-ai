import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { AtelierStudio } from "@/components/AtelierStudio";
import { emptyAtelier, type AtelierImages } from "@/lib/atelier";
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

export type ItemFormValues = AtelierImages & {
  name: string;
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
    ...emptyAtelier(),
    name: "",
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
    original_image_url: item.original_image_url ?? item.image_url,
    extracted_image_url: item.extracted_image_url ?? null,
    refined_image_url: item.refined_image_url ?? null,
    image_processing_status: item.image_processing_status ?? "idle",
    image_processing_stage: item.image_processing_stage ?? null,
    image_processed_at: item.image_processed_at ?? null,
    refinement_status: item.refinement_status ?? (item.refined_image_url ? "refined" : "not_started"),
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
    original_image_url: values.original_image_url,
    extracted_image_url: values.extracted_image_url,
    refined_image_url: values.refined_image_url,
    image_processing_status: values.image_processing_status,
    image_processing_stage: values.image_processing_stage,
    image_processed_at: values.image_processed_at,
    refinement_status: values.refinement_status,
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
      <Select {...(value ? { value } : {})} onValueChange={onChange}>
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
  const set = <K extends keyof ItemFormValues>(key: K, v: ItemFormValues[K]) =>
    onChange({ ...values, [key]: v });

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
      <AtelierStudio
        images={{
          image_url: values.image_url,
          original_image_url: values.original_image_url,
          extracted_image_url: values.extracted_image_url,
          refined_image_url: values.refined_image_url,
          image_processing_status: values.image_processing_status,
          image_processing_stage: values.image_processing_stage,
          image_processed_at: values.image_processed_at,
    refinement_status: values.refinement_status,
        }}
        onChange={(next) => onChange({ ...values, ...next })}
        userId={userId}
      />

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

      <Button type="submit" size="lg" disabled={submitting || values.image_processing_status === "processing"} className="w-full rounded-full sm:w-auto">
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
