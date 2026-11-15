import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setUser } from "@/hooks/useAuth";
import AdminRoutes from "@/pages/admin/AdminRoutes";
import { mockApi, sentBody, type MockResponse } from "@/test/mockApi";
import { renderPage } from "@/test/render";
import type { AdminProductDetail, Brand, Category } from "@/lib/types";

const PRODUCT_ID = "00000000-0000-4000-8000-0000000000aa";
const BASS = "00000000-0000-4000-8000-0000000000b1";
const BASS_ELECTRIC = "00000000-0000-4000-8000-0000000000b2";
const BRAND = "00000000-0000-4000-8000-0000000000c1";

const categories: Category[] = [
  {
    id: BASS,
    name: "Bassi",
    slug: "bassi",
    description: null,
    children: [{ id: BASS_ELECTRIC, name: "Bassi elettrici", slug: "bassi-elettrici", description: null }],
  },
];
const brands: Brand[] = [{ id: BRAND, slug: "nordwood", name: "Nordwood" }];

const product: AdminProductDetail = {
  id: PRODUCT_ID,
  sku: "SON-0100",
  slug: "nordwood-jb-5",
  name: "Nordwood JB-5",
  description: "Basso a 5 corde.",
  price: "899.00",
  stock: 4,
  active: true,
  featured: false,
  brand: "Nordwood",
  category: "Bassi elettrici",
  category_id: BASS_ELECTRIC,
  brand_id: BRAND,
  specs: [{ label: "Corde", value: "5" }],
  images: [
    { url: "/prodotti/fronte.svg", alt: "Fronte", public_id: null },
    { url: "/prodotti/retro.svg", alt: null, public_id: null },
  ],
};

const catalogRoutes = {
  "GET /api/categories": { body: categories },
  "GET /api/brands": { body: brands },
};

const renderAdmin = (url: string) => renderPage(<AdminRoutes />, { path: "/admin/*", url });

beforeEach(() =>
  setUser({ id: "00000000-0000-4000-8000-0000000000ad", name: "Admin", email: "admin@example.com", role: "admin" }),
);
afterEach(() => setUser(null));

describe("nuovo prodotto", () => {
  it("invia tutti i campi e poi apre la pagina del prodotto creato", async () => {
    const fetchMock = mockApi({
      ...catalogRoutes,
      "POST /api/admin/products": { status: 201, body: product },
      [`GET /api/admin/products/${PRODUCT_ID}`]: { body: product },
    });
    const { user } = renderAdmin("/admin/prodotti/nuovo");

    await user.type(await screen.findByLabelText("Nome"), "Nordwood JB-5");
    await user.type(screen.getByLabelText("Codice articolo"), "son-0100");
    await user.selectOptions(screen.getByLabelText("Categoria"), "Bassi elettrici");
    await user.selectOptions(screen.getByLabelText("Marca"), "Nordwood");
    await user.type(screen.getByLabelText("Prezzo (€)"), "899,00");
    await user.clear(screen.getByLabelText("Pezzi in magazzino"));
    await user.type(screen.getByLabelText("Pezzi in magazzino"), "4");
    await user.type(screen.getByLabelText("Descrizione"), "Basso a 5 corde.");

    await user.click(screen.getByRole("button", { name: "Aggiungi caratteristica" }));
    await user.type(screen.getByLabelText("Nome caratteristica 1"), "Corde");
    await user.type(screen.getByLabelText("Valore caratteristica 1"), "5");

    await user.click(screen.getByRole("button", { name: "Crea prodotto" }));

    expect(sentBody(fetchMock, "/api/admin/products")).toEqual({
      sku: "SON-0100",
      name: "Nordwood JB-5",
      description: "Basso a 5 corde.",
      price: "899.00",
      stock: 4,
      active: true,
      featured: false,
      category_id: BASS_ELECTRIC,
      brand_id: BRAND,
      specs: [{ label: "Corde", value: "5" }],
      images: [],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Prodotto creato.");
    expect(screen.getByTestId("current-path")).toHaveTextContent(`/admin/prodotti/${PRODUCT_ID}`);
    expect(screen.getByRole("button", { name: "Salva modifiche" })).toBeInTheDocument();
  });

  it("mostra l'errore del server e lascia i dati nel form", async () => {
    mockApi({
      ...catalogRoutes,
      "POST /api/admin/products": { status: 409, body: { error: "Esiste già un prodotto con questo codice articolo" } },
    });
    const { user } = renderAdmin("/admin/prodotti/nuovo");

    await user.type(await screen.findByLabelText("Nome"), "Doppione");
    await user.type(screen.getByLabelText("Codice articolo"), "SON-0001");
    await user.selectOptions(screen.getByLabelText("Categoria"), "Bassi elettrici");
    await user.selectOptions(screen.getByLabelText("Marca"), "Nordwood");
    await user.type(screen.getByLabelText("Prezzo (€)"), "10");
    await user.click(screen.getByRole("button", { name: "Crea prodotto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Esiste già un prodotto con questo codice articolo");
    expect(screen.getByLabelText("Nome")).toHaveValue("Doppione");
    expect(screen.getByTestId("current-path")).toHaveTextContent("/admin/prodotti/nuovo");
  });
});

describe("modifica prodotto", () => {
  it("parte dai dati salvati e invia la versione modificata con PUT", async () => {
    let saved: MockResponse = { body: product };
    const fetchMock = mockApi({
      ...catalogRoutes,
      [`GET /api/admin/products/${PRODUCT_ID}`]: { body: product },
      [`PUT /api/admin/products/${PRODUCT_ID}`]: () => saved,
    });
    saved = { body: { ...product, name: "Nordwood JB-5 Fretless", images: [product.images[1]!, product.images[0]!] } };
    const { user } = renderAdmin(`/admin/prodotti/${PRODUCT_ID}`);

    const name = await screen.findByLabelText("Nome");
    expect(name).toHaveValue("Nordwood JB-5");
    expect(screen.getByLabelText("Categoria")).toHaveValue(BASS_ELECTRIC);
    expect(screen.getByText(/\/prodotti\/nordwood-jb-5/)).toBeInTheDocument();

    await user.type(name, " Fretless");
    // La seconda immagine diventa la copertina
    await user.click(screen.getByRole("button", { name: "Sposta su immagine 2" }));
    await user.click(screen.getByRole("button", { name: "Salva modifiche" }));

    expect(sentBody(fetchMock, `/api/admin/products/${PRODUCT_ID}`)).toMatchObject({
      name: "Nordwood JB-5 Fretless",
      price: "899.00",
      stock: 4,
      images: [
        { url: "/prodotti/retro.svg", alt: "", public_id: null },
        { url: "/prodotti/fronte.svg", alt: "Fronte", public_id: null },
      ],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Modifiche salvate.");
    expect(screen.getByRole("link", { name: "Vedi nel negozio" })).toHaveAttribute("href", "/prodotti/nordwood-jb-5");
  });

  it("rimuove caratteristiche e immagini", async () => {
    const fetchMock = mockApi({
      ...catalogRoutes,
      [`GET /api/admin/products/${PRODUCT_ID}`]: { body: product },
      [`PUT /api/admin/products/${PRODUCT_ID}`]: { body: { ...product, specs: [], images: [] } },
    });
    const { user } = renderAdmin(`/admin/prodotti/${PRODUCT_ID}`);

    await user.click(await screen.findByRole("button", { name: "Rimuovi caratteristica 1" }));
    await user.click(screen.getByRole("button", { name: "Rimuovi immagine 1" }));
    await user.click(screen.getByRole("button", { name: "Rimuovi immagine 1" }));
    await user.click(screen.getByRole("button", { name: "Salva modifiche" }));

    expect(sentBody(fetchMock, `/api/admin/products/${PRODUCT_ID}`)).toMatchObject({ specs: [], images: [] });
  });

  it("mostra un errore se il prodotto non esiste", async () => {
    mockApi({ ...catalogRoutes, [`GET /api/admin/products/${PRODUCT_ID}`]: { status: 404, body: { error: "Prodotto non trovato" } } });
    renderAdmin(`/admin/prodotti/${PRODUCT_ID}`);
    expect(await screen.findByText("Prodotto non trovato")).toBeInTheDocument();
  });
});

describe("caricamento delle foto", () => {
  const signature = {
    uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
    fields: { allowed_formats: "jpg", asset_folder: "sonora/prodotti", timestamp: "1", api_key: "k", signature: "s" },
  };

  it("aggiunge in fondo le foto caricate e le salva con il prodotto", async () => {
    let n = 0;
    const fetchMock = mockApi({
      ...catalogRoutes,
      [`GET /api/admin/products/${PRODUCT_ID}`]: { body: product },
      "POST /api/admin/uploads/signature": { body: signature },
      "POST /v1_1/demo/image/upload": () => {
        n += 1;
        return { body: { secure_url: `https://res.cloudinary.com/demo/image/upload/v1/foto-${n}.jpg`, public_id: `foto-${n}` } };
      },
      [`PUT /api/admin/products/${PRODUCT_ID}`]: { body: product },
    });
    const { user } = renderAdmin(`/admin/prodotti/${PRODUCT_ID}`);

    await user.upload(await screen.findByLabelText("Scegli le foto da caricare"), [
      new File(["a"], "uno.jpg", { type: "image/jpeg" }),
      new File(["b"], "due.png", { type: "image/png" }),
    ]);

    expect(await screen.findByLabelText("Indirizzo immagine 4")).toHaveValue("https://res.cloudinary.com/demo/image/upload/v1/foto-2.jpg");
    expect(screen.getByLabelText("Indirizzo immagine 3")).toHaveValue("https://res.cloudinary.com/demo/image/upload/v1/foto-1.jpg");

    await user.click(screen.getByRole("button", { name: "Salva modifiche" }));
    const body = sentBody(fetchMock, `/api/admin/products/${PRODUCT_ID}`) as { images: { url: string; public_id: string | null }[] };
    // Il public_id va con il prodotto: serve al backend per cancellare la foto quando viene tolta
    expect(body.images.map((image) => [image.url, image.public_id])).toEqual([
      ["/prodotti/fronte.svg", null],
      ["/prodotti/retro.svg", null],
      ["https://res.cloudinary.com/demo/image/upload/v1/foto-1.jpg", "foto-1"],
      ["https://res.cloudinary.com/demo/image/upload/v1/foto-2.jpg", "foto-2"],
    ]);
  });

  it("cambiando a mano l'indirizzo di una foto caricata, non la si cancella più da Cloudinary", async () => {
    const uploaded = { url: "https://res.cloudinary.com/demo/image/upload/v1/foto.jpg", alt: null, public_id: "foto" };
    const fetchMock = mockApi({
      ...catalogRoutes,
      [`GET /api/admin/products/${PRODUCT_ID}`]: { body: { ...product, images: [uploaded] } },
      [`PUT /api/admin/products/${PRODUCT_ID}`]: { body: product },
    });
    const { user } = renderAdmin(`/admin/prodotti/${PRODUCT_ID}`);

    const url = await screen.findByLabelText("Indirizzo immagine 1");
    await user.clear(url);
    await user.type(url, "/prodotti/altra.svg");
    await user.click(screen.getByRole("button", { name: "Salva modifiche" }));

    expect(sentBody(fetchMock, `/api/admin/products/${PRODUCT_ID}`)).toMatchObject({
      images: [{ url: "/prodotti/altra.svg", public_id: null }],
    });
  });

  it("mostra l'errore di una foto non caricata e tiene le altre", async () => {
    let n = 0;
    mockApi({
      ...catalogRoutes,
      [`GET /api/admin/products/${PRODUCT_ID}`]: { body: { ...product, images: [] } },
      "POST /api/admin/uploads/signature": { body: signature },
      "POST /v1_1/demo/image/upload": () =>
        ++n === 1
          ? { status: 400, body: { error: { message: "Invalid image file" } } }
          : { body: { secure_url: "https://res.cloudinary.com/demo/image/upload/v1/ok.jpg", public_id: "ok" } },
    });
    const { user } = renderAdmin(`/admin/prodotti/${PRODUCT_ID}`);

    await user.upload(await screen.findByLabelText("Scegli le foto da caricare"), [
      new File(["a"], "rotta.jpg", { type: "image/jpeg" }),
      new File(["b"], "buona.jpg", { type: "image/jpeg" }),
    ]);

    expect(await screen.findByRole("alert")).toHaveTextContent("rotta.jpg: caricamento non riuscito (Invalid image file)");
    expect(await screen.findByLabelText("Indirizzo immagine 1")).toHaveValue("https://res.cloudinary.com/demo/image/upload/v1/ok.jpg");
    expect(screen.queryByLabelText("Indirizzo immagine 2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Carica foto" })).toBeEnabled();
  });
});

describe("elenco prodotti", () => {
  it("porta al form di creazione e a quello di modifica", async () => {
    mockApi({
      "GET /api/admin/products": { body: { items: [product], total: 1, page: 1, pages: 1 } },
    });
    renderAdmin("/admin/prodotti");

    expect(await screen.findByRole("link", { name: "Nordwood JB-5" })).toHaveAttribute("href", `/admin/prodotti/${PRODUCT_ID}`);
    const section = screen.getByRole("heading", { name: "Prodotti" }).parentElement!;
    expect(within(section).getByRole("link", { name: "Nuovo prodotto" })).toHaveAttribute("href", "/admin/prodotti/nuovo");
  });
});
