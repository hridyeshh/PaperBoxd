/**
 * Normalises the various error envelopes the Go backend has emitted over time
 * into a single human-readable message.
 *
 * Shapes seen in the wild:
 *   { "error": "human msg", "code": "SNAKE_CASE" }      // current (mobile-ready)
 *   { "error": { "code": "...", "message": "..." } }    // legacy nested
 *   { "message": "..." }                                // plain
 *   { "details": "..." }                                // older proxies
 *
 * Returns `fallback` only when none of those keys produced a string.
 */
export function extractGoError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as {
    error?: unknown;
    message?: unknown;
    details?: unknown;
  };
  if (typeof d.error === "string") return d.error;
  if (d.error && typeof d.error === "object") {
    const inner = d.error as { message?: unknown };
    if (typeof inner.message === "string") return inner.message;
  }
  if (typeof d.message === "string") return d.message;
  if (typeof d.details === "string") return d.details;
  return fallback;
}

/** Pulls the SNAKE_CASE error code when the backend sent one, else undefined. */
export function extractGoErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as { code?: unknown; error?: unknown };
  if (typeof d.code === "string") return d.code;
  if (d.error && typeof d.error === "object") {
    const inner = d.error as { code?: unknown };
    if (typeof inner.code === "string") return inner.code;
  }
  return undefined;
}
