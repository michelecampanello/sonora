import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface AuthFormProps {
  title: string;
  submitLabel: string;
  switchText: string;
  switchLabel: string;
  switchTo: string;
  /** Lancia un errore con il messaggio da mostrare se l'operazione fallisce */
  onSubmit: (data: FormData) => Promise<void>;
  children: ReactNode;
  /** Per le pagine utili anche a chi ha già una sessione aperta, come il reset della password */
  allowSignedIn?: boolean;
}

export function AuthForm({ title, submitLabel, switchText, switchLabel, switchTo, onSubmit, children, allowSignedIn }: AuthFormProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const notice = (location.state as { notice?: string } | null)?.notice;

  // Chi ha già una sessione, o l'ha appena avviata, torna alla pagina da cui è arrivato
  if (user && !allowSignedIn) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      await onSubmit(new FormData(event.currentTarget));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <title>{`${title} — Sonora`}</title>
      <h1 className="text-display text-6xl md:text-8xl">{title}</h1>

      {notice && (
        <p role="status" className="border border-border p-3 text-sm">
          {notice}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4 border-t pt-6">
        {children}

        {error && (
          <p role="alert" className="border border-signal p-3 text-sm text-signal">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitLabel}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {switchText}{" "}
        {/* state: chi passa da accesso a registrazione non perde la pagina a cui tornare */}
        <Link to={switchTo} state={location.state} className="text-foreground underline underline-offset-4 hover:text-primary">
          {switchLabel}
        </Link>
      </p>
    </div>
  );
}
