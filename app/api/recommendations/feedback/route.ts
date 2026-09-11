import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { goFetchAuthed } from '@/lib/api/endpoints';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'https://paperboxd-backend-production-d9e0.up.railway.app';

/**
 * POST /api/recommendations/feedback
 *
 * Proxies impression (batch) and click/dismiss (single) events to the Go backend.
 * Batch impressions: { items: [{ book_id, reason_type }], event_type: "impression" }
 *                    { book_ids: string[], event_type: "impression" }   (legacy)
 * Single event:      { book_id, reason_type?, event_type: "click" | "dismiss" }
 * Reader verdict:    { book_id, verdict, reason_codes?: string[], reason_type? }
 *
 * A verdict is the reader deliberately answering rather than passive telemetry.
 * The backend suppresses the book for a length of time that depends on which
 * verdict it was — "not now" comes back in three months, "not for me" does not
 * come back — and folds the reason codes into their taste profile.
 *
 * reason_type rides along into the event's metadata because /analytics/discovery
 * groups the impression -> open -> save -> finish -> 4-star funnel by it. An
 * impression sent without one lands in the 'unknown' bucket and cannot be
 * compared against any other reason, which defeats the measurement.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('pb_access_token')?.value ?? '';

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json();

  // Batch impressions — split into individual requests fired in parallel.
  const batch: { book_id: string; reason_type?: string }[] = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.book_ids)
      ? body.book_ids.map((id: string) => ({ book_id: id }))
      : [];

  if (batch.length > 0) {
    await Promise.allSettled(
      batch
        .filter((it) => it?.book_id)
        .map((it) =>
          fetch(`${BACKEND}/api/v1/recommendations/feedback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              book_id: it.book_id,
              reason_type: it.reason_type,
              event_type: 'impression',
            }),
          })
        )
    );
    return NextResponse.json({ ok: true });
  }

  // Single event (click, dismiss) — use goFetchAuthed for auto-refresh.
  const { status } = await goFetchAuthed('/api/v1/recommendations/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return NextResponse.json({ ok: status < 400 });
}

