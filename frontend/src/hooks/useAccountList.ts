import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";

/**
 * Un elenco dell'area personale. Ogni modifica risponde con l'elenco aggiornato,
 * che prende il posto di quello caricato all'apertura della pagina.
 */
export function useAccountList<T>(path: string) {
  const { data, error } = useFetch<T[]>(path);
  const [updated, setUpdated] = useState<T[]>();
  const [actionError, setActionError] = useState<string>();
  const [busy, setBusy] = useState(false);

  /** Esegue la modifica e dice se è andata a buon fine; in caso contrario imposta actionError */
  const run = async (request: () => Promise<T[]>): Promise<boolean> => {
    setBusy(true);
    setActionError(undefined);
    try {
      setUpdated(await request());
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Errore imprevisto");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { items: updated ?? data, error, actionError, busy, run };
}
