import { useState } from "react";
import { optimizedImageUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import type { ProductPhoto } from "@/lib/types";
import { ProductImage } from "./ProductImage";

interface ProductGalleryProps {
  name: string;
  categorySlug: string;
  images: ProductPhoto[];
}

/** Immagine grande con le miniature per cambiarla. Senza immagini mostra l'icona della categoria. */
export function ProductGallery({ name, categorySlug, images }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ProductImage
        name={current?.alt ?? name}
        imageUrl={current?.url ?? null}
        categorySlug={categorySlug}
        className="rounded-xl"
        sizes="(min-width: 768px) 50vw, 100vw"
        priority
      />

      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label="Immagini del prodotto">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Mostra immagine ${index + 1} di ${images.length}`}
                aria-current={index === selected ? "true" : undefined}
                className={cn(
                  "block w-full overflow-hidden rounded-md border-2 border-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  index === selected && "border-primary"
                )}
              >
                <img src={optimizedImageUrl(image.url, 200)} alt="" width={200} height={200} loading="lazy" decoding="async" className="aspect-square h-auto w-full bg-muted object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
