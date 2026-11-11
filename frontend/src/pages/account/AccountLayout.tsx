import { Navigate, Outlet, useLocation } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

/**
 * Le pagine dell'area personale. Si naviga tra le sezioni dal menu dell'account nell'header
 * (components/layout/AccountMenu): qui resta solo il controllo dell'accesso.
 */
export function AccountLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!user) return <Navigate to="/accedi" replace state={{ from: `${location.pathname}${location.search}` }} />;

  return <Outlet />;
}
