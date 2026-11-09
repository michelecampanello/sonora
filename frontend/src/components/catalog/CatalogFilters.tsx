import { useState, type FormEvent, type ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"
import { SortSelect } from "@/components/catalog/SortSelect"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { useFetch } from "@/hooks/useFetch"
import { brandsPath } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Brand, CatalogFilters as Filters } from "@/lib/types"

interface CatalogFiltersProps {
  filters: Filters
  categoryName: string | undefined
  onChange: (changes: Partial<Filters>) => void
  onReset: () => void
}

/** Bottone che apre il menu di un filtro, evidenziato quando il filtro è attivo */
function FilterTrigger({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <PopoverTrigger
      render={
        <Button variant="outline" className={cn(active && "border-primary")} />
      }
    >
      {children}
      <ChevronDown
        data-icon="inline-end"
        className="text-muted-foreground transition-transform group-aria-expanded/button:rotate-180"
      />
    </PopoverTrigger>
  )
}

function priceLabel(min: string | undefined, max: string | undefined): string {
  if (min && max) return `${min} – ${max} €`
  return min ? `Da ${min} €` : `Fino a ${max} €`
}

export function CatalogFilters({
  filters,
  categoryName,
  onChange,
  onReset,
}: CatalogFiltersProps) {
  const { data: brands } = useFetch<Brand[]>(brandsPath)
  const [priceOpen, setPriceOpen] = useState(false)

  const toggleBrand = (id: number, checked: boolean) => {
    const next = checked
      ? [...filters.brands, id]
      : filters.brands.filter((b) => b !== id)
    onChange({ brands: next })
  }

  const applyPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    let min = String(data.get("minPrice") ?? "").trim()
    let max = String(data.get("maxPrice") ?? "").trim()
    // Un intervallo invertito darebbe zero risultati: lo interpretiamo nel verso giusto
    if (min && max && Number(min) > Number(max)) [min, max] = [max, min]
    onChange({ minPrice: min || undefined, maxPrice: max || undefined })
    setPriceOpen(false)
  }

  const hasPrice =
    filters.minPrice !== undefined || filters.maxPrice !== undefined

  const activeFilters: {
    key: string
    label: string
    clear: Partial<Filters>
  }[] = [
    ...(filters.category
      ? [
          {
            key: "category",
            label: categoryName ?? filters.category,
            clear: { category: undefined },
          },
        ]
      : []),
    ...(brands ?? [])
      .filter((brand) => filters.brands.includes(brand.id))
      .map((brand) => ({
        key: `brand-${brand.id}`,
        label: brand.name,
        clear: { brands: filters.brands.filter((b) => b !== brand.id) },
      })),
    ...(hasPrice
      ? [
          {
            key: "price",
            label: priceLabel(filters.minPrice, filters.maxPrice),
            clear: { minPrice: undefined, maxPrice: undefined },
          },
        ]
      : []),
    ...(filters.inStock
      ? [
          {
            key: "inStock",
            label: "Solo disponibili",
            clear: { inStock: false },
          },
        ]
      : []),
  ]

  return (
    <section aria-label="Filtri" className="flex flex-col gap-3 border-y py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <FilterTrigger active={filters.brands.length > 0}>
            Marche
            {filters.brands.length > 0 && (
              <Badge>{filters.brands.length}</Badge>
            )}
          </FilterTrigger>
          <PopoverContent
            align="start"
            aria-label="Filtra per marca"
            className="w-56 p-1.5"
          >
            <div className="flex max-h-72 flex-col overflow-y-auto py-1">
              {brands?.map((brand) => (
                <Label
                  key={brand.id}
                  className="cursor-pointer rounded-md px-2 py-1.5 font-normal hover:bg-muted"
                >
                  <Checkbox
                    checked={filters.brands.includes(brand.id)}
                    onCheckedChange={(checked) =>
                      toggleBrand(brand.id, checked)
                    }
                  />
                  {brand.name}
                </Label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={priceOpen} onOpenChange={setPriceOpen}>
          <FilterTrigger active={hasPrice}>Prezzo</FilterTrigger>
          <PopoverContent
            align="start"
            aria-label="Filtra per prezzo"
            className="w-64 p-3"
          >
            <form onSubmit={applyPrice} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label
                    htmlFor="minPrice"
                    className="text-xs text-muted-foreground"
                  >
                    Da (€)
                  </Label>
                  <Input
                    id="minPrice"
                    name="minPrice"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    defaultValue={filters.minPrice}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label
                    htmlFor="maxPrice"
                    className="text-xs text-muted-foreground"
                  >
                    A (€)
                  </Label>
                  <Input
                    id="maxPrice"
                    name="maxPrice"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    defaultValue={filters.maxPrice}
                  />
                </div>
              </div>
              <Button type="submit">Applica</Button>
            </form>
          </PopoverContent>
        </Popover>

        <Label className="ml-1 h-8 cursor-pointer font-normal">
          <Switch
            size="sm"
            checked={filters.inStock}
            onCheckedChange={(checked) => onChange({ inStock: checked })}
          />
          Solo disponibili
        </Label>

        <div className="ml-auto">
          <SortSelect
            value={filters.sort}
            onChange={(sort) => onChange({ sort })}
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(({ key, label, clear }) => (
            <Button
              key={key}
              variant="secondary"
              size="sm"
              aria-label={`Rimuovi filtro ${label}`}
              onClick={() => onChange(clear)}
            >
              {label}
              <X data-icon="inline-end" />
            </Button>
          ))}
          <Button variant="link" size="sm" onClick={onReset}>
            Azzera filtri
          </Button>
        </div>
      )}
    </section>
  )
}
