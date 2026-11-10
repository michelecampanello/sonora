// Controlli sui dati in arrivo, usati da più controller.

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignora tutto ciò che viene dopo il 72° byte

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

export const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const isPersonName = (value: string): boolean => value.length >= 2 && value.length <= 100;

/** Il messaggio d'errore se la nuova password non è accettabile, altrimenti null */
export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri`;
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return "La password è troppo lunga";
  return null;
}

export interface LocationFields {
  address: string;
  city: string;
  postal_code: string;
  province: string;
}

export const parseLocation = (source: Record<string, unknown>): LocationFields => ({
  address: text(source.address),
  city: text(source.city),
  postal_code: text(source.postal_code),
  province: text(source.province).toUpperCase(),
});

/** Il messaggio d'errore se l'indirizzo non è valido, altrimenti null */
export function locationError(location: LocationFields): string | null {
  if (location.address.length < 3 || location.address.length > 200) return "Indirizzo non valido";
  if (location.city.length < 2 || location.city.length > 100) return "Città non valida";
  if (!/^\d{5}$/.test(location.postal_code)) return "Il CAP deve avere 5 cifre";
  if (!/^[A-Z]{2}$/.test(location.province)) return "La provincia deve avere 2 lettere";
  return null;
}
