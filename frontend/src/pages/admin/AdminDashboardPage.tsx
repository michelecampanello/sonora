import type { ReactNode } from "react";
import { Link } from "react-router";
import { AccountSection, ListSkeleton, LoadError } from "@/components/account/AccountParts";
import { useFetch } from "@/hooks/useFetch";
import { adminStatsPath } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { AdminStats } from "@/lib/types";

function StatTile({ label, value, to, hint }: { label: string; value: ReactNode; to: string; hint: string }) {
  return (
    <Link to={to} className="flex flex-col gap-2 border p-5 transition-colors hover:border-foreground">
      <span className="text-silk text-muted-foreground">{label}</span>
      <span className="text-display text-5xl tabular-nums">{value}</span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </Link>
  );
}

export function AdminDashboardPage() {
  const { data: stats, error } = useFetch<AdminStats>(adminStatsPath);

  return (
    <AccountSection title="Panoramica">
      {error ? (
        <LoadError message={error} />
      ) : !stats ? (
        <ListSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Da spedire" value={stats.orders.pending} to="/admin/ordini?status=pending" hint="Ordini in lavorazione" />
          <StatTile label="In consegna" value={stats.orders.shipped} to="/admin/ordini?status=shipped" hint="Da incassare alla consegna" />
          <StatTile label="Incassato" value={formatPrice(stats.revenue)} to="/admin/ordini?status=paid" hint={`${stats.orders.paid} ordini pagati`} />
          <StatTile
            label="Quasi esauriti"
            value={stats.lowStockProducts}
            to="/admin/prodotti?lowStock=true"
            hint={`Su ${stats.activeProducts} prodotti in vendita`}
          />
        </div>
      )}
    </AccountSection>
  );
}
