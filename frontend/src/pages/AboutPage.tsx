import type { ReactNode } from "react";
import { Link } from "react-router";

const REPOSITORY_URL = "https://github.com/michelecampanello/sonora";

const STACK: [area: string, tools: string][] = [
  ["Frontend", "React 19, TypeScript, Vite, Tailwind CSS, React Router"],
  ["Backend", "Node.js, Express, TypeScript, architettura a livelli (rotte, controller, servizi)"],
  ["Database", "PostgreSQL, con ricerca tollerante agli errori di battitura (pg_trgm)"],
  ["Sicurezza", "Sessioni JWT in cookie httpOnly, password con bcrypt, limite ai tentativi"],
  ["Email", "Resend, per il link di reset della password"],
  ["Test", "Vitest, Supertest e Testing Library, su un database di test separato"],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t pt-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <h2 className="text-silk text-muted-foreground">{title}</h2>
      <div className="flex max-w-2xl flex-col gap-4 text-lg leading-relaxed">{children}</div>
    </section>
  );
}

export function AboutPage() {
  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <title>Chi siamo — Sonora</title>

      <div className="flex flex-col gap-6">
        <h1 className="text-display text-6xl md:text-8xl">Chi siamo</h1>
        <p className="max-w-2xl text-xl leading-relaxed text-muted-foreground">
          Sonora è un progetto portfolio, non un vero negozio. Marche e prodotti sono inventati, gli ordini non vengono spediti
          e nessun pagamento è reale.
        </p>
      </div>

      <Section title="Chi l'ha realizzato">
        <p>
          Sonora è stato realizzato da <strong>Michele Campanello</strong>, utilizzando perlopiù{" "}
          <strong>Claude Code</strong>, l'assistente di programmazione di Anthropic.
        </p>
        <p className="text-muted-foreground">
          Michele ha ideato il progetto e ne ha guidato lo sviluppo, decidendo cosa costruire e in che ordine. Gran parte del
          codice, dei test e della documentazione è stata scritta da Claude Code seguendo le sue indicazioni.
        </p>
      </Section>

      <Section title="Com'è fatto">
        <dl className="grid gap-x-6 gap-y-3 text-base sm:grid-cols-[8rem_minmax(0,1fr)]">
          {STACK.map(([area, tools]) => (
            <div key={area} className="contents">
              <dt className="text-silk pt-0.5 text-muted-foreground">{area}</dt>
              <dd>{tools}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Il codice">
        <p>
          Il codice sorgente è su{" "}
          <a href={REPOSITORY_URL} className="underline underline-offset-4 hover:text-primary">
            GitHub
          </a>
          , insieme a un README che spiega le scelte tecniche e come avviare il progetto in locale.
        </p>
        <p className="text-muted-foreground">
          Intanto puoi provare il negozio:{" "}
          <Link to="/catalogo" className="text-foreground underline underline-offset-4 hover:text-primary">
            sfoglia il catalogo
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
