import type { PersonName } from "@/lib/types";

/**
 * Formatta un prezzo in euro all'italiana: "349.00" → "349,00 €", "1290.00" → "1.290,00 €".
 *
 * Perché non Intl.NumberFormat("it-IT")? Per le cifre a 4 numeri lo standard italiano
 * non mette il punto delle migliaia ("1290,00 €"), mentre nei negozi online si usa sempre.
 */
export function formatPrice(price: string | number): string {
  const [integer = "0", decimals = "00"] = Number(price).toFixed(2).split(".");
  // Inserisce un punto ogni 3 cifre partendo da destra: 1290 → 1.290
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${decimals} €`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("it-IT", { dateStyle: "long" });

/** Formatta una data ISO all'italiana: "10 novembre 2026" */
export const formatDate = (iso: string): string => DATE_FORMAT.format(new Date(iso));

/** Il codice breve con cui un ordine viene mostrato al cliente */
export const orderCode = (id: string): string => id.slice(0, 8).toUpperCase();

/** Nome e cognome insieme: "Giulia Bianchi" (senza spazi in più se il cognome manca) */
export const fullName = ({ first_name, last_name }: PersonName): string => `${first_name} ${last_name}`.trim();

/** Un saluto per nome, adatto all'ora: "Buongiorno, Giulia", "Buon pomeriggio, Giulia", "Buonasera, Giulia" */
export function greeting(firstName: string, now: Date = new Date()): string {
  const hour = now.getHours();
  const salute = hour >= 5 && hour < 12 ? "Buongiorno" : hour >= 12 && hour < 18 ? "Buon pomeriggio" : "Buonasera";
  return firstName ? `${salute}, ${firstName}` : salute;
}
