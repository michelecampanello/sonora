import { Link, useSearchParams } from "react-router";
import { AccountSection, EmptyState, ListSkeleton, LoadError } from "@/components/account/AccountParts";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { Pagination } from "@/components/catalog/Pagination";
import { useFetch } from "@/hooks/useFetch";
import { accountOrdersPath } from "@/lib/api";
import { formatDate, formatPrice, orderCode } from "@/lib/format";
import type { OrderSummary, Paginated } from "@/lib/types";

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get("page"));
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const { data, error } = useFetch<Paginated<OrderSummary>>(accountOrdersPath(page));

  return (
    <AccountSection title="Ordini">
      {error ? (
        <LoadError message={error} />
      ) : !data ? (
        <ListSkeleton />
      ) : data.total === 0 ? (
        <EmptyState>
          Non hai ancora fatto ordini.{" "}
          <Link to="/catalogo" className="text-foreground underline underline-offset-4 hover:text-primary">
            Vai al catalogo
          </Link>
        </EmptyState>
      ) : (
        <>
          <ul className="border-t">
            {data.items.map((order) => (
              <li key={order.id} className="border-b">
                <Link
                  to={`/account/ordini/${order.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 p-3 transition-colors hover:bg-muted md:grid-cols-[8rem_minmax(0,1fr)_auto_7rem]"
                >
                  <span className="font-medium tabular-nums">{orderCode(order.id)}</span>
                  <span className="col-start-1 row-start-2 text-sm text-muted-foreground md:col-start-2 md:row-start-1">
                    {formatDate(order.created_at)} · {order.item_count} {order.item_count === 1 ? "articolo" : "articoli"}
                  </span>
                  <span className="col-start-2 row-start-1 justify-self-end md:col-start-3">
                    <OrderStatusBadge status={order.status} />
                  </span>
                  <span className="col-start-2 row-start-2 justify-self-end font-medium tabular-nums md:col-start-4 md:row-start-1">
                    {formatPrice(order.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} onChange={(next) => setParams({ page: String(next) })} />
        </>
      )}
    </AccountSection>
  );
}
