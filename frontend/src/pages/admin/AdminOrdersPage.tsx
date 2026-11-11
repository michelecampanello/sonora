import { Link, useSearchParams } from "react-router";
import { AccountSection, EmptyState, ListSkeleton, LoadError } from "@/components/account/AccountParts";
import { OrderStatusBadge, STATUS_LABELS } from "@/components/account/OrderStatusBadge";
import { Pagination } from "@/components/catalog/Pagination";
import { useFetch } from "@/hooks/useFetch";
import { adminOrdersPath } from "@/lib/api";
import { formatDate, formatPrice, orderCode } from "@/lib/format";
import { ORDER_STATUSES, type AdminOrderSummary, type OrderStatus, type Paginated } from "@/lib/types";

const isOrderStatus = (value: string | null): value is OrderStatus =>
  value !== null && (ORDER_STATUSES as readonly string[]).includes(value);

const FILTER =
  "text-silk shrink-0 border-b-2 border-transparent py-1 text-muted-foreground transition-colors hover:text-foreground aria-[current=true]:border-signal aria-[current=true]:text-foreground";

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const status = isOrderStatus(statusParam) ? statusParam : undefined;
  const requested = Number(params.get("page"));
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const { data, error } = useFetch<Paginated<AdminOrderSummary>>(adminOrdersPath({ status, page }));

  const filters: [OrderStatus | undefined, string][] = [[undefined, "Tutti"], ...ORDER_STATUSES.map((s) => [s, STATUS_LABELS[s]] as [OrderStatus, string])];

  return (
    <AccountSection title="Ordini">
      <nav aria-label="Filtra per stato" className="flex gap-5 overflow-x-auto">
        {filters.map(([value, label]) => (
          <Link key={label} to={value ? `/admin/ordini?status=${value}` : "/admin/ordini"} aria-current={value === status} className={FILTER}>
            {label}
          </Link>
        ))}
      </nav>

      {error ? (
        <LoadError message={error} />
      ) : !data ? (
        <ListSkeleton />
      ) : data.total === 0 ? (
        <EmptyState>Nessun ordine{status ? ` in questo stato` : ""}.</EmptyState>
      ) : (
        <>
          <ul className="border-t">
            {data.items.map((order) => (
              <li key={order.id} className="border-b">
                <Link
                  to={`/admin/ordini/${order.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 p-3 transition-colors hover:bg-muted md:grid-cols-[7rem_minmax(0,1fr)_9rem_7rem]"
                >
                  <span className="font-medium tabular-nums">{orderCode(order.id)}</span>
                  <span className="col-start-1 row-start-2 min-w-0 text-sm text-muted-foreground md:col-start-2 md:row-start-1">
                    <span className="text-foreground">{order.customer_name}</span>
                    {order.user_id ? "" : " (ospite)"} · {formatDate(order.created_at)} · {order.item_count}{" "}
                    {order.item_count === 1 ? "articolo" : "articoli"}
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
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(next) => setParams({ ...(status ? { status } : {}), page: String(next) })}
          />
        </>
      )}
    </AccountSection>
  );
}
