import { pool } from "../db.js";
import type { Paginated, Review, ReviewSummary, ReviewsResponse } from "../types.js";

const REVIEWS_PER_PAGE = 10;

// "Giulia B.": il cognome si riduce all'iniziale, e senza cognome resta solo il nome
const REVIEW_COLUMNS = `
  r.id, r.rating, r.comment, r.created_at, r.updated_at,
  btrim(u.first_name || ' ' || CASE WHEN u.last_name <> '' THEN left(u.last_name, 1) || '.' ELSE '' END) AS author,
  EXISTS (
    SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.user_id = r.user_id AND i.product_id = r.product_id AND o.status <> 'cancelled'
  ) AS verified`;

/** L'id di un prodotto in vendita, oppure null: i prodotti nascosti non si recensiscono */
export async function findActiveProductId(slug: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>("SELECT id FROM products WHERE slug = $1 AND active", [slug]);
  return rows[0]?.id ?? null;
}

async function summarize(productId: string): Promise<ReviewSummary> {
  const { rows } = await pool.query<{ rating: number; count: number }>(
    "SELECT rating, count(*)::int AS count FROM reviews WHERE product_id = $1 GROUP BY rating",
    [productId],
  );
  const distribution: ReviewSummary["distribution"] = [0, 0, 0, 0, 0];
  let count = 0;
  let sum = 0;
  for (const row of rows) {
    distribution[row.rating - 1] = row.count;
    count += row.count;
    sum += row.rating * row.count;
  }
  // Un decimale, come la media del catalogo
  return { average: count > 0 ? Math.round((sum / count) * 10) / 10 : null, count, distribution };
}

/** Le recensioni di un prodotto, dalla più recente, con il riepilogo dei voti e quella di chi guarda */
export async function listReviews(productId: string, page: number, viewerId: string | null): Promise<ReviewsResponse> {
  const [summary, items, mine] = await Promise.all([
    summarize(productId),
    pool.query<Review>(
      `SELECT ${REVIEW_COLUMNS} FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC, r.id
       LIMIT $2 OFFSET $3`,
      [productId, REVIEWS_PER_PAGE, (page - 1) * REVIEWS_PER_PAGE],
    ),
    viewerId ? findReview(productId, viewerId) : Promise.resolve(null),
  ]);

  const paginated: Paginated<Review> = {
    items: items.rows,
    total: summary.count,
    page,
    pages: Math.ceil(summary.count / REVIEWS_PER_PAGE),
  };
  return { ...paginated, summary, mine };
}

async function findReview(productId: string, userId: string): Promise<Review | null> {
  const { rows } = await pool.query<Review>(
    `SELECT ${REVIEW_COLUMNS} FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1 AND r.user_id = $2`,
    [productId, userId],
  );
  return rows[0] ?? null;
}

/** Scrive la recensione dell'utente, o aggiorna quella che ha già: una per prodotto */
export async function saveReview(productId: string, userId: string, rating: number, comment: string): Promise<Review> {
  await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)
     ON CONFLICT (product_id, user_id)
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = now()`,
    [productId, userId, rating, comment],
  );
  return (await findReview(productId, userId))!;
}

/** Cancella la recensione dell'utente; false se non ne aveva scritta una */
export async function deleteOwnReview(productId: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM reviews WHERE product_id = $1 AND user_id = $2", [productId, userId]);
  return rowCount === 1;
}

/** Moderazione: cancella una recensione qualsiasi; false se non esiste */
export async function deleteReviewById(id: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
  return rowCount === 1;
}
