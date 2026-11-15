import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ProductReviews } from "@/components/catalog/ProductReviews"
import { setUser } from "@/hooks/useAuth"
import type { Review, ReviewsResponse, User } from "@/lib/types"
import { mockApi, sentBody } from "@/test/mockApi"
import { renderPage } from "@/test/render"

const giulia: User = {
  id: "00000000-0000-4000-8000-000000000001",
  first_name: "Giulia",
  last_name: "Bianchi",
  email: "giulia@example.com",
  role: "customer",
}
const admin: User = {
  ...giulia,
  id: "00000000-0000-4000-8000-0000000000ad",
  first_name: "Anna",
  role: "admin",
}

const review = (overrides: Partial<Review> = {}): Review => ({
  id: "00000000-0000-4000-8000-0000000000e1",
  rating: 5,
  comment: "Suono pieno e caldo.",
  author: "Marco R.",
  verified: true,
  created_at: "2026-11-10T10:00:00.000Z",
  updated_at: "2026-11-10T10:00:00.000Z",
  ...overrides,
})

const response = (
  items: Review[],
  mine: Review | null = null
): ReviewsResponse => {
  const distribution: ReviewsResponse["summary"]["distribution"] = [
    0, 0, 0, 0, 0,
  ]
  for (const item of items) distribution[item.rating - 1] += 1
  const average = items.length
    ? Math.round(
        (items.reduce((sum, r) => sum + r.rating, 0) / items.length) * 10
      ) / 10
    : null
  return {
    items,
    total: items.length,
    page: 1,
    pages: items.length ? 1 : 0,
    mine,
    summary: { average, count: items.length, distribution },
  }
}

const PATH = "/api/products/nordwood-jb-5/reviews"
const renderReviews = () =>
  renderPage(<ProductReviews slug="nordwood-jb-5" />, {
    path: "/prodotti/:slug",
    url: "/prodotti/nordwood-jb-5",
  })

afterEach(() => setUser(null))

describe("recensioni del prodotto", () => {
  it("chi non ha fatto l'accesso vede media, distribuzione e recensioni, e l'invito ad accedere", async () => {
    setUser(null)
    mockApi({
      [`GET ${PATH}`]: {
        body: response([
          review(),
          review({
            id: "00000000-0000-4000-8000-0000000000e2",
            rating: 4,
            author: "Sara T.",
            verified: false,
            comment: "",
          }),
        ]),
      },
    })
    renderReviews()

    expect(await screen.findByText("4,5")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "4,5 stelle su 5" })
    ).toBeInTheDocument()
    expect(screen.getByText("2 recensioni")).toBeInTheDocument()
    expect(screen.getByText("Suono pieno e caldo.")).toBeInTheDocument()
    expect(screen.getAllByText("Acquisto verificato")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Accedi" })).toHaveAttribute(
      "href",
      "/accedi"
    )
    expect(
      screen.queryByRole("button", { name: "Pubblica recensione" })
    ).not.toBeInTheDocument()
  })

  it("chi ha fatto l'accesso scrive una recensione con voto e commento", async () => {
    setUser(giulia)
    let saved: Review | null = null
    const fetchMock = mockApi({
      [`GET ${PATH}`]: () => ({ body: response(saved ? [saved] : [], saved) }),
      [`PUT ${PATH}/mine`]: (_url, init) => {
        const body = JSON.parse(String(init?.body)) as {
          rating: number
          comment: string
        }
        saved = review({ ...body, author: "Giulia B.", verified: false })
        return { body: saved }
      },
    })
    const { user } = renderReviews()

    expect(
      await screen.findByText("Ancora nessuna recensione: scrivi la prima!")
    ).toBeInTheDocument()
    await user.click(screen.getByLabelText("4 stelle"))
    await user.type(
      screen.getByLabelText("Commento (facoltativo)"),
      "Ottimo rapporto qualità prezzo."
    )
    await user.click(
      screen.getByRole("button", { name: "Pubblica recensione" })
    )

    expect(sentBody(fetchMock, `${PATH}/mine`)).toEqual({
      rating: 4,
      comment: "Ottimo rapporto qualità prezzo.",
    })
    expect(await screen.findByText("La tua recensione")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Modifica" })).toBeInTheDocument()
    // Nell'elenco non compare una seconda volta
    expect(screen.getAllByText("Ottimo rapporto qualità prezzo.")).toHaveLength(
      1
    )
  })

  it("senza voto non invia nulla e lo dice", async () => {
    setUser(giulia)
    const fetchMock = mockApi({ [`GET ${PATH}`]: { body: response([]) } })
    const { user } = renderReviews()

    await user.click(
      await screen.findByRole("button", { name: "Pubblica recensione" })
    )
    expect(sentBody(fetchMock, `${PATH}/mine`)).toBeUndefined()
  })

  it("la propria recensione si modifica partendo dai valori salvati e si elimina", async () => {
    setUser(giulia)
    const mine = review({
      author: "Giulia B.",
      rating: 3,
      comment: "Discreto.",
    })
    const fetchMock = mockApi({
      [`GET ${PATH}`]: { body: response([mine], mine) },
      [`DELETE ${PATH}/mine`]: { body: { status: "ok" } },
    })
    const { user } = renderReviews()

    await user.click(await screen.findByRole("button", { name: "Modifica" }))
    expect(screen.getByLabelText("3 stelle")).toBeChecked()
    expect(screen.getByLabelText("Commento (facoltativo)")).toHaveValue(
      "Discreto."
    )
    await user.click(screen.getByRole("button", { name: "Annulla" }))

    await user.click(screen.getByRole("button", { name: "Elimina" }))
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Elimina",
      })
    )
    expect(
      fetchMock.mock.calls.some(
        ([path, init]) =>
          String(path) === `${PATH}/mine` && init?.method === "DELETE"
      )
    ).toBe(true)
  })

  it("l'admin può eliminare le recensioni degli altri", async () => {
    setUser(admin)
    const fetchMock = mockApi({
      [`GET ${PATH}`]: { body: response([review({ comment: "Spam" })]) },
      "DELETE /api/admin/reviews/00000000-0000-4000-8000-0000000000e1": {
        body: { status: "ok" },
      },
    })
    const { user } = renderReviews()

    await user.click(await screen.findByRole("button", { name: "Elimina" }))
    expect(
      await screen.findByText("Eliminare la recensione di Marco R.?")
    ).toBeInTheDocument()
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Elimina",
      })
    )
    expect(
      fetchMock.mock.calls.some(
        ([path, init]) =>
          String(path).endsWith(
            "/api/admin/reviews/00000000-0000-4000-8000-0000000000e1"
          ) && init?.method === "DELETE"
      )
    ).toBe(true)
  })

  it("un cliente non vede i pulsanti di moderazione", async () => {
    setUser(giulia)
    mockApi({ [`GET ${PATH}`]: { body: response([review()]) } })
    renderReviews()

    expect(await screen.findByText("Suono pieno e caldo.")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Elimina" })
    ).not.toBeInTheDocument()
  })
})
