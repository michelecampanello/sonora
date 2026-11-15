// Carica su Cloudinary tutte le immagini di una cartella, con un public_id leggibile: <cartella-cloudinary>/<nome-file>.
//   npm run upload-images -- ./immagini/prodotti sonora/seed/prodotti
// Rilanciarlo sovrascrive le immagini con lo stesso nome invece di crearne di nuove.
// Serve per le immagini dei dati di prova: quelle dei prodotti veri si caricano dal pannello admin.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cloudinaryConfig, signParams } from "../src/services/cloudinary.service.js";

const [sourceDir, folder] = process.argv.slice(2);
if (!sourceDir || !folder || !/^[\w-]+(\/[\w-]+)*$/.test(folder)) {
  console.error("Uso: npm run upload-images -- <cartella con le immagini> <cartella su Cloudinary, es. sonora/seed/prodotti>");
  process.exit(1);
}

const config = cloudinaryConfig();
if (!config) {
  console.error("Manca CLOUDINARY_URL in backend/.env");
  process.exit(1);
}

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const files = (await readdir(sourceDir)).filter((name) => path.extname(name).toLowerCase() in TYPES).sort();
if (files.length === 0) {
  console.error(`Nessuna immagine PNG, JPG o WebP in ${sourceDir}`);
  process.exit(1);
}

const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`;
let failed = 0;

for (const name of files) {
  const extension = path.extname(name).toLowerCase();
  const params = {
    // asset_folder ordina le immagini nella Media Library; il public_id decide l'indirizzo
    asset_folder: folder,
    invalidate: "true", // sovrascrivendo, la CDN smette di servire la versione vecchia
    overwrite: "true",
    public_id: `${folder}/${path.basename(name, extension)}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.append(key, String(value));
  form.append("api_key", config.apiKey);
  form.append("signature", signParams(params, config.apiSecret));
  form.append("file", new Blob([await readFile(path.join(sourceDir, name))], { type: TYPES[extension] }), name);

  const response = await fetch(uploadUrl, { method: "POST", body: form });
  const body = (await response.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (response.ok && body?.secure_url) {
    console.log(`✓ ${body.secure_url}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}: ${body?.error?.message ?? `risposta ${response.status}`}`);
  }
}

console.log(`\n${files.length - failed} immagini caricate su ${files.length} in ${folder}`);
if (failed > 0) process.exit(1);
