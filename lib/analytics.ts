/**
 * Client-side product analytics.
 *
 * One call, one row in the Go `events` table via /api/events/track. Fire and
 * forget: analytics must never block or break a user action, so every failure
 * is swallowed.
 *
 * Names are canonical — they must exist in `service.EventTypes()` on the Go
 * side (internal/service/event_types.go) or the write is rejected with a 400.
 * The backend still accepts the older web names as aliases, but nothing here
 * should emit them.
 *
 * Anonymous events: a visitor who has not signed up yet still gets an
 * `anon_id` (a UUID in localStorage). Without it the acquisition half of the
 * funnel — landing → signup → activation — cannot be measured at all, because
 * there is no user row to attribute it to yet. The backend only accepts a
 * short pre-signup allowlist without a user (landing_viewed, signup_started,
 * book_viewed, search_performed, vibe_search_performed); everything else is
 * dropped when logged out, which is the intended behaviour.
 */
export type EventName =
  // Acquisition — may fire while logged out.
  | "landing_viewed"
  | "signup_started"
  | "signup_completed"
  // Onboarding.
  | "onboarding_started"
  | "onboarding_book_selected"
  | "onboarding_reader_followed"
  | "onboarding_completed"
  // Reading funnel.
  | "book_viewed"
  | "book_added_to_shelf"
  | "book_started"
  | "book_finished"
  | "book_rated"
  // Discovery surfaces.
  | "feed_viewed"
  | "search_performed"
  | "vibe_search_performed"
  | "profile_viewed"
  | "tbr_nudge_clicked"
  | "suggested_reader_followed"
  // Recommendation feedback.
  | "rec_impression"
  | "rec_click"
  | "rec_dismiss";

const ANON_KEY = "pb_anon_id";
const SESSION_KEY = "pb_session_id";

/**
 * A stable per-browser id, and a per-tab-session id.
 *
 * Both reads are wrapped: Safari private mode and blocked site data throw on
 * access rather than returning null, and an analytics helper that throws would
 * take the calling component down with it. A missing id just means the event
 * is attributed less precisely.
 */
function stableId(storage: "local" | "session", key: string): string | undefined {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    let id = store.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      store.setItem(key, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function track(
  type: EventName,
  metadata?: Record<string, unknown>,
  bookId?: string
): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        book_id: bookId,
        metadata,
        anon_id: stableId("local", ANON_KEY),
        session_id: stableId("session", SESSION_KEY),
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never throw from analytics
  }
}

/**
 * Record that a recommendation was shown, with the reason it carried.
 *
 * `reason_type` is what makes the discovery funnel comparable: /analytics/discovery
 * groups the impression → open → save → finish → 4★ funnel by it, which is how
 * "social proof gets more clicks but genre fit produces more finished books"
 * becomes a visible fact rather than a hunch. An impression logged without it
 * lands in the 'unknown' bucket and tells us nothing.
 */
export function trackRecImpression(bookId: string, reasonType?: string): void {
  track("rec_impression", { reason_type: reasonType ?? "unknown" }, bookId);
}
