import { Outlet } from "react-router";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Sonora — progetto portfolio. Prodotti e marche sono di fantasia.
      </footer>
    </div>
  );
}
