import type { Request, Response } from "express";
import { cloudinaryConfig, createUploadSignature, type UploadSignature } from "../services/cloudinary.service.js";
import type { ApiError } from "../types.js";

/** POST /api/admin/uploads/signature — i dati firmati per caricare un'immagine su Cloudinary */
export function postUploadSignature(_req: Request, res: Response<UploadSignature | ApiError>) {
  const config = cloudinaryConfig();
  if (!config) {
    res.status(503).json({ error: "Il caricamento delle immagini non è configurato: manca CLOUDINARY_URL nel backend" });
    return;
  }
  res.json(createUploadSignature(config));
}
