import { useState } from "react"
import { Star } from "lucide-react"
import { formatRating } from "@/lib/format"
import { cn } from "@/lib/utils"

const FIVE = [1, 2, 3, 4, 5] as const

const row = (className: string) => (
  <span className={cn("flex", className)}>
    {FIVE.map((n) => (
      <Star key={n} fill="currentColor" strokeWidth={0} className="shrink-0" />
    ))}
  </span>
)

/**
 * Un voto da 0 a 5 a stelline, anche con i decimali (4,3 riempie un terzo della quinta stella).
 * Le stelle accese sono in ottone, come le spie del banco regia.
 */
export function Stars({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={`${formatRating(value)} stelle su 5`}
      className={cn("relative inline-flex [&_svg]:size-4", className)}
    >
      {row("text-muted-foreground/30")}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${(Math.min(5, Math.max(0, value)) / 5) * 100}%` }}
      >
        {row("text-signal")}
      </span>
    </span>
  )
}

/** Scelta del voto: cinque radio nascosti dietro le stelle, si usano anche da tastiera con le frecce */
export function StarInput({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const [hover, setHover] = useState(0)
  const shown = hover || value

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">Il tuo voto</legend>
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {FIVE.map((n) => (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer p-0.5 has-focus-visible:outline-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              required
              className="sr-only"
            />
            <span className="sr-only">
              {n === 1 ? "1 stella" : `${n} stelle`}
            </span>
            <Star
              aria-hidden
              fill="currentColor"
              strokeWidth={0}
              className={cn(
                "size-7 transition-colors",
                n <= shown ? "text-signal" : "text-muted-foreground/30"
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
