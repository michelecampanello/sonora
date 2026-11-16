-- Pagamento con carta tramite Stripe, accanto al pagamento alla consegna. Si può rilanciare e non cancella dati.
--
-- Lo stato dell'ordine ora descrive solo la spedizione; il pagamento ha le sue colonne:
--   awaiting_payment  ordine con carta creato, il cliente è sulla pagina di Stripe (magazzino già riservato)
--   pending           in lavorazione, da spedire
--   shipped           spedito
--   delivered         consegnato (prima si chiamava "paid": con la consegna arrivava anche il pagamento)
--   cancelled         annullato, pezzi tornati in magazzino
-- paid_at dice se e quando l'ordine è stato pagato: subito per la carta, alla consegna per il contrassegno.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) NOT NULL DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod', 'card'));

-- Il vecchio vincolo non ammette "delivered": va tolto prima di rinominare lo stato
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE orders SET status = 'delivered', paid_at = COALESCE(paid_at, created_at) WHERE status = 'paid';
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('awaiting_payment', 'pending', 'shipped', 'delivered', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
