import { Link, Navigate, useLocation } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { OrderConfirmation } from "@/lib/types";

export function OrderConfirmedPage() {
  // L'ordine arriva dal checkout tramite lo stato della navigazione: senza login
  // non esiste una rotta che legga un ordine, altrimenti chiunque abbia l'id
  // potrebbe vedere i dati di spedizione del cliente.
  const { state } = useLocation();
  const order = (state as { order?: OrderConfirmation } | null)?.order;
  if (!order) return <Navigate to="/catalogo" replace />;

  const { customer } = order;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <title>Ordine confermato — Sonora</title>

      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-10 text-primary" strokeWidth={1.5} aria-hidden />
        <h1 className="text-display text-5xl md:text-7xl">Ordine {order.id.slice(0, 8).toUpperCase()} confermato</h1>
        <p className="text-lg text-muted-foreground">Grazie {customer.name}! Pagherai al corriere alla consegna.</p>
      </div>

      <Card className="panel">
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {order.items.map((item) => (
              <li key={item.product_id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {item.quantity} × {item.name}
                </span>
                <span className="shrink-0">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <OrderTotals total={order.total} />
          <div className="text-sm">
            <h2 className="font-semibold">Spedizione a</h2>
            <p className="text-muted-foreground">
              {customer.address}, {customer.postal_code} {customer.city} ({customer.province})
            </p>
          </div>
        </CardContent>
      </Card>

      <Link to="/catalogo" className={buttonVariants({ variant: "outline", className: "self-center" })}>
        Continua gli acquisti
      </Link>
    </div>
  );
}
