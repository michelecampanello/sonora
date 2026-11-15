import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ALLOWED_FORMATS,
  CloudinaryError,
  cloudinaryConfig,
  createUploadSignature,
  destroyImage,
  isCloudinaryImage,
  signParams,
  UPLOAD_FOLDER,
} from "../../src/services/cloudinary.service.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const CONFIG = { cloudName: "sonora-demo", apiKey: "123456", apiSecret: "segreto-xyz" };

describe("signParams", () => {
  // Gli esempi della documentazione di Cloudinary, con il segreto "abcd":
  // https://cloudinary.com/documentation/authentication_signatures
  it("coincide con il primo esempio della documentazione", () => {
    expect(signParams({ timestamp: 1315060510 }, "abcd")).toBe("a21ad0f63beb4de2e5575204b79ab90bffb02c10");
  });

  it("coincide con il secondo esempio, che ordina più parametri", () => {
    // Passati apposta fuori ordine: la firma deve ordinarli da sola
    const params = { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" };
    expect(signParams(params, "abcd")).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
});

describe("cloudinaryConfig", () => {
  it("senza CLOUDINARY_URL restituisce null", () => {
    vi.stubEnv("CLOUDINARY_URL", "");
    expect(cloudinaryConfig()).toBeNull();
  });

  it("legge chiave, segreto e cloud dal formato della dashboard", () => {
    vi.stubEnv("CLOUDINARY_URL", "cloudinary://123456:segreto-xyz@sonora-demo");
    expect(cloudinaryConfig()).toEqual({ cloudName: "sonora-demo", apiKey: "123456", apiSecret: "segreto-xyz" });
  });

  it.each(["https://123:abc@demo", "cloudinary://123@demo", "non è un url"])("rifiuta %j con un errore chiaro", (value) => {
    vi.stubEnv("CLOUDINARY_URL", value);
    expect(() => cloudinaryConfig()).toThrow(/cloudinary:\/\/api_key:api_secret@cloud_name/);
  });
});

describe("createUploadSignature", () => {
  it("firma cartella, formati e ora, e non contiene il segreto", () => {
    const config = { cloudName: "sonora-demo", apiKey: "123456", apiSecret: "segreto-xyz" };
    const { uploadUrl, fields } = createUploadSignature(config, new Date("2026-11-11T12:00:00Z"));

    expect(uploadUrl).toBe("https://api.cloudinary.com/v1_1/sonora-demo/image/upload");
    expect(fields).toEqual({
      allowed_formats: ALLOWED_FORMATS,
      asset_folder: UPLOAD_FOLDER,
      timestamp: "1794398400",
      api_key: "123456",
      signature: signParams({ allowed_formats: ALLOWED_FORMATS, asset_folder: UPLOAD_FOLDER, timestamp: 1794398400 }, "segreto-xyz"),
    });
    expect(JSON.stringify(fields)).not.toContain("segreto-xyz");
  });
});

describe("isCloudinaryImage", () => {
  it.each([
    ["https://res.cloudinary.com/sonora-demo/image/upload/v1731300000/abc123.jpg", "abc123"],
    ["https://res.cloudinary.com/sonora-demo/image/upload/abc123.webp", "abc123"],
    ["https://res.cloudinary.com/sonora-demo/image/upload/f_auto,q_auto/v1/sonora/prodotti/basso-5.png", "sonora/prodotti/basso-5"],
  ])("accetta %s con public_id %s", (url, publicId) => {
    expect(isCloudinaryImage(url, publicId, CONFIG)).toBe(true);
  });

  it.each([
    ["foto di un altro cloud", "https://res.cloudinary.com/altro-cloud/image/upload/v1/abc123.jpg", "abc123"],
    ["public_id diverso da quello nell'URL", "https://res.cloudinary.com/sonora-demo/image/upload/v1/abc123.jpg", "altra-foto"],
    ["solo la fine del public_id", "https://res.cloudinary.com/sonora-demo/image/upload/v1/xabc123.jpg", "abc123"],
    ["un altro dominio", "https://evil.example/sonora-demo/image/upload/v1/abc123.jpg", "abc123"],
    ["http invece di https", "http://res.cloudinary.com/sonora-demo/image/upload/v1/abc123.jpg", "abc123"],
    ["public_id con caratteri non ammessi", "https://res.cloudinary.com/sonora-demo/image/upload/v1/a.jpg", "a?b"],
  ])("rifiuta %s", (_case, url, publicId) => {
    expect(isCloudinaryImage(url, publicId, CONFIG)).toBe(false);
  });
});

describe("destroyImage", () => {
  const respond = (status: number, body: unknown) =>
    vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

  it("invia una richiesta firmata che cancella anche la cache della CDN", async () => {
    const fetchMock = respond(200, { result: "ok" });
    vi.stubGlobal("fetch", fetchMock);

    await destroyImage(CONFIG, "sonora/prodotti/basso", new Date("2026-11-11T12:00:00Z"));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.cloudinary.com/v1_1/sonora-demo/image/destroy");
    expect(init?.method).toBe("POST");
    const body = Object.fromEntries(new URLSearchParams(String(init?.body)));
    expect(body).toEqual({
      invalidate: "true",
      public_id: "sonora/prodotti/basso",
      timestamp: "1794398400",
      api_key: "123456",
      signature: signParams({ invalidate: "true", public_id: "sonora/prodotti/basso", timestamp: 1794398400 }, "segreto-xyz"),
    });
    expect(String(init?.body)).not.toContain("segreto-xyz");
  });

  it("una foto già cancellata non è un errore", async () => {
    vi.stubGlobal("fetch", respond(200, { result: "not found" }));
    await expect(destroyImage(CONFIG, "abc")).resolves.toBeUndefined();
  });

  it("lancia un CloudinaryError con il motivo se Cloudinary rifiuta", async () => {
    vi.stubGlobal("fetch", respond(401, { error: { message: "Invalid Signature" } }));
    const error = await destroyImage(CONFIG, "abc").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(CloudinaryError);
    expect((error as Error).message).toBe("Cancellazione di abc da Cloudinary non riuscita: Invalid Signature");
  });
});
