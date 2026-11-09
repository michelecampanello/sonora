-- Schema del database. Si può rilanciare: elimina e ricrea le tabelle.
DROP TABLE IF EXISTS order_items, orders, users, product_images, product_specs, products, brands, categories CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- ricerca tollerante agli errori di battitura

-- Trasforma un nome in un testo adatto agli URL: "Più Bello 12" → "piu-bello-12"
CREATE OR REPLACE FUNCTION slugify(input text) RETURNS text AS $$
  SELECT trim(both '-' from regexp_replace(
    translate(lower(input), 'àáâäãåèéêëìíîïòóôöõùúûüýñç', 'aaaaaaeeeeiiiiooooouuuuync'),
    '[^a-z0-9]+', '-', 'g'
  ))
$$ LANGUAGE sql IMMUTABLE;

-- Se una riga nuova non ha uno slug, lo ricava dal nome; a parità di nome aggiunge -2, -3...
-- Agisce solo in inserimento: rinominando un prodotto il suo indirizzo non cambia.
CREATE OR REPLACE FUNCTION set_slug() RETURNS trigger AS $$
DECLARE
  base      text;
  candidate text;
  suffix    integer := 1;
  taken     boolean;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  base := COALESCE(NULLIF(slugify(NEW.name), ''), 'senza-nome');
  candidate := base;
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE slug = $1)', TG_TABLE_NAME)
      INTO taken USING candidate;
    EXIT WHEN NOT taken;
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,          -- usato negli URL, es. "chitarre-elettriche"
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,            -- ordine di visualizzazione tra categorie dello stesso livello
  parent_id   UUID REFERENCES categories(id) ON DELETE CASCADE  -- NULL = categoria principale
);

CREATE TABLE brands (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE   -- generato dal trigger se non indicato, es. "pulse-audio"
);

CREATE TRIGGER brands_set_slug
  BEFORE INSERT ON brands
  FOR EACH ROW EXECUTE FUNCTION set_slug();

CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku         VARCHAR(32) NOT NULL UNIQUE,         -- codice articolo, es. "SON-0001"
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,        -- generato dal trigger se non indicato, es. "pulse-duo-usb"
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  featured    BOOLEAN NOT NULL DEFAULT false,      -- true = mostrato tra i prodotti in evidenza della landing page
  active      BOOLEAN NOT NULL DEFAULT true,       -- false = nascosto nel negozio, ma non cancellato (gli ordini lo citano)
  category_id UUID NOT NULL REFERENCES categories(id),
  brand_id    UUID NOT NULL REFERENCES brands(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()   -- aggiornata in automatico dal trigger qui sotto
);

CREATE TRIGGER products_set_slug
  BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION set_slug();

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
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label      VARCHAR(100) NOT NULL,   -- es. "Corde"
  value      VARCHAR(200) NOT NULL,   -- es. "6"
  sort_order SERIAL                   -- ordine di inserimento: gli UUID non hanno un ordine utile
);

CREATE TABLE product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        VARCHAR(200),                -- testo alternativo; se manca si usa il nome del prodotto
  sort_order INTEGER NOT NULL DEFAULT 0   -- la prima immagine in ordine è la copertina
);

-- Gli utenti si useranno dalla tappa del login: la tabella c'è già così lo schema è completo.
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),   -- NULL = ordine effettuato come ospite
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
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
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
