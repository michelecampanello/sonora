import { useState } from "react"

export type CatalogView = "grid" | "list"

/** Chiave di localStorage della vista scelta nel catalogo */
export const CATALOG_VIEW_STORAGE_KEY = "sonora-catalog-view"

function readView(): CatalogView {
  try {
    return localStorage.getItem(CATALOG_VIEW_STORAGE_KEY) === "list"
      ? "list"
      : "grid"
  } catch {
    // localStorage può essere bloccato (navigazione privata, cookie disattivati)
    return "grid"
  }
}

/**
 * Griglia o lista compatta. È una preferenza di chi guarda, non un filtro:
 * resta nel browser invece che nell'URL, così un link condiviso non impone la vista a chi lo apre.
 */
export function useCatalogView() {
  const [view, setView] = useState(readView)

  const changeView = (next: CatalogView) => {
    setView(next)
    try {
      localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, next)
    } catch {
      // se non si può salvare, la scelta vale comunque fino al prossimo caricamento
    }
  }

  return { view, changeView }
}
