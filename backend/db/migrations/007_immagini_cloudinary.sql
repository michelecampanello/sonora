-- Le illustrazioni dei dati di prova ora sono PNG su Cloudinary, non più SVG in frontend/public.
-- Si può rilanciare: aggiorna solo gli indirizzi rimasti al vecchio formato.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

UPDATE categories
SET image_url = 'https://res.cloudinary.com/bw6lt8wj/image/upload/sonora/seed/categorie/' || slug || '.png'
WHERE image_url IS NULL;

-- /prodotti/<nome>.svg diventa .../sonora/seed/prodotti/<nome>.png
UPDATE product_images
SET url = 'https://res.cloudinary.com/bw6lt8wj/image/upload/sonora/seed/prodotti/' || substring(url FROM '^/prodotti/(.+)\.svg$') || '.png'
WHERE url ~ '^/prodotti/.+\.svg$';
