import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logout, useAuth } from "@/hooks/useAuth";

const LINKS = [
  ["/account/ordini", "Ordini"],
  ["/account/indirizzi", "Indirizzi"],
  ["/account/pagamenti", "Pagamenti"],
  ["/account/impostazioni", "Impostazioni"],
] as const;

const LINK =
  "text-silk shrink-0 border-b-2 border-transparent py-1 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-signal aria-[current=page]:text-foreground lg:border-b-0 lg:border-l-2 lg:pl-3";

export function AccountLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [logoutFailed, setLogoutFailed] = useState(false);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!user) return <Navigate to="/accedi" replace state={{ from: `${location.pathname}${location.search}` }} />;

    const signOut = () => {
      setLogoutFailed(false);
      logout().catch(() => setLogoutFailed(true));
    };
  return (
    <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
      <aside className="flex min-w-0 flex-col gap-4">
        <p className="text-silk truncate text-muted-foreground">{user.name}</p>
        <nav aria-label="Area personale" className="flex gap-5 overflow-x-auto lg:flex-col lg:gap-3 lg:overflow-visible">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} className={LINK}>
              {label}
            </NavLink>
          ))}
          
          <Button variant="destructive" onClick={signOut}>
            {logoutFailed ? "Uscita non riuscita, riprova" : "Esci"}
          </Button>
        </nav>
      </aside>
      <Outlet />
    </div>
  );
}
