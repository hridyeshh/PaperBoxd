"use client";

import * as React from "react";

/**
 * Fire a recommendation impression the first time a card is actually visible.
 *
 * Counting an impression at mount would be wrong for a horizontal carousel:
 * most cards are rendered off-screen and scrolled past, so mount-time counting
 * inflates the denominator of every rate on the discovery funnel and makes a
 * well-performing rail look worse than a short one. IntersectionObserver ties
 * the count to what the reader could actually see.
 *
 * Fires once per book per mount. Returns a ref to attach to the card element.
 */
export function useRecImpression(
  bookId: string | undefined,
  reasonType: string | undefined,
  enabled = true
) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const sent = React.useRef(false);

  React.useEffect(() => {
    sent.current = false;
  }, [bookId]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !bookId || !enabled) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || sent.current) continue;
          sent.current = true;
          observer.disconnect();
          fetch("/api/recommendations/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              book_id: bookId,
              reason_type: reasonType,
              event_type: "impression",
            }),
            keepalive: true,
          }).catch(() => {});
        }
      },
      // Half the card visible is the threshold for "seen"; a 1px sliver at the
      // edge of a scrolling rail is not an impression.
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [bookId, reasonType, enabled]);

  return ref;
}

/** Record that a recommendation card was opened. Fire-and-forget. */
export function trackRecClick(bookId: string, reasonType?: string): void {
  fetch("/api/recommendations/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book_id: bookId, reason_type: reasonType, event_type: "click" }),
    keepalive: true,
  }).catch(() => {});
}
