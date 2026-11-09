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
  parent_id: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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

export interface ApiError {
  error: string;
}
