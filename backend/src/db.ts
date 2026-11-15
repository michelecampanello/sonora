import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Variabile DATABASE_URL mancante: controlla il file .env");
}

// Un "pool" riutilizza le connessioni al database invece di aprirne una nuova a ogni richiesta.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Soglia di somiglianza della ricerca (operatore <%): col valore predefinito 0.6
  // un errore di una sola lettera, come "humbuker", non troverebbe "humbucker".
  options: "-c pg_trgm.word_similarity_threshold=0.5",
});

// Su Vercel la funzione resta attiva il tempo necessario a chiudere le connessioni inattive prima di essere sospesa,
// così non restano connessioni aperte e dimenticate sul database. Altrove non fa nulla.
attachDatabasePool(pool);
