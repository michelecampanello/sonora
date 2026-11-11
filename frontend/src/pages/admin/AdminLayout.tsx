import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { NotFoundPage } from "@/pages/NotFoundPage";

const LINKS = [
  ["/admin", "Panoramica", true],
  ["/admin/ordini", "Ordini", false],
  ["/admin/prodotti", "Prodotti", false],
] as const;

const LINK =
  "text-silk shrink-0 border-b-2 border-transparent py-1 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-signal aria-[current=page]:text-foreground lg:border-b-0 lg:border-l-2 lg:pl-3";

/**
 * Questo controllo serve solo all'esperienza d'uso: chi non è admin non vede pagine vuote o errori.
 * I dati sono protetti dal backend, che risponde 403 a chiunque non sia admin.
 */
export function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!user) return <Navigate to="/accedi" replace state={{ from: `${location.pathname}${location.search}` }} />;
  // Per chi non è admin il pannello semplicemente non esiste
  if (user.role !== "admin") return <NotFoundPage />;

  return (
    <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
      <aside className="flex min-w-0 flex-col gap-4">
        <p className="text-silk text-signal">Pannello admin</p>
        <nav aria-label="Pannello admin" className="flex gap-5 overflow-x-auto lg:flex-col lg:gap-3 lg:overflow-visible">
          {LINKS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={LINK}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <Outlet />
    </div>
  );
}
