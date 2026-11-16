/** Porta il browser su un altro sito, come la pagina di pagamento di Stripe. In un file a sé per poterla sostituire nei test. */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
