import type { CatalogFilters } from "@/lib/types";

// In sviluppo resta vuoto: Vite inoltra le chiamate /api al backend (vedi "proxy" in vite.config.ts).
// Online imposterai VITE_API_URL con l'indirizzo del backend pubblicato.
const API_URL: string = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Restituisce il JSON della risposta, oppure lancia un ApiError con il messaggio del server. */
async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Errore ${response.status}`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // risposta senza JSON: teniamo il messaggio generico
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

/** Esegue una GET e restituisce il JSON. */
export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return readResponse<T>(await fetch(`${API_URL}${path}`, { signal, credentials: "include" }));
}

/** Invia una richiesta con un body JSON e restituisce il JSON. */
export async function sendJson<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include", // invia il cookie di sessione
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return readResponse<T>(response);
}

export const postJson = <T>(path: string, body: unknown): Promise<T> => sendJson<T>("POST", path, body);

/** Costruisce l'URL del catalogo a partire dai filtri. Include solo i filtri impostati. */
export function productsPath(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.brands.length > 0) params.set("brand", filters.brands.join(","));
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.inStock) params.set("inStock", "true");
  params.set("sort", filters.sort);
  params.set("page", String(filters.page));
  params.set("limit", "12");
  return `/api/products?${params.toString()}`;
}

export const featuredProductsPath = "/api/products?featured=true&inStock=true&limit=6";
export const productsByIdPath = (ids: string[]) => `/api/products?ids=${ids.join(",")}&limit=50`;
export const ordersPath = "/api/orders";
export const loginPath = "/api/auth/login";
export const registerPath = "/api/auth/register";
export const logoutPath = "/api/auth/logout";
export const currentUserPath = "/api/auth/me";
export const forgotPasswordPath = "/api/auth/forgot-password";
export const resetPasswordPath = "/api/auth/reset-password";
export const accountOrdersPath = (page: number) => `/api/account/orders?page=${page}`;
export const accountOrderPath = (id: string) => `/api/account/orders/${encodeURIComponent(id)}`;
export const profilePath = "/api/account/profile";
export const passwordPath = "/api/account/password";
export const addressesPath = "/api/account/addresses";
export const addressPath = (id: string) => `${addressesPath}/${encodeURIComponent(id)}`;
export const paymentMethodsPath = "/api/account/payment-methods";
export const paymentMethodPath = (id: string) => `${paymentMethodsPath}/${encodeURIComponent(id)}`;
export const productPath = (slug: string) => `/api/products/${encodeURIComponent(slug)}`;
export const categoriesPath = "/api/categories";
export const brandsPath = "/api/brands";

// Pannello admin
export const adminStatsPath = "/api/admin/stats";
export function adminOrdersPath({ status, page }: { status?: string | undefined; page: number }): string {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  return `/api/admin/orders?${params.toString()}`;
}
export const adminOrderPath = (id: string) => `/api/admin/orders/${encodeURIComponent(id)}`;
export const adminOrderStatusPath = (id: string) => `${adminOrderPath(id)}/status`;
export function adminProductsPath({ q, lowStock, page }: { q?: string | undefined; lowStock: boolean; page: number }): string {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  if (lowStock) params.set("lowStock", "true");
  return `/api/admin/products?${params.toString()}`;
}
export const adminProductPath = (id: string) => `/api/admin/products/${encodeURIComponent(id)}`;
