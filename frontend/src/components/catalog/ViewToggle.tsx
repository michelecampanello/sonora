import { LayoutGrid, List, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CatalogView } from "@/hooks/useCatalogView"
import { cn } from "@/lib/utils"

const OPTIONS: [view: CatalogView, label: string, icon: LucideIcon][] = [
  ["grid", "Griglia", LayoutGrid],
  ["list", "Lista compatta", List],
]

interface ViewToggleProps {
  value: CatalogView
  onChange: (view: CatalogView) => void
}

/** Due interruttori affiancati: quello acceso è la vista attuale */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Vista"
      className="flex rounded-lg border p-0.5"
    >
      {OPTIONS.map(([view, label, Icon]) => (
        <Button
          key={view}
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={value === view}
          title={label}
          onClick={() => onChange(view)}
          className={cn(
            "text-muted-foreground",
            value === view && "bg-muted text-foreground"
          )}
        >
          <Icon />
        </Button>
      ))}
    </div>
  )
}
