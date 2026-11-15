import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { setUser } from "@/hooks/useAuth"
import type {
  AdminProductDetail,
  Brand,
  Category,
  ProductDetail,
  User,
} from "@/lib/types"
import { ProductPage } from "@/pages/ProductPage"
import { mockApi, sentBody } from "@/test/mockApi"
import { renderPage } from "@/test/render"

const PRODUCT_ID = "00000000-0000-4000-8000-0000000000aa"
const CATEGORY = "00000000-0000-4000-8000-0000000000b2"
const BRAND = "00000000-0000-4000-8000-0000000000c1"

const admin: User = {
  id: "00000000-0000-4000-8000-0000000000ad",
  first_name: "Anna",
  last_name: "Admin",
  email: "admin@example.com",
  role: "admin",
}
const customer: User = { ...admin, role: "customer" }

const shopProduct = (
  overrides: Partial<ProductDetail> = {}
): ProductDetail => ({
  id: PRODUCT_ID,
  slug: "nordwood-jb-5",
  name: "Nordwood JB-5",
  price: "899.00",
  stock: 4,
  image_url: null,
  category: "Bassi elettrici",
  category_slug: "bassi-elettrici",
  brand_id: BRAND,
  brand_slug: "nordwood",
  brand: "Nordwood",
  rating: null,
  review_count: 0,
  sku: "SON-0100",
  description: "Basso a 5 corde.",
  created_at: "2026-11-01T10:00:00.000Z",
  specs: [{ label: "Corde", value: "5" }],
  images: [],
  ...overrides,
})

const adminProduct = (
  overrides: Partial<AdminProductDetail> = {}
): AdminProductDetail => ({
  id: PRODUCT_ID,
  sku: "SON-0100",
  slug: "nordwood-jb-5",
  name: "Nordwood JB-5",
  description: "Basso a 5 corde.",
  price: "899.00",
  stock: 4,
  active: true,
  featured: false,
  brand: "Nordwood",
  category: "Bassi elettrici",
  category_id: CATEGORY,
  brand_id: BRAND,
  specs: [{ label: "Corde", value: "5" }],
  images: [],
  ...overrides,
})

const categories: Category[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Bassi",
    slug: "bassi",
    description: null,
    children: [
      {
        id: CATEGORY,
        name: "Bassi elettrici",
        slug: "bassi-elettrici",
        description: null,
      },
    ],
  },
]
const brands: Brand[] = [{ id: BRAND, slug: "nordwood", name: "Nordwood" }]

/** Un finto backend in cui la scheda del negozio riflette l'ultimo salvataggio */
function mockShop(saved: Partial<AdminProductDetail> = {}) {
  let current = shopProduct()
  return mockApi({
    "GET /api/products/nordwood-jb-5": () => ({ body: current }),
    [`GET /api/admin/products/${PRODUCT_ID}`]: { body: adminProduct() },
    "GET /api/categories": { body: categories },
    "GET /api/brands": { body: brands },
    [`PUT /api/admin/products/${PRODUCT_ID}`]: (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        name: string
        price: string
      }
      current = shopProduct({ name: body.name, price: body.price })
      return {
        body: adminProduct({ name: body.name, price: body.price, ...saved }),
      }
    },
  })
}

const renderProduct = () =>
  renderPage(<ProductPage />, {
    path: "/prodotti/:slug",
    url: "/prodotti/nordwood-jb-5",
  })

afterEach(() => setUser(null))

describe("modifica dalla pagina del prodotto", () => {
  it("chi non è admin non vede il pulsante", async () => {
    setUser(customer)
    mockShop()
    renderProduct()

    expect(
      await screen.findByRole("heading", { level: 1, name: "Nordwood JB-5" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Modifica prodotto" })
    ).not.toBeInTheDocument()
  })

  it("l'admin modifica il prodotto e vede subito la scheda aggiornata", async () => {
    setUser(admin)
    const fetchMock = mockShop()
    const { user } = renderProduct()

    await user.click(
      await screen.findByRole("button", { name: "Modifica prodotto" })
    )
    const name = await screen.findByLabelText("Nome")
    expect(name).toHaveValue("Nordwood JB-5")
    expect(screen.getByLabelText("Categoria")).toHaveValue(CATEGORY)

    await user.clear(name)
    await user.type(name, "Nordwood JB-5 Custom")
    await user.clear(screen.getByLabelText("Prezzo (€)"))
    await user.type(screen.getByLabelText("Prezzo (€)"), "949,00")
    await user.click(screen.getByRole("button", { name: "Salva modifiche" }))

    expect(
      sentBody(fetchMock, `/api/admin/products/${PRODUCT_ID}`)
    ).toMatchObject({
      name: "Nordwood JB-5 Custom",
      price: "949.00",
      category_id: CATEGORY,
    })
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Nordwood JB-5 Custom",
      })
    ).toBeInTheDocument()
    expect(screen.getByText("Modifiche salvate.")).toHaveAttribute(
      "role",
      "status"
    )
    expect(screen.getByText("949,00 €")).toBeInTheDocument()
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument()
  })

  it("Annulla chiude il form senza salvare", async () => {
    setUser(admin)
    const fetchMock = mockShop()
    const { user } = renderProduct()

    await user.click(
      await screen.findByRole("button", { name: "Modifica prodotto" })
    )
    await user.type(await screen.findByLabelText("Nome"), " modificato")
    await user.click(screen.getByRole("button", { name: "Annulla" }))

    expect(
      screen.getByRole("heading", { level: 1, name: "Nordwood JB-5" })
    ).toBeInTheDocument()
    expect(
      sentBody(fetchMock, `/api/admin/products/${PRODUCT_ID}`)
    ).toBeUndefined()
  })

  it("se il prodotto viene tolto dalla vendita si continua dal pannello admin", async () => {
    setUser(admin)
    mockShop({ active: false })
    const { user } = renderProduct()

    await user.click(
      await screen.findByRole("button", { name: "Modifica prodotto" })
    )
    await user.click(await screen.findByLabelText("In vendita nel negozio"))
    await user.click(screen.getByRole("button", { name: "Salva modifiche" }))

    expect(await screen.findByTestId("current-path")).toHaveTextContent(
      `/admin/prodotti/${PRODUCT_ID}`
    )
  })
})
