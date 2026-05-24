"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", weight: ["400"], style: ["italic"] });

type Review = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  rating?: number | null;
  review?: string | null;
  reviewed_at?: string | null;
  edited?: boolean;
};

type ReviewsListProps = {
  bookId: string;
  currentUserId?: string | null;
  currentUsername?: string | null;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-3 w-3",
            s <= rating ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

function ReviewSkeleton() {
  return (
    <div className="py-4 border-b border-border/50 space-y-2 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted/60 flex-shrink-0" />
        <div className="h-3.5 w-28 bg-muted/60 rounded" />
      </div>
      <div className="h-3 w-16 bg-muted/40 rounded" />
      <div className="h-3.5 w-full bg-muted/40 rounded" />
      <div className="h-3.5 w-4/5 bg-muted/40 rounded" />
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return "";
  }
}

function averageRating(reviews: Review[]): number | null {
  const rated = reviews.filter((r) => r.rating != null && r.rating > 0);
  if (rated.length < 2) return null;
  return rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length;
}

export function ReviewsList({ bookId, currentUserId, currentUsername }: ReviewsListProps) {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/books/${encodeURIComponent(bookId)}/reviews`)
      .then((res) => res.ok ? res.json() : { reviews: [] })
      .then((data: { reviews?: Review[] }) => {
        if (!cancelled) setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(() => { if (!cancelled) setReviews([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookId]);

  const avg = averageRating(reviews);

  return (
    <div>
      {/* Header with avg rating */}
      {avg !== null && (
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border/50">
          <span className="text-3xl font-bold text-foreground tabular-nums">{avg.toFixed(1)}</span>
          <div className="space-y-1">
            <StarRow rating={Math.round(avg)} />
            <p className="text-xs text-muted-foreground">{reviews.filter(r => r.rating).length} ratings</p>
          </div>
        </div>
      )}

      {loading ? (
        <>
          <ReviewSkeleton />
          <ReviewSkeleton />
          <ReviewSkeleton />
        </>
      ) : reviews.length === 0 ? (
        <div className="py-14 text-center">
          <p className={cn(playfair.className, "text-lg text-muted-foreground")} style={{ fontStyle: "italic" }}>
            No reviews yet. Be the first.
          </p>
        </div>
      ) : (
        <div>
          {reviews.map((r) => {
            const isMe = r.user_id === currentUserId || r.username === currentUsername;
            return (
              <div key={r.user_id} className="py-5 border-b border-border/50 last:border-0">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Link
                    href={`/u/${encodeURIComponent(r.username)}`}
                    className="flex-shrink-0 h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground hover:ring-2 hover:ring-border transition"
                    aria-label={`View ${r.username}'s profile`}
                  >
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt={r.username} className="h-full w-full object-cover" />
                    ) : (
                      r.username[0]?.toUpperCase()
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    {/* Name + You badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/u/${encodeURIComponent(r.username)}`}
                        className="text-[0.8125rem] font-semibold text-foreground hover:underline underline-offset-2"
                      >
                        {r.username}
                      </Link>
                      {isMe && (
                        <span className="text-[0.625rem] uppercase tracking-[0.1em] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          You
                        </span>
                      )}
                      {r.edited && (
                        <span className="text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground/60 font-medium">
                          edited
                        </span>
                      )}
                      {r.reviewed_at && (
                        <span className="text-xs text-muted-foreground/60 ml-auto">
                          {formatDate(r.reviewed_at)}
                        </span>
                      )}
                    </div>

                    {/* Stars */}
                    {r.rating != null && r.rating > 0 && (
                      <div className="mb-2">
                        <StarRow rating={r.rating} />
                      </div>
                    )}

                    {/* Review text */}
                    {r.review && (
                      <p className="text-[0.875rem] text-foreground/80 leading-relaxed">
                        {r.review}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
