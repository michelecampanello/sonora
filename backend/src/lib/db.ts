import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Variabile DATABASE_URL mancante: controlla il file .env");
}

// Un "pool" riutilizza le connessioni al database invece di aprirne una nuova a ogni richiesta.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Niente parametri di sessione (options: "-c ..."): i pooler come quello di Neon li rifiutano.
});

// Su Vercel la funzione resta attiva il tempo necessario a chiudere le connessioni inattive prima di essere sospesa,
// così non restano connessioni aperte e dimenticate sul database. Altrove non fa nulla.
attachDatabasePool(pool);
