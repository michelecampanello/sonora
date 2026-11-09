-- Schema del database. Si può rilanciare: elimina e ricrea le tabelle.
DROP TABLE IF EXISTS order_items, orders, users, product_images, product_specs, products, brands, categories CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- ricerca tollerante agli errori di battitura

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,          -- usato negli URL, es. "chitarre-elettriche"
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,            -- ordine di visualizzazione tra categorie dello stesso livello
  parent_id   INTEGER REFERENCES categories(id) ON DELETE CASCADE  -- NULL = categoria principale
);

CREATE TABLE brands (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  sku         VARCHAR(32) NOT NULL UNIQUE,         -- codice articolo, es. "SON-0001"
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  featured    BOOLEAN NOT NULL DEFAULT false,      -- true = mostrato tra i prodotti in evidenza della landing page
  active      BOOLEAN NOT NULL DEFAULT true,       -- false = nascosto nel negozio, ma non cancellato (gli ordini lo citano)
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand_id    INTEGER NOT NULL REFERENCES brands(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()   -- aggiornata in automatico dal trigger qui sotto
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE product_specs (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label      VARCHAR(100) NOT NULL,   -- es. "Corde"
  value      VARCHAR(200) NOT NULL    -- es. "6"
);

CREATE TABLE product_images (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        VARCHAR(200),                -- testo alternativo; se manca si usa il nome del prodotto
  sort_order INTEGER NOT NULL DEFAULT 0   -- la prima immagine in ordine è la copertina
);

-- Gli utenti si useranno dalla tappa del login: la tabella c'è già così lo schema è completo.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),   -- NULL = ordine effettuato come ospite
  total      NUMERIC(10, 2) NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  -- Dati di contatto e spedizione copiati nell'ordine: restano corretti anche se il cliente poi li cambia
  customer_name  VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  address        VARCHAR(200) NOT NULL,
  city           VARCHAR(100) NOT NULL,
  postal_code    VARCHAR(5)   NOT NULL,
  province       VARCHAR(2)   NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL   -- prezzo al momento dell'acquisto
);

-- Indici per velocizzare i filtri più usati nel catalogo
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand    ON products(brand_id);
CREATE INDEX idx_products_price    ON products(price);
CREATE INDEX idx_product_images_product ON product_images(product_id, sort_order);
CREATE INDEX idx_products_search   ON products
  USING gin (name gin_trgm_ops, description gin_trgm_ops, sku gin_trgm_ops);
