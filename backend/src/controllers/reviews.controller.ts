import { asyncHandler } from "../asyncHandler.js";
import { isSlug } from "../slug.js";
import { isUuid } from "../uuid.js";
import {
  deleteOwnReview,
  deleteReviewById,
  findActiveProductId,
  listReviews,
  saveReview,
} from "../services/reviews.service.js";
import { asRecord } from "../validation.js";
import type { ApiError, Review, ReviewsResponse } from "../types.js";

const MAX_COMMENT_LENGTH = 2000;
const PRODUCT_NOT_FOUND = { error: "Prodotto non trovato" };

const productIdFor = async (slug: string) => (isSlug(slug) ? findActiveProductId(slug) : null);

/** GET /api/products/:slug/reviews?page= — chiunque; chi ha fatto l'accesso riceve anche la sua */
export const getReviews = asyncHandler<{ slug: string }, ReviewsResponse | ApiError, unknown, { page?: unknown }>(
  async (req, res) => {
    const productId = await productIdFor(req.params.slug);
    if (!productId) return res.status(404).json(PRODUCT_NOT_FOUND);

    const page = Math.max(1, Math.trunc(Number(req.query.page) || 1));
    return res.json(await listReviews(productId, page, req.user?.id ?? null));
  },
);

/** PUT /api/products/:slug/reviews/mine — scrive o modifica la recensione di chi ha fatto l'accesso */
export const putMyReview = asyncHandler<{ slug: string }, Review | ApiError, unknown, unknown>(async (req, res) => {
  const fields = asRecord(req.body);
  const { rating } = fields;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Scegli un voto da 1 a 5 stelle" });
  }
  // Il commento è facoltativo; gli spazi in eccesso si tolgono, gli a capo interni restano
  const comment = typeof fields.comment === "string" ? fields.comment.trim() : "";
  if (comment.length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: `Il commento può avere al massimo ${MAX_COMMENT_LENGTH} caratteri` });
  }

  const productId = await productIdFor(req.params.slug);
  if (!productId) return res.status(404).json(PRODUCT_NOT_FOUND);

  return res.json(await saveReview(productId, req.user!.id, rating, comment));
});

/** DELETE /api/products/:slug/reviews/mine */
export const deleteMyReview = asyncHandler<{ slug: string }, { status: string } | ApiError, unknown, unknown>(
  async (req, res) => {
    const productId = await productIdFor(req.params.slug);
    if (!productId) return res.status(404).json(PRODUCT_NOT_FOUND);
    if (!(await deleteOwnReview(productId, req.user!.id))) {
      return res.status(404).json({ error: "Non hai recensito questo prodotto" });
    }
    return res.json({ status: "ok" });
  },
);

/** DELETE /api/admin/reviews/:id — moderazione */
export const deleteReview = asyncHandler<{ id: string }, { status: string } | ApiError, unknown, unknown>(
  async (req, res) => {
    if (!isUuid(req.params.id) || !(await deleteReviewById(req.params.id))) {
      return res.status(404).json({ error: "Recensione non trovata" });
    }
    return res.json({ status: "ok" });
  },
);
