import { useEffect, useSyncExternalStore } from "react";
import { useFetch } from "@/hooks/useFetch";
import { productsByIdPath } from "@/lib/api";
import type { Paginated, ProductSummary } from "@/lib/types";

export const MAX_QUANTITY = 99;
const STORAGE_KEY = "sonora.cart";

export interface CartItem {
  productId: number;
  quantity: number;
}

export interface CartLine {
  product: ProductSummary;
  quantity: number;
}

const isValidQuantity = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0 && n <= MAX_QUANTITY;

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const { productId, quantity } = value as Record<string, unknown>;
  return typeof productId === "number" && Number.isInteger(productId) && productId > 0 && isValidQuantity(quantity);
}

function readStorage(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return []; // storage bloccato o contenuto corrotto: si riparte da un carrello vuoto
  }
}

// Il carrello è uno "store" esterno a React: header, pagina prodotto e carrello leggono
// tutti lo stesso dato. Nel browser conserviamo solo id e quantità: nomi, prezzi e
// disponibilità si chiedono sempre al server, così non possono essere vecchi o manomessi.
let cartItems = readStorage();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

function save(next: CartItem[]) {
  cartItems = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage pieno o bloccato: il carrello funziona comunque finché la pagina resta aperta
  }
  notify();
}

// Aggiorna il carrello se viene modificato in un'altra scheda del browser
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    cartItems = readStorage();
    notify();
  }
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addToCart(productId: number, stock: number) {
  const limit = Math.min(stock, MAX_QUANTITY);
  const existing = cartItems.find((item) => item.productId === productId);
  if ((existing?.quantity ?? 0) >= limit) return;
  save(
    existing
      ? cartItems.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item))
      : [...cartItems, { productId, quantity: 1 }]
  );
}

export function setCartQuantity(productId: number, quantity: number) {
  if (!isValidQuantity(quantity)) return;
  save(cartItems.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
}

export function removeFromCart(productId: number) {
  save(cartItems.filter((item) => item.productId !== productId));
}

export function clearCart() {
  save([]);
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, () => cartItems);
  return { items, count: items.reduce((sum, item) => sum + item.quantity, 0) };
}

/** Il carrello unito ai dati aggiornati dei prodotti, con il totale calcolato. */
export function useCartLines() {
  const { items, count } = useCart();
  // Id ordinati: cambiare una quantità non deve far ripartire la richiesta
  const ids = items.map((item) => item.productId).sort((a, b) => a - b);
  const { data, previousData, error } = useFetch<Paginated<ProductSummary>>(
    ids.length > 0 ? productsByIdPath(ids) : null
  );
  const products = data ?? previousData;

  const lines: CartLine[] = items.flatMap(({ productId, quantity }) => {
    const product = products?.items.find((p) => p.id === productId);
    return product ? [{ product, quantity }] : [];
  });

  // Un prodotto che il server non restituisce più (es. nascosto dal negozio) esce dal carrello.
  // Il controllo sul totale evita di toccare il carrello se la risposta non li contiene tutti.
  const missing =
    data && data.total === data.items.length
      ? items.filter((item) => !data.items.some((p) => p.id === item.productId))
      : [];
  const missingKey = missing.map((item) => item.productId).join(",");
  useEffect(() => {
    if (!missingKey) return;
    missingKey.split(",").forEach((id) => removeFromCart(Number(id)));
  }, [missingKey]);

  const totalCents = lines.reduce(
    (sum, { product, quantity }) => sum + Math.round(Number(product.price) * 100) * quantity,
    0
  );

  return {
    lines,
    count,
    total: totalCents / 100,
    error,
    loading: items.length > 0 && !products && !error,
    hasStockProblems: lines.some(({ product, quantity }) => quantity > product.stock),
  };
}
