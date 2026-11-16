import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { CATALOG_VIEW_STORAGE_KEY } from "@/hooks/useCatalogView"
import { forgetLoadedProducts } from "@/hooks/useInfiniteProducts"
import { CatalogPage } from "@/pages/CatalogPage"
import { makeProduct } from "@/test/fixtures"
import { mockApi } from "@/test/mockApi"
import { renderPage } from "@/test/render"

const items = [
  makeProduct({ name: "Nordwood JB-5", price: "899.00" }),
  makeProduct({ name: "Arcadia Studio 2", price: "149.00" }),
]

beforeEach(() => {
  forgetLoadedProducts()
  mockApi({
    "GET /api/products": {
      body: { items, total: items.length, page: 1, pages: 1 },
    },
    "GET /api/categories": { body: [] },
    "GET /api/brands": { body: [] },
  })
})

const listButton = () => screen.getByRole("button", { name: "Lista compatta" })
const gridButton = () => screen.getByRole("button", { name: "Griglia" })

describe("CatalogPage, scelta della vista", () => {
  it("parte dalla griglia", async () => {
    renderPage(<CatalogPage />, { path: "/catalogo" })

    await screen.findByText("Nordwood JB-5")
    expect(gridButton()).toHaveAttribute("aria-pressed", "true")
    expect(listButton()).toHaveAttribute("aria-pressed", "false")
  })

  it("passa alla lista compatta e se lo ricorda", async () => {
    const { user } = renderPage(<CatalogPage />, { path: "/catalogo" })
    await screen.findByText("Nordwood JB-5")

    await user.click(listButton())

    expect(listButton()).toHaveAttribute("aria-pressed", "true")
    expect(localStorage.getItem(CATALOG_VIEW_STORAGE_KEY)).toBe("list")
    // Ogni prodotto resta un link alla sua pagina, con nome e prezzo
    const link = screen.getByRole("link", { name: /Nordwood JB-5/ })
    expect(link).toHaveAttribute("href", `/prodotti/${items[0].slug}`)
    expect(link).toHaveTextContent("899")
  })

  it("riapre il catalogo nella vista scelta l'ultima volta", async () => {
    localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, "list")
    renderPage(<CatalogPage />, { path: "/catalogo" })

    await screen.findByText("Nordwood JB-5")
    expect(listButton()).toHaveAttribute("aria-pressed", "true")
  })
})

describe("CatalogPage, scorrimento infinito", () => {
  // 30 prodotti, 12 per pagina: tre pagine
  const catalog = Array.from({ length: 30 }, (_, i) =>
    makeProduct({ name: `Strumento ${i + 1}`, stock: i % 2 === 0 ? 5 : 0 })
  )
  const PER_PAGE = 12

  function servePages({ failPage }: { failPage?: number } = {}) {
    let failures = 0
    return mockApi({
      "GET /api/products": (url) => {
        const page = Number(url.searchParams.get("page"))
        if (page === failPage && failures++ === 0) {
          return { status: 500, body: { error: "Errore interno del server" } }
        }
        const matching =
          url.searchParams.get("inStock") === "true"
            ? catalog.filter((p) => p.stock > 0)
            : catalog
        return {
          body: {
            items: matching.slice((page - 1) * PER_PAGE, page * PER_PAGE),
            total: matching.length,
            page,
            pages: Math.ceil(matching.length / PER_PAGE),
          },
        }
      },
      "GET /api/categories": { body: [] },
      "GET /api/brands": { body: [] },
    })
  }

  const productLinks = () =>
    within(screen.getAllByRole("list")[0]).getAllByRole("link")
  const moreButton = () =>
    screen.getByRole("button", { name: "Mostra altri prodotti" })

  it("accoda le pagine successive invece di sostituirle", async () => {
    servePages()
    const { user } = renderPage(<CatalogPage />, { path: "/catalogo" })
    await screen.findByText("Strumento 1")
    expect(productLinks()).toHaveLength(12)
    expect(
      screen.queryByRole("navigation", { name: "Paginazione" })
    ).not.toBeInTheDocument()

    await user.click(moreButton())
    await screen.findByText("Strumento 24")
    expect(productLinks()).toHaveLength(24)
    expect(screen.getByText("Strumento 1")).toBeInTheDocument()

    await user.click(moreButton())
    await screen.findByText("Strumento 30")
    expect(productLinks()).toHaveLength(30)
    expect(
      screen.getByText("Hai visto tutti i 30 prodotti")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Mostra altri prodotti" })
    ).not.toBeInTheDocument()
  })

  it("cambiando un filtro riparte dalla prima pagina", async () => {
    servePages()
    const { user } = renderPage(<CatalogPage />, { path: "/catalogo" })
    await screen.findByText("Strumento 1")
    await user.click(moreButton())
    await screen.findByText("Strumento 24")

    await user.click(screen.getByRole("switch"))

    // 15 disponibili: la prima pagina ne mostra 12, e "Strumento 2" (esaurito) non c'è più
    await screen.findByText("15 prodotti")
    expect(productLinks()).toHaveLength(12)
    expect(screen.queryByText("Strumento 2")).not.toBeInTheDocument()
  })

  it("se una pagina successiva non arriva, tiene i prodotti già visti e permette di riprovare", async () => {
    servePages({ failPage: 2 })
    const { user } = renderPage(<CatalogPage />, { path: "/catalogo" })
    await screen.findByText("Strumento 1")

    await user.click(moreButton())
    await screen.findByText(/Non è stato possibile caricare altri prodotti/)
    expect(productLinks()).toHaveLength(12)

    await user.click(screen.getByRole("button", { name: "Riprova" }))
    await screen.findByText("Strumento 24")
    expect(productLinks()).toHaveLength(24)
  })

  it("tornando al catalogo ritrova i prodotti già caricati", async () => {
    servePages()
    const first = renderPage(<CatalogPage />, { path: "/catalogo" })
    await screen.findByText("Strumento 1")
    await first.user.click(moreButton())
    await screen.findByText("Strumento 24")
    first.unmount()

    renderPage(<CatalogPage />, { path: "/catalogo" })
    // Subito, senza aspettare la rete
    expect(screen.getByText("Strumento 24")).toBeInTheDocument()
    expect(productLinks()).toHaveLength(24)
  })
})
