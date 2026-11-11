import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <title>Pagina non trovata — Sonora</title>
      <p aria-hidden className="text-display text-[clamp(9rem,34vw,26rem)] text-primary">
        404
      </p>
      <h1 className="text-display text-5xl md:text-7xl">Pagina non trovata</h1>
      <p className="text-lg text-muted-foreground">La pagina che cerchi non esiste o è stata spostata.</p>
      <Link to="/catalogo" className="text-silk underline underline-offset-4 hover:text-primary">
        Torna al catalogo
      </Link>
    </div>
  );
}
