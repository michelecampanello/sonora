import { useState } from "react";
import { Link, useParams } from "react-router";
import { AccountSection, FormError, ListSkeleton, LoadError } from "@/components/account/AccountParts";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { OrderTotals } from "@/components/cart/OrderTotals";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/useFetch";
import { adminOrderPath, adminOrderStatusPath, sendJson } from "@/lib/api";
import { formatDate, formatPrice, orderCode } from "@/lib/format";
import type { AdminOrderDetail, OrderStatus } from "@/lib/types";

const ACTIONS: Record<OrderStatus, string> = {
  // Oggi il backend non permette di tornare «in lavorazione»: l'etichetta c'è perché il tipo la richiede
  pending: "Rimetti in lavorazione",
  shipped: "Segna come spedito",
  paid: "Segna come consegnato e pagato",
  cancelled: "Annulla ordine",
};

type StatusChange = Pick<AdminOrderDetail, "status" | "next_statuses">;

export function AdminOrderDetailPage() {
  const { id = "" } = useParams();
  const { data, error } = useFetch<AdminOrderDetail>(adminOrderPath(id));
  // Dopo un cambio di stato si mostra la risposta del server, senza ricaricare tutto l'ordine
  const [changed, setChanged] = useState<StatusChange>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const backLink = (
    <Link to="/admin/ordini" className="text-silk underline underline-offset-4 hover:text-primary">
      Tutti gli ordini
    </Link>
  );

  if (error) {
    return (
      <AccountSection title="Ordine" action={backLink}>
        <LoadError message={error} />
      </AccountSection>
    );
  }
  if (!data) return <ListSkeleton />;

  const order = { ...data, ...changed };
  const { customer } = order;

  const changeStatus = async (status: OrderStatus) => {
    setSaving(true);
    setSaveError(undefined);
    try {
      const { status: saved, next_statuses } = await sendJson<StatusChange>("PATCH", adminOrderStatusPath(order.id), { status });
      setChanged({ status: saved, next_statuses });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountSection title={`Ordine ${orderCode(order.id)}`} action={backLink}>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {formatDate(order.created_at)}
        <OrderStatusBadge status={order.status} />
      </p>

      {order.next_statuses.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {order.next_statuses.map((next) =>
            next === "cancelled" ? (
              <AlertDialog key={next}>
                <AlertDialogTrigger render={<Button variant="destructive" disabled={saving} />}>{ACTIONS[next]}</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annullare l'ordine {orderCode(order.id)}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Gli articoli tornano in magazzino. Un ordine annullato non si può riaprire.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Indietro</AlertDialogCancel>
                    <AlertDialogCancel variant="destructive" onClick={() => void changeStatus(next)}>
                      Annulla ordine
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button key={next} disabled={saving} onClick={() => void changeStatus(next)}>
                {ACTIONS[next]}
              </Button>
            ),
          )}
        </div>
      )}
      <FormError message={saveError} />

      <ul className="border-t">
        {order.items.map((item) => (
          <li key={item.product_id} className="flex items-center justify-between gap-4 border-b py-3">
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.quantity} × {formatPrice(item.unit_price)}
              </p>
            </div>
            <span className="shrink-0 font-medium tabular-nums">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="text-sm">
          <h2 className="text-silk mb-2 text-muted-foreground">Spedire a</h2>
          <p className="font-medium">{customer.name}</p>
          <p>{customer.address}</p>
          <p>
            {customer.postal_code} {customer.city} ({customer.province})
          </p>
          <a href={`mailto:${customer.email}`} className="text-muted-foreground underline underline-offset-4 hover:text-primary">
            {customer.email}
          </a>
        </div>
        <OrderTotals total={order.total} />
      </div>
    </AccountSection>
  );
}
