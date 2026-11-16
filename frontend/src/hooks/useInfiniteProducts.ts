import { useEffect, useState } from "react"
import { fetchJson, productsPath } from "@/lib/api"
import type { CatalogFilters, Paginated, ProductSummary } from "@/lib/types"

type Filters = Omit<CatalogFilters, "page">

interface Loaded {
  /** Indirizzo della prima pagina: identifica la ricerca (filtri + ordinamento) */
  key: string
  items: ProductSummary[]
  /** Fin dove siamo arrivati */
  page: number
  pages: number
  total: number
}

interface Failure {
  path: string
  attempt: number
  message: string
}

/**
 * L'ultima ricerca caricata, tenuta in memoria finché la scheda resta aperta.
 * Aprendo un prodotto e tornando indietro si ritrovano tutti i prodotti già scorsi,
 * invece di ripartire dai primi dodici.
 */
let lastLoaded: Loaded | null = null

/** Dimentica i prodotti tenuti in memoria (per i test, che devono partire da zero) */
export function forgetLoadedProducts() {
  lastLoaded = null
}

/**
 * Il catalogo a scorrimento infinito: carica una pagina alla volta e la accoda alle precedenti.
 * Quando cambiano filtri o ordinamento si riparte dalla prima pagina, ma intanto restano visibili
 * i risultati vecchi, così la pagina non lampeggia.
 */
export function useInfiniteProducts(filters: Filters) {
  const key = productsPath({ ...filters, page: 1 })
  const cached = lastLoaded?.key === key ? lastLoaded : null

  const [loaded, setLoaded] = useState<Loaded | null>(cached)
  // Quale pagina vogliamo per quale ricerca: con una ricerca nuova si torna da sé alla prima
  const [wanted, setWanted] = useState({ key, page: cached?.page ?? 1 })
  const [attempt, setAttempt] = useState(0)
  const [failure, setFailure] = useState<Failure>()

  const page = wanted.key === key ? wanted.page : 1
  const path = productsPath({ ...filters, page })

  useEffect(() => {
    const controller = new AbortController()

    fetchJson<Paginated<ProductSummary>>(path, controller.signal)
      .then((result) =>
        setLoaded((prev) => {
          // Prima pagina = ricerca nuova: si sostituisce. Le altre si accodano.
          const before = page > 1 && prev?.key === key ? prev.items : []
          // Se nel frattempo è stato aggiunto un prodotto, l'ultimo di una pagina riappare
          // in cima alla successiva: lo saltiamo invece di mostrarlo due volte.
          const seen = new Set(before.map((product) => product.id))
          return {
            key,
            items: [...before, ...result.items.filter((p) => !seen.has(p.id))],
            page,
            pages: result.pages,
            total: result.total,
          }
        })
      )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : "Errore imprevisto"
        setFailure({ path, attempt, message })
      })

    return () => controller.abort()
  }, [key, path, page, attempt])

  useEffect(() => {
    if (loaded) lastLoaded = loaded
  }, [loaded])

  const current = loaded?.key === key ? loaded : undefined
  const error =
    failure?.path === path && failure.attempt === attempt
      ? failure.message
      : undefined
  const hasMore = current !== undefined && current.page < current.pages
  const loadingMore =
    current !== undefined && current.page < page && error === undefined

  return {
    /** Prodotti da mostrare: durante il cambio di filtri sono ancora quelli della ricerca precedente */
    products: loaded?.items,
    total: loaded?.total,
    /** I filtri sono cambiati e la prima pagina della nuova ricerca non è ancora arrivata */
    refreshing: loaded !== null && current === undefined && error === undefined,
    /** Errore sulla prima pagina: non c'è niente da mostrare */
    error: current === undefined ? error : undefined,
    /** Errore caricando le pagine successive: i prodotti già visti restano */
    loadMoreError: current !== undefined ? error : undefined,
    hasMore,
    loadingMore,
    loadMore: () => {
      if (current && hasMore && !loadingMore && error === undefined) {
        setWanted({ key, page: current.page + 1 })
      }
    },
    retry: () => setAttempt((n) => n + 1),
  }
}
