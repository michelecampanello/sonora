import { cn } from "@/lib/utils";

/** Disponibilità come spia luminosa: verde, ottone lampeggiante quando sta finendo, rosso se esaurito */
export function StockBadge({ stock }: { stock: number }) {
  const [label, led] =
    stock === 0
      ? ["Non disponibile", "bg-destructive"]
      : stock <= 5
        ? [`Ultimi ${stock} pezzi`, "led-blink bg-signal"]
        : ["Disponibile", "bg-led-ok"];

  return (
    <span className="text-silk inline-flex shrink-0 items-center gap-1.5">
      <span aria-hidden className={cn("size-1.5 rounded-full", led)} />
      {label}
    </span>
  );
}
