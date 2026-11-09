# Sonora — e-commerce di strumenti musicali

Progetto full stack in TypeScript: React (frontend) + Node.js/Express (backend) + PostgreSQL.

> Nome provvisorio: sostituiscilo con il nome che sceglierai per il negozio.
> Marche e prodotti nei dati di prova sono inventati.

## Stato del progetto

- [x] **Tappa 1** — Backend base: database, catalogo, categorie, marche
- [ ] Tappa 2 — Frontend catalogo (lista, dettaglio, ricerca, filtri)
- [ ] Tappa 3 — Carrello
- [ ] Tappa 4 — Registrazione e login (JWT)
- [ ] Tappa 5 — Checkout e storico ordini
- [ ] Tappa 6 — Pannello admin
- [ ] Tappa 7 — Pubblicazione online

## Avvio in locale

Requisiti: Node.js 20 o superiore, PostgreSQL.

```bash
cd backend
npm install

# 1. Crea il database
createdb music_store

# 2. Crea il file .env partendo dall'esempio e controlla utente/password di Postgres
cp .env.example .env

# 3. Crea le tabelle e inserisci i dati di prova
#    (su Windows, lancia i due comandi psql a mano con il tuo DATABASE_URL)
npm run db:setup

# 4. Avvia il server in sviluppo (si riavvia da solo quando salvi un file)
npm run dev
```

Altri comandi:

| Comando | Cosa fa |
|---|---|
| `npm run typecheck` | Controlla i tipi senza generare file |
| `npm run build` | Compila TypeScript in JavaScript nella cartella `dist/` |
| `npm start` | Avvia la versione compilata (quella da usare online) |

Il server parte su `http://localhost:3000`. Prova: `http://localhost:3000/api/health`

## API

| Metodo | URL | Descrizione |
|---|---|---|
| GET | `/api/products` | Catalogo con filtri, ordinamento e paginazione |
| GET | `/api/products/:id` | Dettaglio prodotto con caratteristiche tecniche e immagini |
| GET | `/api/categories` | Categorie con sottocategorie |
| GET | `/api/brands` | Elenco marche |

### Filtri di `/api/products`

| Parametro | Esempio | Significato |
|---|---|---|
| `q` | `q=humbucker` | Cerca in nome, descrizione e codice articolo, tollerando gli errori di battitura |
| `category` | `category=chitarre` | Slug categoria, include le sottocategorie |
| `brand` | `brand=1,3` | Uno o più id di marca |
| `minPrice` / `maxPrice` | `maxPrice=400` | Fascia di prezzo |
| `inStock` | `inStock=true` | Solo prodotti disponibili |
| `featured` | `featured=true` | Solo prodotti in evidenza |
| `sort` | `sort=price_asc` | `newest`, `price_asc`, `price_desc`, `name` |
| `page` / `limit` | `page=2&limit=12` | Paginazione |

Esempio: `/api/products?category=chitarre&maxPrice=400&sort=price_asc`

## Scelte tecniche

- **TypeScript in modalità `strict`**, con i tipi delle risposte API raccolti in `src/types.ts` (riutilizzabili nel frontend).
- **Validazione della query string**: i parametri vengono convertiti e controllati (`asString`, `asNumber`) invece di fidarsi di ciò che arriva dal client.

- **Query parametrizzate** (`$1`, `$2`…) in tutte le richieste: protezione dalla SQL injection.
- **Ordinamento da una lista di valori ammessi**, mai inserito direttamente dall'input dell'utente.
- **Categorie ad albero** con `parent_id`: filtrando per "Chitarre" si ottengono anche elettriche, acustiche e classiche.
- **`unit_price` in `order_items`**: salva il prezzo al momento dell'acquisto, così gli ordini passati restano corretti se il prezzo cambia.
- **Indici** su categoria, marca e prezzo per velocizzare i filtri del catalogo.
- **Più immagini per prodotto** nella tabella `product_images`: la prima secondo `sort_order` è la copertina usata nelle card.
- **Ricerca con `pg_trgm`**: trova i prodotti anche con errori di battitura, usando un indice GIN.
- **Prodotti nascosti con `active = false`**: spariscono dal negozio senza essere cancellati, così gli ordini passati restano validi.
- **`updated_at` gestita da un trigger**: si aggiorna a ogni modifica del prodotto, senza dipendere dal codice dell'API.
