import { useEffect, type ReactNode } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { clearCart } from "@/hooks/useCart";
import { useFetch } from "@/hooks/useFetch";
import { checkoutResultPath } from "@/lib/api";
import { formatPrice, orderCode } from "@/lib/format";
import type { CardOrderStatus, OrderConfirmation } from "@/lib/types";
import { PageMeta } from "@/components/PageMeta";

/**
 * Ci si arriva in due modi:
 * - dal checkout, con l'ordine nello stato della navigazione (pagamento alla consegna)
 * - da Stripe dopo aver pagato con carta, con ?session_id=… nell'indirizzo: l'ordine si chiede al server
 */
export function OrderConfirmedPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  // Senza login non esiste una rotta che legga un ordine dal suo id, altrimenti chiunque abbia l'id
  // potrebbe vedere i dati di spedizione del cliente: l'ordine arriva dalla navigazione o dalla sessione di Stripe.
  const { state } = useLocation();
  const order = (state as { order?: OrderConfirmation } | null)?.order;

  if (sessionId) return <CardPaymentResult sessionId={sessionId} />;
  if (!order) return <Navigate to="/catalogo" replace />;
  return <Confirmation order={order} />;
}

function CardPaymentResult({ sessionId }: { sessionId: string }) {
  const { data, error, reload, loading } = useFetch<CardOrderStatus>(checkoutResultPath(sessionId));
  const paid = data?.paid === true;

  // Solo a pagamento ricevuto: se il cliente torna indietro senza aver pagato, il carrello gli serve ancora
  useEffect(() => {
    if (paid) clearCart();
  }, [paid]);

  if (error) {
    return (
      <Outcome icon={<XCircle />} title="Ordine non trovato">
        <p>Non riusciamo a leggere questo pagamento ({error}). Se ti è stato addebitato, riceverai la conferma per email.</p>
      </Outcome>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4" aria-busy="true">
        <PageMeta title="Verifica del pagamento" noindex />
        <p className="text-center text-muted-foreground">Verifica del pagamento…</p>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (paid) return <Confirmation order={data.order} />;

  if (data.status === "cancelled") {
    return (
      <Outcome icon={<XCircle />} title="Pagamento non completato">
        <p>L'ordine è stato annullato e non ti è stato addebitato nulla. Gli articoli sono ancora nel carrello.</p>
        <Link to="/carrello" className={buttonVariants({ className: "self-center" })}>
          Torna al carrello
        </Link>
      </Outcome>
    );
  }

  // Stripe ci ha rimandato qui, ma la conferma del pagamento non è ancora arrivata: capita per pochi secondi
  return (
    <Outcome icon={<Clock />} title="Pagamento in verifica">
      <p>Stiamo aspettando la conferma da Stripe. Di solito servono pochi secondi.</p>
      <Button variant="outline" className="self-center" disabled={loading} onClick={reload}>
        Controlla di nuovo
      </Button>
    </Outcome>
  );
}

function Outcome({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center [&_svg]:size-10 [&_svg]:text-muted-foreground">
      <PageMeta title={title} noindex />
      <span aria-hidden>{icon}</span>
      <h1 className="text-display text-5xl md:text-7xl">{title}</h1>
      <div className="flex flex-col gap-4 text-lg text-muted-foreground">{children}</div>
    </div>
  );
}

function Confirmation({ order }: { order: OrderConfirmation }) {
  const { customer } = order;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageMeta title="Ordine confermato" noindex />

      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-10 text-primary" strokeWidth={1.5} aria-hidden />
        <h1 className="text-display text-5xl md:text-7xl">Ordine {orderCode(order.id)} confermato</h1>
        <p className="text-lg text-muted-foreground">
          Grazie {customer.name}!{" "}
          {order.payment_method === "card" ? "Abbiamo ricevuto il pagamento con carta." : "Pagherai al corriere alla consegna."}
        </p>
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
