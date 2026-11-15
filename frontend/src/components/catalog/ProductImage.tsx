import { createElement } from "react"
import {
  AudioLines,
  Cable,
  Drum,
  Guitar,
  Headphones,
  Mic,
  Music,
  Piano,
  type LucideIcon,
} from "lucide-react"
import { imageSrcSet, optimizedImageUrl } from "@/lib/cloudinary"
import { SmoothImage } from "@/components/SmoothImage"
import { cn } from "@/lib/utils"
import { SoundSignature } from "./SoundSignature"

// Finché non ci sono foto, mostriamo la firma sonora del prodotto e un'icona in base alla categoria.
const ICONS: [keyword: string, icon: LucideIcon][] = [
  ["chitarre", Guitar],
  ["bassi", Guitar],
  ["batterie", Drum],
  ["pianoforti", Piano],
  ["sintetizzatori", Piano],
  ["microfoni", Mic],
  ["cuffie", Headphones],
  ["cavi", Cable],
  ["interfacce", AudioLines],
]

function iconFor(categorySlug: string): LucideIcon {
  return ICONS.find(([keyword]) => categorySlug.includes(keyword))?.[1] ?? Music
}

interface ProductImageProps {
  name: string
  imageUrl: string | null
  categorySlug: string
  className?: string
  /** Quanto è larga l'immagine nella pagina: serve al browser per scaricare la versione giusta */
  sizes?: string
  /** Per l'immagine principale della pagina: scaricata subito, prima delle altre */
  priority?: boolean
}

// Le card del catalogo: una colonna su mobile, poi due, tre e quattro
const CARD_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"

export function ProductImage({
  name,
  imageUrl,
  categorySlug,
  className,
  sizes = CARD_SIZES,
  priority = false,
}: ProductImageProps) {
  const base = cn("aspect-square w-full rounded-md bg-muted", className)

  if (imageUrl) {
    return (
      <SmoothImage
        src={optimizedImageUrl(imageUrl, 960)}
        original={imageUrl}
        srcSet={imageSrcSet(imageUrl)}
        sizes={sizes}
        alt={name}
        width={960}
        height={960}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        wrapperClassName={base}
      />
    )
  }

  return (
    <div
      className={cn(base, "relative overflow-hidden")}
      role="img"
      aria-label={name}
    >
      <SoundSignature
        seed={name}
        className="absolute inset-x-[8%] inset-y-[20%] h-[60%] w-[84%] text-primary"
      />
      {createElement(iconFor(categorySlug), {
        className:
          "absolute top-[7%] left-[8%] size-[11%] text-muted-foreground",
        strokeWidth: 1.25,
      })}
    </div>
  )
}
