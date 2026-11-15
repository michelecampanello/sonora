-- Foto caricate su Cloudinary su un database già esistente. Si può rilanciare e non cancella dati.

-- Il public_id restituito da Cloudinary al caricamento: serve per cancellare la foto quando
-- viene tolta da un prodotto. NULL per le immagini indicate con un indirizzo, che non si cancellano mai.
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_product_images_cloudinary ON product_images(cloudinary_public_id)
  WHERE cloudinary_public_id IS NOT NULL;
