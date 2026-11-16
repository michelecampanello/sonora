import { useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LoadMoreProps {
  hasMore: boolean
  loading: boolean
  error: string | undefined
  /** Quanti prodotti sono già in pagina: a ogni nuova pagina si ricontrolla se il fondo è ancora visibile */
  shown: number
  total: number
  onLoadMore: () => void
  onRetry: () => void
}

/**
 * Il fondo del catalogo: quando ci si avvicina, chiede la pagina successiva.
 * Il pulsante resta comunque, per chi naviga con la tastiera e per i browser senza IntersectionObserver.
 */
export function LoadMore({
  hasMore,
  loading,
  error,
  shown,
  total,
  onLoadMore,
  onRetry,
}: LoadMoreProps) {
  const sentinel = useRef<HTMLDivElement>(null)
  // Il callback cambia a ogni render: lo teniamo in un ref per non ricreare l'observer ogni volta
  const loadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    loadMoreRef.current = onLoadMore
  })

  useEffect(() => {
    const element = sentinel.current
    if (!element || !hasMore || typeof IntersectionObserver === "undefined") {
      return
    }
    // Si parte un po' prima del fondo, così i prodotti nuovi sono già lì quando ci si arriva
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current()
      },
      { rootMargin: "800px 0px" }
    )
    // Un observer nuovo segnala subito se il fondo è già visibile:
    // con pagine corte si continua a caricare finché lo schermo non è pieno
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, shown])

  return (
    <div
      ref={sentinel}
      className="flex min-h-12 flex-col items-center justify-center gap-2 text-center"
    >
      {error ? (
        <>
          <p className="text-sm text-muted-foreground">
            Non è stato possibile caricare altri prodotti. {error}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Riprova
          </Button>
        </>
      ) : hasMore ? (
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={onLoadMore}
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Caricamento…" : "Mostra altri prodotti"}
        </Button>
      ) : (
        total > 0 && (
          <p className="text-silk text-muted-foreground tabular-nums">
            {total === 1
              ? "Questo è l'unico prodotto"
              : `Hai visto tutti i ${total} prodotti`}
          </p>
        )
      )}
      <p className="sr-only" aria-live="polite">
        {loading ? "" : `${shown} prodotti su ${total}`}
      </p>
    </div>
  )
}
