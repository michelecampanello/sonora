import { afterAll } from "vitest";
import { pool } from "../src/db.js";

// Chiude le connessioni al database alla fine di ogni file di test
afterAll(() => pool.end());
