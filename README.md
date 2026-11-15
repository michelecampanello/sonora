# Sonora — e-commerce di strumenti musicali

Progetto full stack in TypeScript: React (frontend) + Node.js/Express (backend) + PostgreSQL, pubblicabile su Vercel.

> Nome provvisorio: sostituiscilo con il nome che sceglierai per il negozio.
> Marche, prodotti, clienti e recensioni nei dati di prova sono inventati. I clienti di prova non possono accedere: servono solo come autori delle recensioni.
> È un progetto portfolio: nessun ordine viene spedito e nessun pagamento è reale.

## Funzionalità

- **Catalogo**: categorie e sottocategorie, ricerca che tollera gli errori di battitura, filtri per marca, prezzo e disponibilità, ordinamento e paginazione. Le foto dei prodotti arrivano da Cloudinary, ridimensionate per ogni schermo.
- **Scheda prodotto**: galleria, caratteristiche tecniche, disponibilità, recensioni con media e voti per stella.
- **Recensioni**: voto da 1 a 5 e commento facoltativo, una per persona e prodotto; badge "Acquisto verificato" per chi l'ha comprato.
- **Carrello e checkout**: carrello salvato nel browser, ordine anche senza account, pagamento alla consegna, email di conferma.
- **Account**: registrazione con email di benvenuto, accesso, reset della password via email, ordini, indirizzi salvati, nome e cognome, tema chiaro o scuro.
- **Pannello admin**: dashboard, ordini con i loro stati, prodotti con caratteristiche e foto caricate su Cloudinary, modifica di un prodotto anche direttamente dalla sua pagina nel negozio, moderazione delle recensioni.

## Stato del progetto

- [x] Tappa 1 — Backend base: database, catalogo, categorie, marche
- [x] Tappa 2 — Frontend catalogo (lista, dettaglio, ricerca, filtri)
- [x] Tappa 3 — Carrello
- [x] Tappa 4 — Registrazione e login (JWT)
- [x] Tappa 5 — Checkout e area personale (ordini, indirizzi, impostazioni). Il pagamento è solo alla consegna
- [x] Tappa 6 — Pannello admin: ordini (stati, annullamento con ritorno in magazzino), creazione e modifica dei prodotti con caratteristiche e foto caricate su Cloudinary
- [x] Tappa 7 — Email transazionali, recensioni, SEO e prestazioni
- [ ] Tappa 8 — Pubblicazione online: la configurazione per Vercel è pronta (vedi [Pubblicazione su Vercel](#pubblicazione-su-vercel))

## Avvio in locale

Requisiti: Node.js 20 o superiore, PostgreSQL.

### Backend

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

Il server parte su `http://localhost:3000`. Prova: `http://localhost:3000/api/health`

Le altre variabili di `backend/.env` sono facoltative in sviluppo: `RESEND_API_KEY` e `MAIL_FROM` per inviare davvero le email (senza, la console dice quale sarebbe partita), `CLOUDINARY_URL` per caricare le foto dal pannello admin. Le immagini dei dati di prova sono già su Cloudinary e si vedono anche senza.

Per diventare amministratore registrati dal sito e poi lancia `npm run make-admin -- tua@email.it`.

### Frontend

In un secondo terminale:

```bash
cd frontend
npm install
npm run dev
```

Il sito si apre su `http://localhost:5173`. Vite inoltra le richieste `/api` al backend sulla porta 3000, quindi sito e API sono sullo stesso indirizzo, come online.

### Comandi

Backend (`backend/`):

| Comando | Cosa fa |
|---|---|
| `npm run db:setup` | Ricrea tutte le tabelle e inserisce i dati di prova (**cancella i dati esistenti**) |
| `npm run db:migrate` | Aggiorna un database già esistente senza cancellare i dati |
| `npm run typecheck` | Controlla i tipi senza generare file |
| `npm run build` | Compila TypeScript in JavaScript nella cartella `dist/` |
| `npm start` | Avvia la versione compilata |
| `npm test` | Esegue i test (`npm run test:watch` li rilancia a ogni modifica) |
| `npm run make-admin -- email@example.com` | Dà il ruolo di amministratore a un account già registrato |
| `npm run upload-images -- <cartella> <cartella-cloudinary>` | Carica su Cloudinary le immagini PNG/JPG/WebP di una cartella, con il nome del file come id (es. quelle dei dati di prova in `sonora/seed/prodotti`) |

Frontend (`frontend/`):

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il sito in sviluppo, con l'aggiornamento immediato delle modifiche |
| `npm run build` | Controlla i tipi e crea la versione da pubblicare in `dist/` |
| `npm run preview` | Mostra in locale la versione di `dist/` |
| `npm run typecheck` | Controlla i tipi senza generare file |
| `npm run lint` | Controlla il codice con ESLint |
| `npm run format` | Formatta il codice con Prettier |
| `npm test` | Esegue i test (`npm run test:watch` li rilancia a ogni modifica) |

## Test

Entrambe le parti usano [Vitest](https://vitest.dev). In `backend/` e in `frontend/`:

```bash
npm test
```

- **Backend** (`backend/tests/`): test unitari su validazione, contenuto delle email e firma di Cloudinary, e test d'integrazione che chiamano le API vere con Supertest, su un database PostgreSQL. Coprono catalogo e filtri, registrazione, accesso, reset della password, limite ai tentativi, area personale, ordini, recensioni, pannello admin e invio delle email. Per gli ordini verificano il totale calcolato dal server, il magazzino scalato in una transazione e due acquisti simultanei dell'ultimo pezzo.
  I test usano un database separato, creato e riempito con `schema.sql` e `seed.sql` a ogni esecuzione: è quello di `DATABASE_URL` con `_test` in coda al nome (es. `music_store_test`), oppure quello indicato in `TEST_DATABASE_URL`. Il nome deve finire con `_test`, così il database di sviluppo non viene mai cancellato, e senza `TEST_DATABASE_URL` il database deve essere su questo computer: i test non creano database su server remoti. Le email non vengono inviate e Cloudinary non viene mai chiamato davvero.
- **Frontend** (`src/**/*.test.ts(x)`, accanto al codice): Testing Library con jsdom e un finto `fetch`, senza backend. Coprono formattazione, filtri del catalogo nell'URL, carrello, accesso, menu dell'account, tema, impostazioni, recensioni, modifica dei prodotti dal pannello e dalla scheda, metadati SEO e caricamento delle immagini.

## Pubblicazione su Vercel

Il repository è un unico progetto Vercel con due **servizi**, definiti in [`vercel.json`](vercel.json) e pubblicati sullo stesso dominio:

| Servizio | Cartella | Cosa è | Pubblico su |
|---|---|---|---|
| `backend` | `backend/` | L'API Express, eseguita come funzione a partire da `src/server.mts` (Vercel compila il TypeScript da sé; `.mts` diventa `.mjs`, che Node carica sempre come modulo ES) | `/api/*` |
| `frontend` | `frontend/` | Il sito React, creato da Vite in `dist/` | tutto il resto |

- Ogni servizio si installa e si compila da solo nella sua cartella.
- Le regole `rewrites` in cima a `vercel.json` decidono chi risponde: `/api/*` va al backend, che riceve l'indirizzo completo (es. `/api/products`), quindi le rotte di Express sono le stesse del server locale; tutto il resto va al frontend.
- Dentro il servizio `frontend`, ogni pagina che non è un file porta a `index.html`, così le pagine di React Router funzionano anche aprendole da un link. I file in `/assets` hanno nomi che cambiano a ogni versione, quindi i browser li tengono in cache per un anno.
- I servizi non si chiamano tra loro dal server: il frontend è un sito statico, e le chiamate a `/api` partono dal browser verso lo stesso dominio. Per questo non servono *bindings*, e il cookie di sessione funziona senza configurare CORS.
- Le funzioni girano nella regione `fra1` (Francoforte).

Per provare tutto insieme in locale come su Vercel: `vercel dev` dalla radice del repository (richiede la [CLI di Vercel](https://vercel.com/docs/cli) e il progetto collegato con `vercel link`). Per lo sviluppo di tutti i giorni bastano i due `npm run dev` descritti sopra.

### 1. Database

Serve un PostgreSQL raggiungibile da internet, per esempio [Neon](https://neon.tech) (piano gratuito; scegli la regione di Francoforte, vicina alle funzioni). Neon dà due indirizzi dello stesso database:

- **con il pooling** (l'host contiene `-pooler`): va in `DATABASE_URL` su Vercel, perché le funzioni aprono molte connessioni brevi;
- **senza pooling**: va usato per creare le tabelle, caricare i dati di prova e lanciare le migrazioni. Il pooler riusa le sessioni del server tra connessioni diverse, e le funzioni temporanee del seed (`pg_temp.seed_id`) risulterebbero già esistenti.

Crea le tabelle e i dati di prova dal tuo computer, con l'indirizzo **senza pooling**:

```bash
cd backend
psql "postgres://…" -q -1 -v ON_ERROR_STOP=1 -f db/schema.sql -f db/seed.sql
```

Per gli aggiornamenti successivi lancia invece le migrazioni (`db/migrations/*.sql`) con lo stesso indirizzo: non cancellano i dati.

Se nel `backend/.env` del tuo computer metti l'indirizzo di Neon, per i test indica un database locale con `TEST_DATABASE_URL`: senza, i test si fermano invece di creare database online.

### 2. Progetto Vercel

Importa il repository su [vercel.com/new](https://vercel.com/new) lasciando la cartella principale (*Root Directory*) alla radice del repository: i servizi, con i loro comandi di build, sono già in `vercel.json`.

Nelle impostazioni del progetto (*Settings → Environment Variables*) aggiungi:

| Variabile | Valore |
|---|---|
| `DATABASE_URL` | L'indirizzo del database **con il pooling** |
| `JWT_SECRET` | Almeno 32 caratteri casuali: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `RESEND_API_KEY` | Chiave di [Resend](https://resend.com/api-keys) |
| `MAIL_FROM` | Mittente con un dominio verificato su Resend, es. `Sonora <noreply@tuodominio.it>` |
| `CLOUDINARY_URL` | Da [console.cloudinary.com](https://console.cloudinary.com), alla voce *API Keys* |
| `FRONTEND_ORIGIN` | Facoltativa: l'indirizzo del sito per i link nelle email. Se manca si usa il dominio di produzione del progetto Vercel |

Non impostare `NODE_ENV`: Vercel lo mette già a `production` nelle funzioni, e impostato a mano durante l'installazione salterebbe gli strumenti di build. `VITE_API_URL` non serve, perché l'API è sullo stesso dominio.

In produzione il backend non parte senza `RESEND_API_KEY` e `MAIL_FROM`: senza le email di reset e conferma non arriverebbero.

### 3. Dopo la prima pubblicazione

- Registrati dal sito e diventa amministratore lanciando dal tuo computer `DATABASE_URL="postgres://…" npm run make-admin -- tua@email.it` in `backend/`.
- Prova `https://<tuo-sito>/api/health`: deve rispondere `{"status":"ok"}`.

### Cosa cambia rispetto al server locale

- Le email e la pulizia delle foto su Cloudinary partono dopo la risposta: su Vercel passano da `waitUntil` ([`backend/src/background.ts`](backend/src/background.ts)), che tiene attiva la funzione finché hanno finito. In locale non cambia nulla.
- Il pool di connessioni a Postgres è registrato con `attachDatabasePool`, così Vercel chiude le connessioni inattive prima di sospendere la funzione. Il backend non imposta parametri di sessione sulla connessione, che il pooler di Neon rifiuterebbe: la soglia della ricerca tollerante agli errori sta nella query.
- Express si fida dell'header `X-Forwarded-For` di Vercel (`trust proxy`), per vedere l'IP vero di chi visita.
- Il limite ai tentativi di accesso è tenuto in memoria, quindi vale per ogni istanza della funzione e non per tutto il sito insieme: protegge dai tentativi ripetuti, ma con traffico alto Vercel può dividerli su più istanze. Per un limite condiviso servirebbe uno store esterno, come Redis.

## API

| Metodo | URL | Descrizione |
|---|---|---|
| GET | `/api/products` | Catalogo con filtri, ordinamento e paginazione |
| GET | `/api/products/:slug` | Dettaglio prodotto con caratteristiche tecniche e immagini |
| GET | `/api/products/:slug/reviews?page=` | Recensioni, dalla più recente, con media e voti per stella; con l'accesso anche la propria |
| PUT | `/api/products/:slug/reviews/mine` | Scrive o modifica la propria recensione (voto 1-5, commento facoltativo); richiede l'accesso |
| DELETE | `/api/products/:slug/reviews/mine` | Elimina la propria recensione |
| GET | `/api/categories` | Categorie con sottocategorie |
| GET | `/api/brands` | Elenco marche |
| GET | `/api/brands/:slug/products` | Prodotti di una marca |
| POST | `/api/orders` | Crea un ordine, collegato all'utente se ha fatto l'accesso, e scala il magazzino |
| POST | `/api/auth/register` | Crea un account (`first_name`, `last_name`, `email`, `password`) e avvia la sessione |
| POST | `/api/auth/login` | Avvia la sessione |
| POST | `/api/auth/logout` | Chiude la sessione |
| GET | `/api/auth/me` | Utente collegato, 401 se non c'è una sessione |
| POST | `/api/auth/forgot-password` | Invia il link di reset; risponde allo stesso modo se l'email non è registrata |
| POST | `/api/auth/reset-password` | Imposta la nuova password con il link ricevuto e chiude tutte le sessioni |
| GET | `/api/account/orders` | Ordini dell'utente, paginati (`?page=2`) |
| GET | `/api/account/orders/:id` | Dettaglio di un ordine dell'utente |
| PATCH | `/api/account/profile` | Cambia nome, cognome ed email; per l'email serve la password attuale |
| PUT | `/api/account/password` | Cambia la password e chiude le altre sessioni |
| GET, POST | `/api/account/addresses` | Indirizzi salvati |
| PUT, DELETE | `/api/account/addresses/:id` | Modifica o elimina un indirizzo |
| POST | `/api/account/addresses/:id/default` | Imposta l'indirizzo predefinito |

### Pannello admin

Tutte le rotte rispondono 401 senza sessione e 403 a chi non è amministratore.

| Metodo | URL | Descrizione |
|---|---|---|
| GET | `/api/admin/stats` | Ordini per stato, incassato, prodotti quasi esauriti |
| GET | `/api/admin/orders` | Tutti gli ordini, paginati, filtrabili per stato (`?status=pending`) |
| GET | `/api/admin/orders/:id` | Dettaglio di un ordine, con gli stati in cui può passare |
| PATCH | `/api/admin/orders/:id/status` | Cambia lo stato; annullando, gli articoli tornano in magazzino |
| GET | `/api/admin/products` | Tutti i prodotti, anche i nascosti (`?q=`, `?lowStock=true`) |
| POST | `/api/admin/products` | Crea un prodotto con caratteristiche e immagini |
| GET | `/api/admin/products/:id` | Il prodotto completo, per il form di modifica |
| PUT | `/api/admin/products/:id` | Sostituisce tutti i dati del prodotto; lo slug resta lo stesso |
| PATCH | `/api/admin/products/:id` | Modifica solo prezzo, magazzino, visibilità o evidenza |
| DELETE | `/api/admin/reviews/:id` | Elimina una recensione qualsiasi (moderazione) |
| POST | `/api/admin/uploads/signature` | Firma il caricamento di una foto su Cloudinary; 503 se `CLOUDINARY_URL` manca |

Il pagamento avviene alla consegna, quindi un ordine passa da *in lavorazione* a *spedito* e poi a *pagato*. Si può annullare finché non è pagato. I prodotti non si eliminano, perché gli ordini fanno riferimento a loro: per toglierli dal negozio si nascondono.

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

### Backend

- **Backend a tre livelli**: `routes/` collega URL e controller, `controllers/` legge e valida la richiesta e sceglie la risposta HTTP, `services/` contiene le query e la logica di business, senza conoscere Express.
- **Sessione con JWT in un cookie `httpOnly` e `SameSite=Lax`**: JavaScript non può leggere il token e gli altri siti non possono usarlo. Online sito e API devono stare sullo stesso dominio: su Vercel lo sono, perché l'API è una funzione dello stesso progetto.
- **Reset della password con link monouso** valido un'ora: nel database resta solo l'impronta SHA-256 del token, e il token viaggia dopo il `#` dell'URL, quindi non finisce nei log dei server. L'email parte con [Resend](https://resend.com), in HTML e in testo semplice. Se l'invio fallisce il link viene cancellato, così si può chiederne subito un altro invece di aspettare i 2 minuti fra una richiesta e l'altra.
- **Email di benvenuto e di conferma dell'ordine**, sempre con Resend. Partono dopo aver risposto al browser: se l'invio non riesce l'errore finisce nei log del server, ma l'account o l'ordine restano validi. La conferma riepiloga articoli, totale e indirizzo di spedizione, e va all'email indicata nel checkout; per chi ha fatto l'accesso porta anche alla pagina dell'ordine nell'area personale.
  Configurazione in `backend/.env`: `RESEND_API_KEY` (da [resend.com/api-keys](https://resend.com/api-keys)) e `MAIL_FROM`, un mittente con un dominio verificato su Resend. In sviluppo, senza `MAIL_FROM` si usa l'indirizzo di prova `onboarding@resend.dev`; senza `RESEND_API_KEY` nessuna email parte e la console del backend dice quale sarebbe partita (per il reset, con il link). In produzione il server non parte se manca una delle due.
- **Pannello admin nello stesso frontend**, sotto `/admin`: React.lazy lo mette in un file JavaScript separato, che chi compra non scarica. Il frontend nasconde il pannello a chi non è admin solo per comodità; a proteggere i dati è il backend, con il middleware `requireAdmin` su tutte le rotte `/api/admin`. Un admin si crea solo con `npm run make-admin`, mai da un'API.
- **Foto dei prodotti su Cloudinary, caricate direttamente dal browser**: il backend firma soltanto la richiesta (SHA-1 dei parametri, come da [documentazione](https://cloudinary.com/documentation/authentication_signatures)), quindi il segreto API non arriva mai al browser e i file non passano dal nostro server. La firma fissa formati ammessi e cartella, e vale un'ora. Si configura con `CLOUDINARY_URL` in `backend/.env`; senza, le immagini si indicano con un indirizzo.
  Di ogni foto caricata si salva il `public_id` restituito da Cloudinary. Quando una foto viene tolta da un prodotto, e nessun altro prodotto la usa, dopo il salvataggio viene cancellata da Cloudinary e dalla cache della CDN. Le immagini indicate con un indirizzo non vengono mai cancellate.
- **Password con bcrypt e limite ai tentativi** su login e registrazione. Il limite è per indirizzo IP: su Vercel Express legge l'IP vero dall'header del proxy (`trust proxy`).
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
- **Immagini dei dati di prova su Cloudinary**: PNG caricati con `npm run upload-images` nella cartella `sonora/seed`, separata dalle foto caricate dal pannello. Non hanno un `public_id` salvato nel database, quindi togliendole da un prodotto non vengono cancellate.
- **Ricerca con `pg_trgm`**: trova i prodotti anche con errori di battitura (`word_similarity` con una soglia di 0,5 scritta nella query), con indici GIN per le ricerche `ILIKE`.
- **Prodotti nascosti con `active = false`**: spariscono dal negozio senza essere cancellati, così gli ordini passati restano validi.
- **`updated_at` gestita da un trigger**: si aggiorna a ogni modifica del prodotto, senza dipendere dal codice dell'API.
- **Recensioni con un vincolo `UNIQUE (product_id, user_id)`**: scriverne una seconda la modifica invece di aggiungerla. Media e numero arrivano con il catalogo, e l'autore si mostra con nome e iniziale del cognome. "Acquisto verificato" si calcola dagli ordini non annullati, non si salva.
- **Migrazioni che si possono rilanciare** (`IF NOT EXISTS`, aggiornamenti condizionati): `db:migrate` le esegue tutte ogni volta, senza tenere traccia di quali sono già state applicate.

### Frontend

- **React 19, Vite, Tailwind CSS e componenti [shadcn/ui](https://ui.shadcn.com) su Base UI**, con React Router. Il linguaggio visivo è quello di un banco regia: pannelli pieni, etichette in monospazio, spie luminose per disponibilità e stati.
- **Tema chiaro e scuro** con le variabili CSS: si sceglie nelle impostazioni o dall'header, e uno script in `index.html` applica il tema salvato prima del primo disegno, senza lampi.
- **Pagine caricate a richiesta**: ogni pagina è un file JavaScript a parte, scaricato solo quando serve; la home resta nel file principale. Anche il form di modifica dei prodotti si scarica solo quando un admin lo apre.
- **Immagini da Cloudinary nel formato e nella dimensione giusti** (`f_auto`, `q_auto`, `srcset`): WebP o AVIF, larghe quanto serve allo schermo. Mentre arrivano si vede una miniatura sfocata di 24 pixel, poi l'immagine entra con una dissolvenza.
- **SEO**: titolo, description e indirizzo canonico per ogni pagina, `noindex` sulle pagine personali e di servizio, dati strutturati schema.org dei prodotti con prezzo, disponibilità e voto medio, `robots.txt`.
- **Accessibilità**: link veri nei menu, etichette per i lettori di schermo, voto a stelle usabile da tastiera, animazioni ridotte se il sistema lo chiede.
