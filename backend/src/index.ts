import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import cors from "cors";
import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import brandsRouter from "./routes/brands.js";

const app = express();

app.use(cors());          // permette al frontend React (altra porta) di chiamare le API
app.use(express.json());  // legge il body JSON delle richieste

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/brands", brandsRouter);

// Rotta non trovata
const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Risorsa non trovata" });
};
app.use(notFound);

// Gestione centralizzata degli errori (deve avere 4 parametri per essere riconosciuta da Express)
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Errore interno del server" });
};
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API in ascolto su http://localhost:${port}`));
