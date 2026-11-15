import { waitUntil } from "@vercel/functions";

/**
 * Lavoro da finire dopo aver risposto al browser, come l'invio di un'email: la risposta non lo aspetta.
 * Su Vercel la funzione può essere sospesa appena la risposta parte: waitUntil la tiene in vita finché il lavoro finisce.
 * In locale e nei test waitUntil non fa nulla, e il server tradizionale resta acceso comunque.
 * Un errore finisce nei log e non tocca la risposta, che è già partita.
 */
export function runAfterResponse(task: Promise<unknown>): void {
  waitUntil(task.catch((err: unknown) => console.error(err)));
}
