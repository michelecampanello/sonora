import { createHash } from "node:crypto";

/**
 * Le immagini dei prodotti si caricano dal browser direttamente su Cloudinary: non passano dal nostro server.
 * Il backend firma soltanto la richiesta, così il segreto API non arriva mai al browser.
 * Documentazione: https://cloudinary.com/documentation/authentication_signatures
 */

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Formati accettati per le foto dei prodotti: Cloudinary rifiuta tutti gli altri */
export const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif";
/** La cartella su Cloudinary in cui finiscono le foto dei prodotti */
export const UPLOAD_FOLDER = "sonora/prodotti";

/**
 * Legge CLOUDINARY_URL (cloudinary://api_key:api_secret@cloud_name), il formato della dashboard di Cloudinary.
 * Restituisce null se manca: il resto del sito funziona anche senza caricamento delle immagini.
 * Si rilegge a ogni chiamata, così i test possono cambiare la variabile.
 */
export function cloudinaryConfig(): CloudinaryConfig | null {
  const value = process.env.CLOUDINARY_URL;
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CLOUDINARY_URL non valida: il formato è cloudinary://api_key:api_secret@cloud_name");
  }
  const config = {
    cloudName: url.hostname,
    apiKey: decodeURIComponent(url.username),
    apiSecret: decodeURIComponent(url.password),
  };
  if (url.protocol !== "cloudinary:" || !config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error("CLOUDINARY_URL non valida: il formato è cloudinary://api_key:api_secret@cloud_name");
  }
  return config;
}

/**
 * La firma di Cloudinary: i parametri in ordine alfabetico come nome=valore uniti da &,
 * seguiti subito dal segreto, e poi l'impronta SHA-1 in esadecimale.
 * Vanno firmati tutti i parametri inviati tranne file, cloud_name, resource_type e api_key.
 */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export interface UploadSignature {
  /** Dove il browser invia il file */
  uploadUrl: string;
  /** I campi da aggiungere al file nel FormData, già firmati */
  fields: Record<string, string>;
}

/** I dati con cui il browser può caricare un'immagine nella cartella dei prodotti. Valgono un'ora. */
export function createUploadSignature(config: CloudinaryConfig, now = new Date()): UploadSignature {
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    // asset_folder per gli account con le cartelle dinamiche, cioè tutti quelli creati dal 2024
    asset_folder: UPLOAD_FOLDER,
    timestamp: Math.floor(now.getTime() / 1000),
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([name, value]) => [name, String(value)])),
      api_key: config.apiKey,
      signature: signParams(params, config.apiSecret),
    },
  };
}

const PUBLIC_ID = /^[\w\-.]+(?:\/[\w\-.]+)*$/;

/**
 * Vero se url è la foto publicId del nostro cloud, nella forma che Cloudinary restituisce al caricamento:
 * https://res.cloudinary.com/<cloud>/image/upload/[trasformazioni/][v<versione>/]<public_id>.<estensione>
 * Impedisce di far cancellare, togliendola da un prodotto, una foto diversa da quella mostrata.
 */
export function isCloudinaryImage(url: string, publicId: string, config: CloudinaryConfig): boolean {
  if (publicId.length > 255 || !PUBLIC_ID.test(publicId)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return false;
  if (!parsed.pathname.startsWith(`/${config.cloudName}/image/upload/`)) return false;
  return new RegExp(`/${publicId.replace(/[.\-]/g, "\\$&")}\\.[a-z0-9]+$`, "i").test(parsed.pathname);
}

/** Cloudinary non ha cancellato la foto: il messaggio spiega perché, per i log del server */
export class CloudinaryError extends Error {}

/**
 * Cancella una foto da Cloudinary e dalla cache della CDN.
 * Una foto già cancellata non è un errore: il risultato voluto c'è già.
 * Documentazione: https://cloudinary.com/documentation/image_upload_api_reference_destroy_by_public_id
 */
export async function destroyImage(config: CloudinaryConfig, publicId: string, now = new Date()): Promise<void> {
  const params = { invalidate: "true", public_id: publicId, timestamp: Math.floor(now.getTime() / 1000) };
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([name, value]) => [name, String(value)])),
    api_key: config.apiKey,
    signature: signParams(params, config.apiSecret),
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/destroy`, {
    method: "POST",
    body,
  });
  const result = (await response.json().catch(() => null)) as { result?: unknown; error?: { message?: unknown } } | null;
  if (response.ok && (result?.result === "ok" || result?.result === "not found")) return;

  const reason = typeof result?.error?.message === "string" ? result.error.message : `risposta ${response.status}, ${JSON.stringify(result)}`;
  throw new CloudinaryError(`Cancellazione di ${publicId} da Cloudinary non riuscita: ${reason}`);
}

/**
 * Cancella le foto indicate, una alla volta. Non lancia mai: un errore lascia solo una foto inutilizzata
 * su Cloudinary, e viene scritto nei log. Senza CLOUDINARY_URL non fa nulla.
 */
export async function deleteUnusedImages(publicIds: string[]): Promise<void> {
  const config = cloudinaryConfig();
  if (!config || publicIds.length === 0) return;
  for (const publicId of publicIds) {
    try {
      await destroyImage(config, publicId);
    } catch (err) {
      console.error(err);
    }
  }
}
