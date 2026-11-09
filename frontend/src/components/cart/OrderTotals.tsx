import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";

export function OrderTotals({ total }: { total: string | number }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotale</dt>
        <dd>{formatPrice(total)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Spedizione</dt>
        <dd>Gratuita</dd>
      </div>
      <Separator />
      <div className="flex justify-between text-base font-semibold">
        <dt>Totale</dt>
        <dd>{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}
