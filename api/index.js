// L'API Express come funzione di Vercel: vercel.json manda qui tutte le richieste /api/*,
// con l'indirizzo originale, quindi le rotte di Express restano le stesse del server locale.
// Importa la versione compilata, che il comando di build di vercel.json crea in backend/dist.
import app from "../backend/dist/app.js";

export default app;
