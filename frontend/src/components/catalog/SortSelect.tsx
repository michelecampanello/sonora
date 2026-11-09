import { SORT_OPTIONS, type SortKey } from "@/lib/types";

interface SortSelectProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

const isSortKey = (value: string): value is SortKey => value in SORT_OPTIONS;

// Usiamo il <select> nativo: su mobile apre il selettore del sistema ed è accessibile senza sforzo.
export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-silk text-muted-foreground">Ordina per</span>
      <select
        value={value}
        onChange={(e) => {
          if (isSortKey(e.target.value)) onChange(e.target.value);
        }}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {Object.entries(SORT_OPTIONS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
