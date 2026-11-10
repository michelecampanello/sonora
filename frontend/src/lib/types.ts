// Tipi delle risposte API: corrispondono a backend/src/types.ts.
// Se cambi un tipo nel backend, aggiornalo anche qui.

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
}

export interface AuthResponse {
  user: User;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: Omit<Category, "children">[];
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  price: string; // NUMERIC di PostgreSQL arriva come stringa
  stock: number;
  image_url: string | null; // copertina: la prima immagine del prodotto
  category: string;
  category_slug: string;
  brand_id: string;
  brand_slug: string;
  brand: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductPhoto {
  id: string;
  url: string;
  alt: string | null;
}

export interface ProductDetail extends ProductSummary {
  sku: string;
  description: string | null;
  created_at: string; // le date arrivano come stringhe ISO nel JSON
  specs: ProductSpec[];
  images: ProductPhoto[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface OrderCustomer {
  name: string;
  email: string;
  address: string;
  city: string;
  postal_code: string;
  province: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: string;
}

export interface OrderConfirmation {
  id: string;
  total: string;
  customer: OrderCustomer;
  items: OrderItem[];
}

export const SORT_OPTIONS = {
  newest: "Più recenti",
  price_asc: "Prezzo crescente",
  price_desc: "Prezzo decrescente",
  name: "Nome (A-Z)",
} as const;

export type SortKey = keyof typeof SORT_OPTIONS;

export interface CatalogFilters {
  q?: string;
  category?: string;
  brands: string[];
  minPrice?: string;
  maxPrice?: string;
  inStock: boolean;
  sort: SortKey;
  page: number;
}
