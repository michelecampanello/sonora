// Tipi delle risposte API: corrispondono a backend/src/types.ts.
// Se cambi un tipo nel backend, aggiornalo anche qui.

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "customer" | "admin";
}

/** Nome e cognome di un account, come li accetta il backend */
export type PersonName = Pick<User, "first_name" | "last_name">;

export interface AuthResponse {
  user: User;
}

export const ORDER_STATUSES = ["pending", "shipped", "paid", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  total: string;
  created_at: string;
  item_count: number;
}

export interface OrderDetailItem {
  product_id: string;
  name: string;
  slug: string | null; // null se il prodotto non è più in vendita
  image_url: string | null;
  quantity: number;
  unit_price: string;
}

export interface OrderDetail extends Omit<OrderSummary, "item_count"> {
  customer: OrderCustomer;
  items: OrderDetailItem[];
}

export interface Address {
  id: string;
  name: string; // destinatario
  address: string;
  city: string;
  postal_code: string;
  province: string;
  is_default: boolean;
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
  /** Media dei voti con un decimale, null se il prodotto non ha recensioni */
  rating: number | null;
  review_count: number;
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

// Object.hasOwn e non `in`: valori come "toString" sono proprietà ereditate, non ordinamenti ammessi.
export const isSortKey = (value: string | null): value is SortKey =>
  value !== null && Object.hasOwn(SORT_OPTIONS, value);

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

// Pannello admin

export interface AdminOrderSummary extends OrderSummary {
  customer_name: string;
  customer_email: string;
  user_id: string | null; // null per gli ordini fatti da ospite
}

/** Dettaglio di un ordine nel pannello, con gli stati in cui può passare */
export interface AdminOrderDetail extends OrderDetail {
  next_statuses: OrderStatus[];
}

export interface AdminProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: string;
  stock: number;
  active: boolean;
  featured: boolean;
  brand: string;
  category: string;
}

export interface AdminStats {
  orders: Record<OrderStatus, number>;
  revenue: string; // totale degli ordini pagati
  activeProducts: number;
  lowStockProducts: number;
}

/** Prodotto completo nel form del pannello */
export interface AdminProductDetail extends AdminProduct {
  description: string | null;
  category_id: string;
  brand_id: string;
  specs: ProductSpec[];
  // La prima è la copertina. public_id solo per le foto caricate su Cloudinary dal pannello
  images: { url: string; alt: string | null; public_id: string | null }[];
}

/** Quello che il form invia per creare o modificare un prodotto */
export type ProductInput = Omit<AdminProductDetail, "id" | "slug" | "brand" | "category">;

export interface Review {
  id: string;
  rating: number;
  comment: string;
  /** Nome e iniziale del cognome, es. "Giulia B." */
  author: string;
  /** Chi l'ha scritta ha comprato il prodotto */
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
  /** Recensioni per voto: indice 0 = 1 stella, indice 4 = 5 stelle */
  distribution: [number, number, number, number, number];
}

export interface ReviewsResponse extends Paginated<Review> {
  summary: ReviewSummary;
  /** La recensione di chi sta guardando, se ne ha scritta una */
  mine: Review | null;
}
