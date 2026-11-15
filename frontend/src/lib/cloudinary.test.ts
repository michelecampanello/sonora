import { describe, expect, it } from "vitest";
import { imageSrcSet, MAX_IMAGE_BYTES, optimizedImageUrl, placeholderImageUrl, uploadImage } from "@/lib/cloudinary";
import { mockApi } from "@/test/mockApi";

const SIGNATURE = {
  uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
  fields: { allowed_formats: "jpg,jpeg,png,webp,avif", asset_folder: "sonora/prodotti", timestamp: "1794398400", api_key: "123456", signature: "abc" },
};

const photo = (name = "basso.jpg", type = "image/jpeg", size = 1000) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("uploadImage", () => {
  it("chiede la firma al backend e invia a Cloudinary il file con i campi firmati, senza cookie", async () => {
    let sent: FormData | undefined;
    const fetchMock = mockApi({
      "POST /api/admin/uploads/signature": { body: SIGNATURE },
      "POST /v1_1/demo/image/upload": (_url, init) => {
        sent = init?.body as FormData;
        return { body: { secure_url: "https://res.cloudinary.com/demo/image/upload/v1/sonora/prodotti/basso.jpg", public_id: "x" } };
      },
    });

    const file = photo();
    await expect(uploadImage(file)).resolves.toEqual({
      url: "https://res.cloudinary.com/demo/image/upload/v1/sonora/prodotti/basso.jpg",
      publicId: "x",
    });

    for (const [name, value] of Object.entries(SIGNATURE.fields)) expect(sent?.get(name)).toBe(value);
    expect(sent?.get("file")).toBe(file);
    const cloudinaryCall = fetchMock.mock.calls.find(([input]) => String(input).startsWith("https://api.cloudinary.com"));
    expect(cloudinaryCall?.[1]?.credentials).toBeUndefined();
  });

  it("rifiuta i formati non supportati senza fare richieste", async () => {
    const fetchMock = mockApi({});
    await expect(uploadImage(photo("foto.gif", "image/gif"))).rejects.toThrow("foto.gif: formato non supportato");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rifiuta i file troppo grandi senza fare richieste", async () => {
    const fetchMock = mockApi({});
    await expect(uploadImage(photo("enorme.png", "image/png", MAX_IMAGE_BYTES + 1))).rejects.toThrow("enorme.png: il file supera i 10 MB");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("riporta il messaggio d'errore di Cloudinary", async () => {
    mockApi({
      "POST /api/admin/uploads/signature": { body: SIGNATURE },
      "POST /v1_1/demo/image/upload": { status: 400, body: { error: { message: "Invalid image file" } } },
    });
    await expect(uploadImage(photo())).rejects.toThrow("basso.jpg: caricamento non riuscito (Invalid image file)");
  });

  it("riporta l'errore del backend se Cloudinary non è configurato", async () => {
    mockApi({ "POST /api/admin/uploads/signature": { status: 503, body: { error: "Il caricamento delle immagini non è configurato" } } });
    await expect(uploadImage(photo())).rejects.toThrow("Il caricamento delle immagini non è configurato");
  });
});

describe("optimizedImageUrl e imageSrcSet", () => {
  const photoUrl = "https://res.cloudinary.com/demo/image/upload/v1794398400/sonora/prodotti/basso.jpg";

  it("chiede a Cloudinary la larghezza giusta in formato e qualità automatici", () => {
    expect(optimizedImageUrl(photoUrl, 640)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1794398400/sonora/prodotti/basso.jpg",
    );
  });

  it("propone al browser più larghezze", () => {
    const srcSet = imageSrcSet(photoUrl);
    expect(srcSet).toContain("/f_auto,q_auto,c_limit,w_320/v1794398400/sonora/prodotti/basso.jpg 320w");
    expect(srcSet).toContain("/f_auto,q_auto,c_limit,w_1280/v1794398400/sonora/prodotti/basso.jpg 1280w");
  });

  it("lascia com'è un'immagine che non è su Cloudinary", () => {
    expect(optimizedImageUrl("/prodotti/basso.svg", 640)).toBe("/prodotti/basso.svg");
    expect(imageSrcSet("/prodotti/basso.svg")).toBeUndefined();
  });
});

describe("placeholderImageUrl", () => {
  it("chiede a Cloudinary una miniatura di 24 pixel a bassa qualità", () => {
    expect(placeholderImageUrl("https://res.cloudinary.com/demo/image/upload/v1/sonora/basso.png")).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:low,c_limit,w_24/v1/sonora/basso.png",
    );
  });

  it("non ha segnaposto un'immagine che non è su Cloudinary", () => {
    expect(placeholderImageUrl("/foto/basso.png")).toBeNull();
  });
});
