import { postJson, uploadSignaturePath } from "@/lib/api";

/** Oltre questa dimensione il form rifiuta il file prima di caricarlo. Il limite vero lo decide il piano Cloudinary. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/avif";

interface UploadSignature {
  uploadUrl: string;
  fields: Record<string, string>;
}

export interface UploadedImage {
  url: string;
  /** Serve al backend per cancellare la foto da Cloudinary quando viene tolta dal prodotto */
  publicId: string;
}

/**
 * Carica un'immagine su Cloudinary e restituisce il suo indirizzo https e il suo public_id.
 * Il file va dal browser direttamente a Cloudinary: il nostro backend firma soltanto la richiesta,
 * e la firma vale per i formati e la cartella decisi lì, non modificabili da qui.
 */
export async function uploadImage(file: File): Promise<UploadedImage> {
  if (!ACCEPTED_IMAGE_TYPES.split(",").includes(file.type)) {
    throw new Error(`${file.name}: formato non supportato, usa JPG, PNG, WebP o AVIF`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${file.name}: il file supera i ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
  }

  const { uploadUrl, fields } = await postJson<UploadSignature>(uploadSignaturePath, {});
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append("file", file);

  // Senza credentials: a Cloudinary non vanno inviati i cookie del nostro sito
  const response = await fetch(uploadUrl, { method: "POST", body: form });
  const body = (await response.json().catch(() => null)) as {
    secure_url?: unknown;
    public_id?: unknown;
    error?: { message?: unknown };
  } | null;
  if (!response.ok || typeof body?.secure_url !== "string" || typeof body.public_id !== "string") {
    const reason = typeof body?.error?.message === "string" ? body.error.message : `errore ${response.status}`;
    throw new Error(`${file.name}: caricamento non riuscito (${reason})`);
  }
  return { url: body.secure_url, publicId: body.public_id };
}
