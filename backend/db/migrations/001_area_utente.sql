-- Area personale su un database già esistente. Si può rilanciare e non cancella dati.
-- Chi parte da zero con `npm run db:setup` ha già tutto da schema.sql.

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(200) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  postal_code VARCHAR(5)   NOT NULL,
  province    VARCHAR(2)   NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand      VARCHAR(20) NOT NULL CHECK (brand IN ('visa', 'mastercard', 'amex', 'altro')),
  last4      CHAR(4) NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  holder     VARCHAR(100) NOT NULL,
  exp_month  SMALLINT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year   SMALLINT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default ON addresses(user_id) WHERE is_default;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_one_default ON payment_methods(user_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
