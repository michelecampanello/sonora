/**
 * Indirizzo pubblico del sito, per i link nelle email: si legge dalla configurazione, mai dagli header della richiesta.
 * Su Vercel, se FRONTEND_ORIGIN non è impostata, si usa il dominio di produzione del progetto
 * (VERCEL_PROJECT_PRODUCTION_URL, senza https://): sito e API sono sullo stesso dominio.
 */
const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;

export const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || vercelOrigin || "http://localhost:5173").replace(/\/$/, "");
