import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SmoothImage } from "@/components/SmoothImage"
import { optimizedImageUrl, placeholderImageUrl } from "@/lib/cloudinary"

const PHOTO =
  "https://res.cloudinary.com/demo/image/upload/sonora/seed/prodotti/basso.png"

/** Il segnaposto sfocato: un'immagine nascosta ai lettori di schermo, accanto a quella vera */
const blurred = (container: HTMLElement) =>
  container.querySelector("img[aria-hidden]")

describe("SmoothImage", () => {
  it("mostra la miniatura sfocata finché la foto non arriva, poi la foto con una dissolvenza", () => {
    const { container } = render(
      <SmoothImage
        src={optimizedImageUrl(PHOTO, 960)}
        original={PHOTO}
        alt="Basso"
      />
    )
    const photo = screen.getByRole("img", { name: "Basso" })

    expect(blurred(container)).toHaveAttribute(
      "src",
      placeholderImageUrl(PHOTO)
    )
    expect(photo).toHaveClass("opacity-0")

    fireEvent.load(photo)
    expect(photo).toHaveClass("opacity-100")
    expect(blurred(container)).toBeNull()
  })

  it("senza Cloudinary il segnaposto è un riquadro che pulsa, e smette anche se l'immagine non arriva", () => {
    const { container } = render(
      <SmoothImage src="/foto/basso.png" alt="Basso" />
    )
    const wrapper = container.firstElementChild!

    expect(blurred(container)).toBeNull()
    expect(wrapper).toHaveClass("animate-pulse")

    fireEvent.error(screen.getByRole("img", { name: "Basso" }))
    expect(wrapper).not.toHaveClass("animate-pulse")
  })

  it("cambiando immagine si riparte dal segnaposto", () => {
    const other = PHOTO.replace("basso", "chitarra")
    const { rerender } = render(
      <SmoothImage src={PHOTO} original={PHOTO} alt="Foto" />
    )
    fireEvent.load(screen.getByRole("img", { name: "Foto" }))

    rerender(<SmoothImage src={other} original={other} alt="Foto" />)
    expect(screen.getByRole("img", { name: "Foto" })).toHaveClass("opacity-0")
  })
})
