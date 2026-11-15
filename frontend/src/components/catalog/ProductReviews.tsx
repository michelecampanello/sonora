import { useState, type FormEvent, type ReactNode } from "react"
import { Star } from "lucide-react"
import { Link, useLocation } from "react-router"
import { DeleteButton, FormError } from "@/components/account/AccountParts"
import { Pagination } from "@/components/catalog/Pagination"
import { StarInput, Stars } from "@/components/catalog/Stars"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/useAuth"
import { useFetch } from "@/hooks/useFetch"
import { adminReviewPath, myReviewPath, reviewsPath, sendJson } from "@/lib/api"
import { formatDate, formatRating, reviewCount } from "@/lib/format"
import type { Review, ReviewSummary, ReviewsResponse } from "@/lib/types"

const MAX_COMMENT = 2000

/** Media grande, stelle e una barra per ogni voto, come i livelli di un mixer */
function Summary({ summary }: { summary: ReviewSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <span className="text-display text-6xl tabular-nums">
          {summary.average === null ? "–" : formatRating(summary.average)}
        </span>
        <div className="flex flex-col gap-1 pb-1">
          <Stars value={summary.average ?? 0} />
          <span className="text-silk text-muted-foreground">
            {reviewCount(summary.count)}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5" aria-label="Recensioni per voto">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = summary.distribution[stars - 1]
          const share = summary.count > 0 ? count / summary.count : 0
          return (
            <li
              key={stars}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)_2rem] items-center gap-2 text-silk text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1">
                {stars}
                <Star
                  aria-hidden
                  fill="currentColor"
                  strokeWidth={0}
                  className="size-3"
                />
                <span className="sr-only">
                  {stars === 1 ? "stella" : "stelle"}
                </span>
              </span>
              <span aria-hidden className="h-2 bg-muted">
                <span
                  className="block h-full bg-primary"
                  style={{ width: `${share * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums">{count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ReviewForm({
  slug,
  mine,
  onSaved,
  onCancel,
}: {
  slug: string
  mine: Review | null
  onSaved: () => void
  onCancel?: () => void
}) {
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [comment, setComment] = useState(mine?.comment ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (rating === 0) {
      setError("Scegli un voto da 1 a 5 stelle")
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await sendJson<Review>("PUT", myReviewPath(slug), { rating, comment })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 border p-4">
      <StarInput value={rating} onChange={setRating} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-comment">Commento (facoltativo)</Label>
        <Textarea
          id="review-comment"
          rows={4}
          maxLength={MAX_COMMENT}
          placeholder="Com'è il suono? E la qualità costruttiva?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="text-right text-silk text-muted-foreground tabular-nums">
          {comment.length}/{MAX_COMMENT}
        </p>
      </div>
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {mine ? "Salva recensione" : "Pubblica recensione"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
          >
            Annulla
          </Button>
        )}
      </div>
    </form>
  )
}

function ReviewItem({
  review,
  label,
  actions,
}: {
  review: Review
  label?: string
  actions?: ReactNode
}) {
  const edited = review.updated_at !== review.created_at
  return (
    <article className="flex flex-col gap-2 border-b py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars value={review.rating} />
          <span className="font-medium">{label ?? review.author}</span>
          {review.verified && (
            <span className="inline-flex items-center gap-1.5 text-silk text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-led-ok" />
              Acquisto verificato
            </span>
          )}
        </div>
        <span className="text-silk text-muted-foreground">
          {formatDate(review.created_at)}
          {edited && " · modificata"}
        </span>
      </div>
      {review.comment && (
        <p className="leading-relaxed whitespace-pre-line">{review.comment}</p>
      )}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </article>
  )
}

/**
 * Le recensioni di un prodotto: riepilogo dei voti, la recensione di chi guarda (da scrivere o modificare) e l'elenco.
 * onChange avvisa la pagina quando media e numero cambiano, così aggiorna anche l'intestazione.
 */
export function ProductReviews({
  slug,
  onChange,
}: {
  slug: string
  onChange?: () => void
}) {
  const { user } = useAuth()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const { data, previousData, error, reload } = useFetch<ReviewsResponse>(
    reviewsPath(slug, page)
  )
  const [editing, setEditing] = useState(false)
  const [actionError, setActionError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const result = data ?? previousData

  const changed = () => {
    setEditing(false)
    setActionError(undefined)
    reload()
    onChange?.()
  }

  const remove = async (path: string) => {
    setBusy(true)
    setActionError(undefined)
    try {
      await sendJson("DELETE", path)
      changed()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setBusy(false)
    }
  }

  const mine = result?.mine ?? null
  const isAdmin = user?.role === "admin"
  // La propria recensione sta già nel riquadro qui sopra: nell'elenco non si ripete
  const others = result?.items.filter((review) => review.id !== mine?.id) ?? []

  return (
    <section
      id="recensioni"
      aria-labelledby="reviews-title"
      className="flex scroll-mt-24 flex-col gap-6 border-t pt-8"
    >
      <h2 id="reviews-title" className="text-display text-3xl md:text-4xl">
        Recensioni
      </h2>

      {error && !result ? (
        <p className="text-muted-foreground">
          Non è stato possibile caricare le recensioni.
        </p>
      ) : !result ? (
        <Skeleton className="h-40 w-full" aria-label="Caricamento recensioni" />
      ) : (
        <div className="grid gap-10 md:grid-cols-[18rem_minmax(0,1fr)]">
          <Summary summary={result.summary} />

          <div className="flex min-w-0 flex-col gap-4">
            {!user ? (
              <p className="border border-dashed p-4 text-muted-foreground">
                <Link
                  to="/accedi"
                  state={{ from: `${location.pathname}#recensioni` }}
                  className="text-foreground underline underline-offset-4"
                >
                  Accedi
                </Link>{" "}
                per scrivere una recensione.
              </p>
            ) : mine && !editing ? (
              <ReviewItem
                review={mine}
                label="La tua recensione"
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setEditing(true)}
                    >
                      Modifica
                    </Button>
                    <DeleteButton
                      what="la tua recensione"
                      disabled={busy}
                      onConfirm={() => void remove(myReviewPath(slug))}
                    />
                  </>
                }
              />
            ) : (
              <ReviewForm
                // key: aprendo il form di modifica riparte dalla recensione salvata
                key={mine?.updated_at ?? "nuova"}
                slug={slug}
                mine={mine}
                onSaved={changed}
                onCancel={mine ? () => setEditing(false) : undefined}
              />
            )}
            <FormError message={actionError} />

            {result.summary.count === 0 ? (
              <p className="text-muted-foreground">
                Ancora nessuna recensione{user ? ": scrivi la prima!" : "."}
              </p>
            ) : (
              <div className="border-t empty:hidden">
                {others.map((review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    actions={
                      isAdmin ? (
                        <DeleteButton
                          what={`la recensione di ${review.author}`}
                          disabled={busy}
                          onConfirm={() =>
                            void remove(adminReviewPath(review.id))
                          }
                        />
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
            <Pagination
              page={result.page}
              pages={result.pages}
              onChange={setPage}
            />
          </div>
        </div>
      )}
    </section>
  )
}
