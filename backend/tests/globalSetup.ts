import { readFileSync } from "node:fs";
import pg from "pg";
import { testDatabaseUrl } from "./testDatabaseUrl.js";

/** Eseguito una volta prima di tutti i test: crea il database di test e lo riempie con schema e seed. */
export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const database = decodeURIComponent(url.pathname.slice(1));

  // CREATE DATABASE va lanciato collegandosi a un altro database dello stesso server
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (!rowCount) await admin.query(`CREATE DATABASE "${database.replaceAll('"', '""')}"`);
  } finally {
    await admin.end();
  }

  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const schema = readFileSync("db/schema.sql", "utf8");
    const seed = readFileSync("db/seed.sql", "utf8");
    // Tutto in una transazione, come "psql -1" in db:setup. Le NOTICE dei DROP non servono.
    await client.query("SET client_min_messages = warning");
    await client.query(`BEGIN;\n${schema}\n${seed}\nCOMMIT;`);
  } finally {
    await client.end();
  }
}
