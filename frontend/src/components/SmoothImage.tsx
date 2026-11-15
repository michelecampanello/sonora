import { useState, type ComponentProps } from "react"
import { placeholderImageUrl } from "@/lib/cloudinary"
import { cn } from "@/lib/utils"

type SmoothImageProps = Omit<ComponentProps<"img">, "src"> & {
  src: string
  /** L'indirizzo originale della foto: se è su Cloudinary, se ne ricava il segnaposto sfocato */
  original?: string
  /** Classi del contenitore, che occupa lo spazio dell'immagine fin da subito: dimensioni, bordi, posizione nella griglia */
  wrapperClassName?: string
}

/**
 * Un'immagine che non compare di colpo: finché arriva si vede un segnaposto, poi l'immagine entra con una dissolvenza.
 * Il segnaposto è una miniatura sfocata per le foto su Cloudinary, altrimenti un riquadro grigio che pulsa.
 */
export function SmoothImage({
  src,
  original,
  className,
  wrapperClassName,
  onLoad,
  onError,
  ...props
}: SmoothImageProps) {
  // Quale indirizzo ha finito di caricare (o ha dato errore): cambiando src si riparte dal segnaposto
  const [settled, setSettled] = useState<string | null>(null)
  const ready = settled === src
  const placeholder = original ? placeholderImageUrl(original) : null

  return (
    <span
      data-loaded={ready || undefined}
      className={cn(
        "relative block overflow-hidden bg-muted",
        !ready && !placeholder && "animate-pulse motion-reduce:animate-none",
        wrapperClassName
      )}
    >
      {placeholder && !ready && (
        <img
          src={placeholder}
          alt=""
          aria-hidden
          loading={props.loading}
          decoding="async"
          className="absolute inset-0 size-full scale-110 object-cover blur-md"
        />
      )}
      <img
        src={src}
        {...props}
        onLoad={(event) => {
          setSettled(src)
          onLoad?.(event)
        }}
        // Anche se non arriva si smette di aspettare: resta il fondo grigio, senza pulsare all'infinito
        onError={(event) => {
          setSettled(src)
          onError?.(event)
        }}
        className={cn(
          "relative size-full object-cover transition-opacity duration-300 motion-reduce:transition-none",
          ready ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </span>
  )
}
