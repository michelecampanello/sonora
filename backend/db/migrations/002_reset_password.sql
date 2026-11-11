-- Reset della password su un database già esistente. Si può rilanciare e non cancella dati.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
