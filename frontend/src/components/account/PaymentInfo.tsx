import { formatDate } from "@/lib/format";
import type { OrderDetail } from "@/lib/types";

/** Come è stato pagato un ordine, o come si pagherà: nel dettaglio dell'ordine, per il cliente e per l'admin */
export function PaymentInfo({ order }: { order: Pick<OrderDetail, "payment_method" | "paid_at" | "status"> }) {
  const method = order.payment_method === "card" ? "Carta" : "Alla consegna";
  let detail: string;
  if (order.paid_at) {
    detail = `${order.status === "cancelled" && order.payment_method === "card" ? "Rimborsato" : "Pagato"} il ${formatDate(order.paid_at)}`;
  } else if (order.status === "cancelled") {
    detail = "Non pagato";
  } else {
    detail = order.payment_method === "card" ? "In attesa del pagamento" : "Da pagare al corriere";
  }

  return (
    <div className="text-sm">
      <h2 className="text-silk mb-2 text-muted-foreground">Pagamento</h2>
      <p className="font-medium">{method}</p>
      <p className="text-muted-foreground">{detail}</p>
    </div>
  );
}
