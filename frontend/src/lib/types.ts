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

export const CARD_BRANDS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  altro: "Altro circuito",
} as const;

export type CardBrand = keyof typeof CARD_BRANDS;

export interface PaymentMethod {
  id: string;
  brand: CardBrand;
  last4: string;
  holder: string;
  exp_month: number;
  exp_year: number;
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
