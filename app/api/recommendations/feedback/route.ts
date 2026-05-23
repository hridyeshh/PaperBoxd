import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { goFetchAuthed } from '@/lib/api/endpoints';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'https://paperboxd-backend-production-d9e0.up.railway.app';

/**
 * POST /api/recommendations/feedback
 *
 * Proxies impression (batch) and click/dismiss (single) events to the Go backend.
 * Batch impressions: { book_ids: string[], event_type: "impression" }
 * Single event:      { book_id: string, event_type: "click" | "dismiss" }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('pb_access_token')?.value ?? '';

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json();

  // Batch impressions — split into individual requests fired in parallel.
  if (Array.isArray(body.book_ids)) {
    await Promise.allSettled(
      body.book_ids.map((bookId: string) =>
        fetch(`${BACKEND}/api/v1/recommendations/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ book_id: bookId, event_type: 'impression' }),
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

