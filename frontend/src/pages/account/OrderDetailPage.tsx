import { Link, useParams } from "react-router";
import { AccountSection, ListSkeleton, LoadError } from "@/components/account/AccountParts";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { ProductImage } from "@/components/catalog/ProductImage";
import { useFetch } from "@/hooks/useFetch";
import { accountOrderPath } from "@/lib/api";
import { formatDate, formatPrice, orderCode } from "@/lib/format";
import type { OrderDetail } from "@/lib/types";

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const { data: order, error } = useFetch<OrderDetail>(accountOrderPath(id));

  const backLink = (
    <Link to="/account/ordini" className="text-silk underline underline-offset-4 hover:text-primary">
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
  if (!order) return <ListSkeleton />;

  const { customer } = order;

  return (
    <AccountSection title={`Ordine ${orderCode(order.id)}`} action={backLink}>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {formatDate(order.created_at)}
        <OrderStatusBadge status={order.status} />
      </p>

      <ul className="border-t">
        {order.items.map((item) => {
          const image = (
            <ProductImage name={item.name} imageUrl={item.image_url} categorySlug="" />
          );
          return (
            <li key={item.product_id} className="flex items-center gap-4 border-b py-3">
              <div className="w-16 shrink-0">{item.slug ? <Link to={`/prodotti/${item.slug}`}>{image}</Link> : image}</div>
              <div className="min-w-0 flex-1">
                {item.slug ? (
                  <Link to={`/prodotti/${item.slug}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                ) : (
                  <p className="font-medium">{item.name}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {formatPrice(item.unit_price)}
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="text-sm">
          <h2 className="text-silk mb-2 text-muted-foreground">Spedizione a</h2>
          <p className="font-medium">{customer.name}</p>
          <p>{customer.address}</p>
          <p>
            {customer.postal_code} {customer.city} ({customer.province})
          </p>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
        <OrderTotals total={order.total} />
      </div>
    </AccountSection>
  );
}
