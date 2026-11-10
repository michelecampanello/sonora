# Sonora — e-commerce di strumenti musicali

Progetto full stack in TypeScript: React (frontend) + Node.js/Express (backend) + PostgreSQL.

> Nome provvisorio: sostituiscilo con il nome che sceglierai per il negozio.
> Marche e prodotti nei dati di prova sono inventati.

## Stato del progetto

- [x] **Tappa 1** — Backend base: database, catalogo, categorie, marche
- [ ] Tappa 2 — Frontend catalogo (lista, dettaglio, ricerca, filtri)
- [x] Tappa 3 — Carrello
- [x] Tappa 4 — Registrazione e login (JWT)
- [ ] Tappa 5 — Checkout e storico ordini (fatto: checkout come ospite, con pagamento alla consegna; manca lo storico)
- [ ] Tappa 6 — Pannello admin
- [ ] Tappa 7 — Pubblicazione online

## Avvio in locale

Requisiti: Node.js 20 o superiore, PostgreSQL.

```bash
cd backend
npm install

# 1. Crea il database
createdb music_store

# 2. Crea il file .env partendo dall'esempio: controlla utente/password di Postgres e imposta JWT_SECRET
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
| GET | `/api/products/:slug` | Dettaglio prodotto con caratteristiche tecniche e immagini |
| GET | `/api/categories` | Categorie con sottocategorie |
| GET | `/api/brands` | Elenco marche |
| GET | `/api/brands/:slug/products` | Prodotti di una marca |
| POST | `/api/orders` | Crea un ordine, collegato all'utente se ha fatto l'accesso, e scala il magazzino |
| POST | `/api/auth/register` | Crea un account e avvia la sessione |
| POST | `/api/auth/login` | Avvia la sessione |
| POST | `/api/auth/logout` | Chiude la sessione |
| GET | `/api/auth/me` | Utente collegato, 401 se non c'è una sessione |

### Filtri di `/api/products`

| Parametro | Esempio | Significato |
|---|---|---|
| `q` | `q=humbucker` | Cerca in nome, descrizione e codice articolo, tollerando gli errori di battitura |
| `category` | `category=chitarre` | Slug categoria, include le sottocategorie |
| `brand` | `brand=pulse-audio,nordwood` | Uno o più slug di marca |
| `minPrice` / `maxPrice` | `maxPrice=400` | Fascia di prezzo |
| `inStock` | `inStock=true` | Solo prodotti disponibili |
| `featured` | `featured=true` | Solo prodotti in evidenza |
| `ids` | `ids=<uuid>,<uuid>` | Solo i prodotti indicati (usato dal carrello) |
| `sort` | `sort=price_asc` | `newest`, `price_asc`, `price_desc`, `name` |
| `page` / `limit` | `page=2&limit=12` | Paginazione |

Esempio: `/api/products?category=chitarre&maxPrice=400&sort=price_asc`

## Scelte tecniche

- **Backend a tre livelli**: `routes/` collega URL e controller, `controllers/` legge e valida la richiesta e sceglie la risposta HTTP, `services/` contiene le query e la logica di business, senza conoscere Express.
- **Sessione con JWT in un cookie `httpOnly` e `SameSite=Lax`**: JavaScript non può leggere il token e gli altri siti non possono usarlo. Online il sito e l'API devono stare sullo stesso dominio base (es. `www.example.com` e `api.example.com`), oppure l'API va inoltrata dal dominio del sito.
- **Password con bcrypt e limite ai tentativi** su login e registrazione. Il limite è per indirizzo IP: dietro un proxy, online, va configurato `trust proxy` in Express.
- **TypeScript in modalità `strict`**, con i tipi delle risposte API raccolti in `src/types.ts` (riutilizzabili nel frontend).
- **Validazione della query string**: i parametri vengono convertiti e controllati (`asString`, `asNumber`) invece di fidarsi di ciò che arriva dal client.

- **Query parametrizzate** (`$1`, `$2`…) in tutte le richieste: protezione dalla SQL injection.
- **Ordinamento da una lista di valori ammessi**, mai inserito direttamente dall'input dell'utente.
- **Categorie ad albero** con `parent_id`: filtrando per "Chitarre" si ottengono anche elettriche, acustiche e classiche.
- **`unit_price` in `order_items`**: salva il prezzo al momento dell'acquisto, così gli ordini passati restano corretti se il prezzo cambia.
- **Carrello nel browser, prezzi sul server**: `localStorage` conserva solo id e quantità; nomi, prezzi e disponibilità si leggono sempre dall'API, e il totale dell'ordine lo calcola il server.
- **Ordine in una transazione con `SELECT … FOR UPDATE`**: due clienti simultanei non possono comprare lo stesso ultimo pezzo.
- **Nessuna rotta per leggere un ordine senza login**: esporrebbe i dati di spedizione a chiunque abbia l'id dell'ordine.
- **Chiavi primarie UUID** (`gen_random_uuid()`): gli id non rivelano quanti prodotti o ordini esistono. Il seed li ricava da numeri semplici, così restano uguali a ogni rilancio.
- **Indici** su categoria, marca e prezzo per velocizzare i filtri del catalogo.
- **Più immagini per prodotto** nella tabella `product_images`: la prima secondo `sort_order` è la copertina usata nelle card.
- **Ricerca con `pg_trgm`**: trova i prodotti anche con errori di battitura, usando un indice GIN.
- **Prodotti nascosti con `active = false`**: spariscono dal negozio senza essere cancellati, così gli ordini passati restano validi.
- **`updated_at` gestita da un trigger**: si aggiorna a ogni modifica del prodotto, senza dipendere dal codice dell'API.
