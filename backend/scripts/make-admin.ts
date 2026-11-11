// Dà il ruolo di amministratore a un account già registrato:
//   npm run make-admin -- mario@example.com
// Non esiste una rotta per farlo: un admin si crea solo da chi ha accesso al server e al database.
import { pool } from "../src/db.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Indica l'email dell'account: npm run make-admin -- mario@example.com");
  process.exit(1);
}

const { rowCount } = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
await pool.end();

if (!rowCount) {
  console.error(`Nessun account registrato con l'email ${email}`);
  process.exit(1);
}
console.log(`${email} ora è amministratore. Se eri già collegato, basta ricaricare la pagina.`);
