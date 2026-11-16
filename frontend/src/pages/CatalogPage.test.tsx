import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { CATALOG_VIEW_STORAGE_KEY } from "@/hooks/useCatalogView"
import { CatalogPage } from "@/pages/CatalogPage"
import { makeProduct } from "@/test/fixtures"
import { mockApi } from "@/test/mockApi"
import { renderPage } from "@/test/render"

const items = [
  makeProduct({ name: "Nordwood JB-5", price: "899.00" }),
  makeProduct({ name: "Arcadia Studio 2", price: "149.00" }),
]

beforeEach(() => {
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
