import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <title>Pagina non trovata — Sonora</title>
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="text-muted-foreground">La pagina che cerchi non esiste o è stata spostata.</p>
      <Link to="/catalogo" className="underline underline-offset-4">
        Torna al catalogo
      </Link>
    </div>
  );
}
