-- Nome e cognome separati su un database già esistente. Si può rilanciare e non cancella dati.
-- Il vecchio "name" viene diviso al primo spazio: "Maria Grazia Rossi" diventa "Maria" + "Grazia Rossi".
-- Chi ha un nome di una sola parola resta con il cognome vuoto, e lo aggiunge dalle impostazioni.

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  VARCHAR(50);

DO $$
BEGIN
  -- Solo la prima volta: dopo, la colonna "name" non esiste più
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
    UPDATE users SET
      first_name = left(split_part(btrim(name), ' ', 1), 50),
      last_name  = left(btrim(substr(btrim(name), length(split_part(btrim(name), ' ', 1)) + 1)), 50)
    WHERE first_name IS NULL;
    ALTER TABLE users DROP COLUMN name;
  END IF;
END $$;

UPDATE users SET first_name = '' WHERE first_name IS NULL;
UPDATE users SET last_name  = '' WHERE last_name IS NULL;
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name  SET NOT NULL;
