/** Indirizzo pubblico del sito: si legge dalla configurazione, mai dagli header della richiesta */
export const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
