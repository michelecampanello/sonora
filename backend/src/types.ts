// Tipi condivisi: descrivono la forma dei dati che le API restituiscono.
// Più avanti potrai riusarli anche nel frontend React.

export interface Brand {
  id: number;
  name: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  children: Omit<Category, "children">[];
}

/** Prodotto come appare nella lista del catalogo */
export interface ProductSummary {
  id: number;
  name: string;
  price: string; // pg restituisce NUMERIC come stringa per non perdere precisione
  stock: number;
  image_url: string | null; // copertina: la prima immagine del prodotto
  category: string;
  category_slug: string;
  brand_id: number;
  brand: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductPhoto {
  id: number;
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

export interface ApiError {
  error: string;
}
