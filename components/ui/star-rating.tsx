"use client";

import * as React from "react";
import { Star, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  bookId: string;
  username: string | null;
  currentUserId?: string | null;
  readOnly?: boolean;
  onRatingChange?: (rating: number | null, review: string | null) => void;
};

type ReviewEntry = {
  user_id: string;
  username: string;
  rating?: number | null;
  review?: string | null;
  edited?: boolean;
};

const MAX_REVIEW_CHARS = 500;

export function StarRating({
  bookId,
  username,
  currentUserId,
  readOnly = false,
  onRatingChange,
}: StarRatingProps) {
  const [rating, setRating] = React.useState<number | null>(null);
  const [review, setReview] = React.useState<string>("");
  const [edited, setEdited] = React.useState<boolean>(false);

  const [hovered, setHovered] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Draft state for editor
  const [draftRating, setDraftRating] = React.useState<number | null>(null);
  const [draftReview, setDraftReview] = React.useState<string>("");

  const menuRef = React.useRef<HTMLDivElement>(null);

  // Self-fetch own rating + review + edited flag
  React.useEffect(() => {
    if (!username || !bookId) return;
    let cancelled = false;
    fetch(`/api/books/${encodeURIComponent(bookId)}/reviews`)
      .then((res) => res.ok ? res.json() : { reviews: [] })
      .then((data: { reviews?: ReviewEntry[] }) => {
        if (cancelled) return;
        const own = (data.reviews ?? []).find(
          (r) => r.username === username || r.user_id === currentUserId
        );
        if (own) {
          setRating(own.rating ?? null);
          setReview(own.review ?? "");
          setEdited(!!own.edited);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bookId, username, currentUserId]);

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const save = async (newRating: number | null, newReview: string) => {
    if (!username) return null;
    setSaving(true);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-username": username },
        body: JSON.stringify({ rating: newRating ?? 0, review: newReview || null }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { rating?: number | null; review?: string | null; edited?: boolean };
      setRating(newRating);
      setReview(newReview);
      setEdited(!!data.edited);
      onRatingChange?.(newRating, newReview || null);
      return data;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (draftRating === null) return;
    await save(draftRating, draftReview);
    setEditing(false);
  };

  const handleEdit = () => {
    setMenuOpen(false);
    setDraftRating(rating);
    setDraftReview(review);
    setEditing(true);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    await save(null, "");
    setDraftRating(null);
    setDraftReview("");
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraftRating(rating);
    setDraftReview(review);
  };

  const hasRating = rating !== null;
  const canInteract = !readOnly && !!username;
  const displayed = hovered ?? draftRating ?? 0;

  // ── Read-only / logged out / no rating yet (no interaction) ──────────────
  if (!canInteract && !hasRating) {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className="h-5 w-5 fill-transparent text-muted-foreground/40" />
        ))}
      </div>
    );
  }

  // ── Read-only with rating ────────────────────────────────────────────────
  if (!canInteract && hasRating) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={cn(
                "h-5 w-5",
                s <= (rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40"
              )}
            />
          ))}
        </div>
        {review && (
          <p className="text-[0.875rem] text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {review}
          </p>
        )}
      </div>
    );
  }

  // ── Editing (interactive) ────────────────────────────────────────────────
  if (editing || !hasRating) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setDraftRating(draftRating === star ? null : star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer hover:scale-110 active:scale-95 transition-all duration-100"
              aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors duration-100",
                  star <= displayed
                    ? "fill-amber-400 text-amber-400"
                    : "fill-transparent text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>

        {draftRating !== null && (
          <div className="space-y-1">
            <textarea
              value={draftReview}
              onChange={(e) => setDraftReview(e.target.value.slice(0, MAX_REVIEW_CHARS))}
              placeholder="Write a short review… (optional)"
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2",
                "text-[0.875rem] text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-1 focus:ring-border/60 transition-shadow"
              )}
            />
            <p className="text-right text-[0.6875rem] text-muted-foreground/50 tabular-nums">
              {draftReview.length}/{MAX_REVIEW_CHARS}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || draftRating === null}
            className={cn(
              "flex-1 py-2 rounded-lg text-[0.8125rem] font-semibold transition-all",
              "bg-foreground text-background hover:opacity-90 active:scale-[0.98]",
              (saving || draftRating === null) && "opacity-40 cursor-not-allowed"
            )}
          >
            {saving ? "Saving…" : hasRating ? "Update" : "Submit"}
          </button>
          {hasRating && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-[0.8125rem] font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Saved snapshot with dropdown menu ────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-5 w-5",
                    s <= (rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40"
                  )}
                />
              ))}
            </div>
            {edited && (
              <span className="text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground/70 font-medium">
                edited
              </span>
            )}
          </div>
          {review && (
            <p className="text-[0.875rem] text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {review}
            </p>
          )}
        </div>

        {/* Dropdown trigger */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Rating options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover shadow-lg py-1 text-popover-foreground"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-[0.8125rem] hover:bg-muted text-left transition"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                disabled={saving}
                className="w-full flex items-center gap-2 px-3 py-2 text-[0.8125rem] hover:bg-muted text-left text-red-500 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
