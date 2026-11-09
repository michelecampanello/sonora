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
