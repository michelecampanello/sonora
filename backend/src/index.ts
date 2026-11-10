import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import brandsRouter from "./routes/brands.js";
import ordersRouter from "./routes/orders.js";

const app = express();

// Permette al frontend di chiamare le API inviando il cookie di sessione: con i cookie
// l'origine va indicata per esteso, non si può lasciare aperta a tutti.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());  // legge il body JSON delle richieste
app.use(cookieParser());  // legge il cookie di sessione

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/brands", brandsRouter);
app.use("/api/orders", ordersRouter);

// Rotta non trovata
const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Risorsa non trovata" });
};
app.use(notFound);

// Gestione centralizzata degli errori (deve avere 4 parametri per essere riconosciuta da Express)
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Body JSON malformato o troppo grande: è un errore del client, non del server
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    res.status(400).json({ error: "Richiesta non valida" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Errore interno del server" });
};
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API in ascolto su http://localhost:${port}`));
