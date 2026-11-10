import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const STATUS: Record<OrderStatus, [label: string, led: string]> = {
  pending: ["In lavorazione", "bg-signal"],
  paid: ["Pagato", "bg-led-ok"],
  shipped: ["Spedito", "bg-primary"],
  cancelled: ["Annullato", "bg-destructive"],
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const [label, led] = STATUS[status];
  return (
    <span className="text-silk inline-flex shrink-0 items-center gap-1.5">
      <span aria-hidden className={cn("size-1.5 rounded-full", led)} />
      {label}
    </span>
  );
}
