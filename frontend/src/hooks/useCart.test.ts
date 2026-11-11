import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addToCart,
  clearCart,
  MAX_QUANTITY,
  removeFromCart,
  setCartQuantity,
  useCart,
  useCartLines,
} from "@/hooks/useCart";
import { makeProduct } from "@/test/fixtures";
import { mockApi } from "@/test/mockApi";

const STORAGE_KEY = "sonora.cart";
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

// Il carrello vive a livello di modulo: va svuotato a mano prima di ogni test
beforeEach(() => clearCart());

describe("operazioni sul carrello", () => {
  it("aggiunge un prodotto e ne aumenta la quantità se è già presente", () => {
    addToCart(A, 10);
    addToCart(A, 10);
    addToCart(B, 10);
    expect(stored()).toEqual([
      { productId: A, quantity: 2 },
      { productId: B, quantity: 1 },
    ]);
  });

  it("non supera la disponibilità del prodotto", () => {
    addToCart(A, 2);
    addToCart(A, 2);
    addToCart(A, 2);
    expect(stored()).toEqual([{ productId: A, quantity: 2 }]);
  });

  it("non aggiunge un prodotto esaurito", () => {
    addToCart(A, 0);
    expect(stored()).toEqual([]);
  });

  it(`non supera mai ${MAX_QUANTITY} pezzi, anche con molta disponibilità`, () => {
    for (let i = 0; i < MAX_QUANTITY + 5; i++) addToCart(A, 1000);
    expect(stored()).toEqual([{ productId: A, quantity: MAX_QUANTITY }]);
  });

  it("cambia la quantità solo con valori validi", () => {
    addToCart(A, 10);
    setCartQuantity(A, 5);
    for (const invalid of [0, -1, 2.5, MAX_QUANTITY + 1]) setCartQuantity(A, invalid);
    expect(stored()).toEqual([{ productId: A, quantity: 5 }]);
  });

  it("rimuove un prodotto", () => {
    addToCart(A, 10);
    addToCart(B, 10);
    removeFromCart(A);
    expect(stored()).toEqual([{ productId: B, quantity: 1 }]);
  });
});

describe("useCart", () => {
  it("conta i pezzi e si aggiorna quando il carrello cambia", () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.count).toBe(0);

    act(() => {
      addToCart(A, 10);
      addToCart(A, 10);
      addToCart(B, 10);
    });
    expect(result.current.count).toBe(3);
  });

  it("si aggiorna quando il carrello cambia in un'altra scheda", () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([{ productId: A, quantity: 4 }]));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });
    expect(result.current.count).toBe(4);
  });
});

describe("lettura dal browser", () => {
  /** Ricarica il modulo da zero, come all'apertura della pagina */
  async function loadCartWith(saved: string) {
    localStorage.setItem(STORAGE_KEY, saved);
    vi.resetModules();
    const cart = await import("@/hooks/useCart");
    return renderHook(() => cart.useCart()).result.current.items;
  }

  it("riprende il carrello salvato", async () => {
    expect(await loadCartWith(JSON.stringify([{ productId: A, quantity: 3 }]))).toEqual([{ productId: A, quantity: 3 }]);
  });

  it("scarta le righe manomesse e tiene quelle valide", async () => {
    const saved = JSON.stringify([
      { productId: A, quantity: 2 },
      { productId: "non-un-uuid", quantity: 1 },
      { productId: B, quantity: 1000 },
      { productId: B, quantity: "2" },
      null,
    ]);
    expect(await loadCartWith(saved)).toEqual([{ productId: A, quantity: 2 }]);
  });

  it("con un contenuto illeggibile riparte da un carrello vuoto", async () => {
    expect(await loadCartWith("{non json")).toEqual([]);
    expect(await loadCartWith(JSON.stringify({ productId: A }))).toEqual([]);
  });
});

describe("useCartLines", () => {
  it("unisce il carrello ai dati aggiornati dei prodotti e calcola il totale in centesimi", async () => {
    const guitar = makeProduct({ id: A, price: "349.90", stock: 5 });
    const cable = makeProduct({ id: B, price: "0.10", stock: 10 });
    mockApi({ "GET /api/products": { body: { items: [guitar, cable], total: 2, page: 1, pages: 1 } } });
    addToCart(A, 5);
    addToCart(A, 5);
    for (let i = 0; i < 3; i++) addToCart(B, 10);

    const { result } = renderHook(() => useCartLines());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.lines).toEqual([
      { product: guitar, quantity: 2 },
      { product: cable, quantity: 3 },
    ]);
    expect(result.current.total).toBe(700.1);
    expect(result.current.hasStockProblems).toBe(false);
  });

  it("segnala se la quantità supera la disponibilità attuale", async () => {
    addToCart(A, 10);
    addToCart(A, 10);
    mockApi({ "GET /api/products": { body: { items: [makeProduct({ id: A, stock: 1 })], total: 1, page: 1, pages: 1 } } });

    const { result } = renderHook(() => useCartLines());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasStockProblems).toBe(true);
  });

  it("toglie dal carrello i prodotti che il negozio non vende più", async () => {
    addToCart(A, 10);
    addToCart(B, 10);
    mockApi({ "GET /api/products": { body: { items: [makeProduct({ id: A })], total: 1, page: 1, pages: 1 } } });

    renderHook(() => useCartLines());
    await waitFor(() => expect(stored()).toEqual([{ productId: A, quantity: 1 }]));
  });
});
