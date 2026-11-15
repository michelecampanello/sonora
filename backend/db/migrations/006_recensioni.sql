-- Recensioni dei prodotti su un database già esistente. Si può rilanciare e non cancella dati.

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '' CHECK (length(comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)  -- una recensione per persona e prodotto: si modifica, non se ne aggiunge un'altra
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, created_at DESC);
