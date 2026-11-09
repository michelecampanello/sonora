import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";

interface FetchState<T> {
  path: string | null; // a quale richiesta si riferiscono data/error
  data?: T;
  error?: string;
}

export interface UseFetchResult<T> {
  /** Dati della richiesta corrente (undefined finché non arrivano) */
  data: T | undefined;
  /** Ultimi dati ricevuti, anche se di una richiesta precedente: utili per non far "sparire" la pagina durante il caricamento */
  previousData: T | undefined;
  error: string | undefined;
  loading: boolean;
}

/**
 * Carica i dati da `path` e li ricarica ogni volta che `path` cambia.
 * Se `path` cambia prima che la risposta arrivi, la richiesta vecchia viene annullata:
 * così una risposta lenta non sovrascrive quella più recente.
 */
export function useFetch<T>(path: string | null): UseFetchResult<T> {
  const [state, setState] = useState<FetchState<T>>({ path: null });

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();

    fetchJson<T>(path, controller.signal)
      .then((data) => setState({ path, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return; // annullata da noi: non è un errore
        const message = err instanceof Error ? err.message : "Errore imprevisto";
        setState((prev) => ({ path, data: prev.data, error: message }));
      });

    return () => controller.abort();
  }, [path]);

  // "loading" non è uno stato separato: lo ricaviamo confrontando la richiesta attuale con l'ultima completata.
  const isCurrent = state.path === path;
  return {
    data: isCurrent && !state.error ? state.data : undefined,
    previousData: state.data,
    error: isCurrent ? state.error : undefined,
    loading: path !== null && !isCurrent,
  };
}
