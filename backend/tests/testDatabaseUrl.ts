import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/**
 * I test usano un database separato, ricreato a ogni esecuzione: per prudenza il nome deve
 * finire con "_test", perché schema.sql cancella tutte le tabelle.
 * Si può indicare con TEST_DATABASE_URL; altrimenti è quello del file .env con "_test" in coda
 * al nome (es. music_store → music_store_test).
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  // Dal file .env si legge solo DATABASE_URL: il resto, come SMTP_URL, non deve arrivare ai test
  const devUrl = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")).DATABASE_URL : undefined;

  const url = new URL(explicit ?? devUrl ?? "postgres://postgres:password@localhost:5432/music_store");
  if (!explicit) url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;

  if (!decodeURIComponent(url.pathname.slice(1)).endsWith("_test")) {
    throw new Error(`Il nome del database dei test deve finire con "_test": ${url.pathname.slice(1)}`);
  }
  return url.toString();
}
