// Tipi condivisi: descrivono la forma dei dati che le API restituiscono.
// Più avanti potrai riusarli anche nel frontend React.

export interface Brand {
  id: string;
  slug: string;
  name: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  children: Omit<Category, "children">[];
}

/** Prodotto come appare nella lista del catalogo */
export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  price: string; // pg restituisce NUMERIC come stringa per non perdere precisione
  stock: number;
  image_url: string | null; // copertina: la prima immagine del prodotto
  category: string;
  category_slug: string;
  brand_id: string;
  brand_slug: string;
  brand: string;
  /** Media dei voti con un decimale, null se nessuno ha ancora recensito il prodotto */
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

/** Prodotto nella pagina di dettaglio */
export interface ProductDetail extends ProductSummary {
  sku: string;
  description: string | null;
  created_at: Date;
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

/** Riepilogo restituito quando un ordine va a buon fine */
export interface OrderConfirmation {
  id: string;
  total: string;
  customer: OrderCustomer;
  items: OrderItem[];
}

export const ORDER_STATUSES = ["pending", "shipped", "paid", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Ordine nell'elenco dell'area personale */
export interface OrderSummary {
  id: string;
  status: OrderStatus;
  total: string;
  created_at: Date;
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

/** Ordine nell'elenco del pannello admin: come quello del cliente, più chi l'ha fatto */
export interface AdminOrderSummary extends OrderSummary {
  customer_name: string;
  customer_email: string;
  /** null per gli ordini fatti da ospite */
  user_id: string | null;
}

/** Prodotto nel pannello admin: include i nascosti e i campi che il negozio non mostra */
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

export interface ProductImageInput {
  url: string;
  alt: string | null;
  /** Per le foto caricate su Cloudinary dal pannello; null per quelle indicate con un indirizzo */
  public_id: string | null;
}

/** Prodotto completo nel form del pannello: tutti i campi modificabili */
export interface AdminProductDetail extends AdminProduct {
  description: string | null;
  category_id: string;
  brand_id: string;
  specs: ProductSpec[];
  /** Nell'ordine in cui vengono mostrate: la prima è la copertina */
  images: ProductImageInput[];
}

/** Quello che il pannello invia per creare o modificare un prodotto */
export type ProductInput = Omit<AdminProductDetail, "id" | "slug" | "brand" | "category">;

export interface AdminStats {
  orders: Record<OrderStatus, number>;
  /** Totale degli ordini pagati: con il pagamento alla consegna, i soldi davvero incassati */
  revenue: string;
  activeProducts: number;
  /** Prodotti in vendita con pochi pezzi rimasti (LOW_STOCK_THRESHOLD o meno) */
  lowStockProducts: number;
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

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "customer" | "admin";
}

export interface AuthResponse {
  user: User;
}

export interface ApiError {
  error: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  /** Nome e iniziale del cognome, es. "Giulia B.": il cognome intero non si mostra */
  author: string;
  /** Chi l'ha scritta ha comprato il prodotto in un ordine non annullato */
  verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
  /** Quante recensioni per ogni voto: indice 0 = 1 stella, indice 4 = 5 stelle */
  distribution: [number, number, number, number, number];
}

export interface ReviewsResponse extends Paginated<Review> {
  summary: ReviewSummary;
  /** La recensione di chi sta guardando, se ha fatto l'accesso e ne ha scritta una */
  mine: Review | null;
}
