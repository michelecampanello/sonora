// Entrypoint del backend su Vercel (vedi "entrypoint" in vercel.json).
// È un file .mts perché Vercel lo compila in .mjs, che Node carica sempre come modulo ES:
// compilato da app.ts diventava app.js, e senza il package.json con "type": "module" accanto
// Node lo leggeva come CommonJS ("Cannot use import statement outside a module").
// Vercel riconosce un'app Express dal file che importa "express" ed esporta l'app come default.
import "express";
import app from "./app.js";

export default app;
