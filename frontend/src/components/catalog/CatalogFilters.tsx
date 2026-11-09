import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useFetch } from "@/hooks/useFetch";
import { brandsPath } from "@/lib/api";
import type { Brand, CatalogFilters as Filters } from "@/lib/types";

interface CatalogFiltersProps {
  filters: Filters;
  onChange: (changes: Partial<Filters>) => void;
  onReset: () => void;
}

export function CatalogFilters({ filters, onChange, onReset }: CatalogFiltersProps) {
  const { data: brands } = useFetch<Brand[]>(brandsPath);

  const toggleBrand = (id: number, checked: boolean) => {
    const next = checked ? [...filters.brands, id] : filters.brands.filter((b) => b !== id);
    onChange({ brands: next });
  };

  const applyPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const min = String(data.get("minPrice") ?? "").trim();
    const max = String(data.get("maxPrice") ?? "").trim();
    onChange({ minPrice: min || undefined, maxPrice: max || undefined });
  };

  const hasActiveFilters =
    filters.category !== undefined ||
    filters.brands.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="filter-brands">
        <h2 id="filter-brands" className="mb-3 text-sm font-semibold">
          Marche
        </h2>
        <div className="flex flex-col gap-2.5">
          {brands?.map((brand) => {
            const id = `brand-${brand.id}`;
            return (
              <div key={brand.id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={filters.brands.includes(brand.id)}
                  onCheckedChange={(checked) => toggleBrand(brand.id, checked === true)}
                />
                <Label htmlFor={id} className="font-normal">
                  {brand.name}
                </Label>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      <section aria-labelledby="filter-price">
        <h2 id="filter-price" className="mb-3 text-sm font-semibold">
          Prezzo (€)
        </h2>
        {/* key: quando i prezzi nell'URL cambiano (es. "Azzera filtri"), il form si ricrea con i nuovi valori */}
        <form
          key={`${filters.minPrice}-${filters.maxPrice}`}
          onSubmit={applyPrice}
          className="flex items-end gap-2"
        >
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="minPrice" className="text-xs text-muted-foreground">
              Da
            </Label>
            <Input id="minPrice" name="minPrice" type="number" min={0} inputMode="numeric" defaultValue={filters.minPrice} />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">
              A
            </Label>
            <Input id="maxPrice" name="maxPrice" type="number" min={0} inputMode="numeric" defaultValue={filters.maxPrice} />
          </div>
          <Button type="submit" variant="outline">
            Applica
          </Button>
        </form>
      </section>

      <Separator />

      <div className="flex items-center gap-2">
        <Checkbox
          id="inStock"
          checked={filters.inStock}
          onCheckedChange={(checked) => onChange({ inStock: checked === true })}
        />
        <Label htmlFor="inStock" className="font-normal">
          Solo disponibili
        </Label>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={onReset} className="self-start">
          Azzera filtri
        </Button>
      )}
    </div>
  );
}
