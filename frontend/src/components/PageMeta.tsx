import { useEffect } from "react";
import { useLocation } from "react-router";

const SITE_NAME = "Sonora";
const HOME_TITLE = "Sonora — Strumenti musicali";
// Uguale alla description di index.html: è quella che resta quando una pagina non ne ha una sua
const DEFAULT_DESCRIPTION =
  "Chitarre, bassi, batterie, tastiere e attrezzatura da studio: il catalogo di Sonora, con schede tecniche complete.";
const DEFAULT_IMAGE = "/icon-512.png";

interface PageMetaProps {
  /** Senza titolo la scheda mostra "Sonora — Strumenti musicali" */
  title?: string;
  description?: string;
  /** Immagine per l'anteprima del link condiviso */
  image?: string;
  /** Pagine personali, di servizio o d'errore: i motori di ricerca non devono indicizzarle */
  noindex?: boolean;
}

function setTag(selector: string, create: () => HTMLElement, attribute: string, value: string | null) {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (value === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = create();
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}

function setMeta(key: "name" | "property", name: string, content: string | null) {
  setTag(
    `meta[${key}="${name}"]`,
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute(key, name);
      return meta;
    },
    "content",
    content,
  );
}

function setCanonical(href: string | null) {
  setTag(
    'link[rel="canonical"]',
    () => {
      const link = document.createElement("link");
      link.rel = "canonical";
      return link;
    },
    "href",
    href,
  );
}

/**
 * Titolo, description, anteprima social e indicizzazione di una pagina.
 * Il <title> lo porta React in <head>; i meta che esistono già in index.html vengono aggiornati
 * (invece di aggiungerne un secondo) e tornano ai valori del sito quando la pagina si chiude.
 */
export function PageMeta({ title, description, image, noindex = false }: PageMetaProps) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} — ${SITE_NAME}` : HOME_TITLE;

  useEffect(() => {
    const url = `${window.location.origin}${pathname}`;
    const absoluteImage = new URL(image ?? DEFAULT_IMAGE, window.location.origin).href;
    setMeta("name", "description", description ?? DEFAULT_DESCRIPTION);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description ?? DEFAULT_DESCRIPTION);
    setMeta("property", "og:image", absoluteImage);
    setMeta("property", "og:url", noindex ? null : url);
    setMeta("name", "robots", noindex ? "noindex" : null);
    // Il canonico non porta la query string: filtri, ordinamento e pagine del catalogo non diventano pagine a sé
    setCanonical(noindex ? null : url);

    return () => {
      setMeta("name", "description", DEFAULT_DESCRIPTION);
      setMeta("property", "og:title", HOME_TITLE);
      setMeta("property", "og:description", DEFAULT_DESCRIPTION);
      setMeta("property", "og:image", DEFAULT_IMAGE);
      setMeta("property", "og:url", null);
      setMeta("name", "robots", null);
      setCanonical(null);
    };
  }, [pathname, fullTitle, description, image, noindex]);

  return <title>{fullTitle}</title>;
}
