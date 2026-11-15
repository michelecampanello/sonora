import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, uploadImage } from "@/lib/cloudinary";
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
