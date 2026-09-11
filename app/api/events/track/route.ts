import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { goFetch, goFetchAuthed } from '@/lib/api/endpoints';

/**
 * Analytics ingest proxy.
 *
 * Forwards to the Go /api/v1/events endpoint, which is registered with
 * OptionalAuthenticate. When the visitor has no session we must call goFetch
 * (no Authorization header) rather than goFetchAuthed: goFetchAuthed treats a
 * 401 as a signal to spend the refresh token, and a logged-out landing_viewed
 * would otherwise trigger a pointless refresh attempt on every page load.
 *
 * Anonymous rows are only accepted by the backend for the pre-signup event
 * allowlist; anything else without a session is rejected there. Either way this
 * route never fails a page — the caller ignores the response.
 */
type EventBody = {
  type?: string;
  book_id?: string;
  metadata?: Record<string, unknown>;
  anon_id?: string;
  session_id?: string;
  path?: string;
};

function toGoPayload(e: EventBody) {
  return JSON.stringify({
    event_type: e.type,
    book_id: e.book_id ?? undefined,
    metadata: e.metadata ?? undefined,
    anon_id: e.anon_id ?? undefined,
    session_id: e.session_id ?? undefined,
    path: e.path ?? undefined,
    source: 'web',
  });
}

async function forward(payload: string) {
  const cookieStore = await cookies();
  const signedIn = Boolean(cookieStore.get('pb_access_token')?.value);
  const init = { method: 'POST', body: payload };
  return signedIn
    ? goFetchAuthed('/api/v1/events', init)
    : goFetch('/api/v1/events', init);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EventBody;

    if (!body.type) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    const { data, status } = await forward(toGoPayload(body));

    if (status >= 400) {
      return NextResponse.json({ error: 'Failed to track event' }, { status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    console.error('Error tracking event:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body as { events?: EventBody[] };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Events array is required' }, { status: 400 });
    }

    const results = await Promise.allSettled(events.map((e) => forward(toGoPayload(e))));

    const failed = results.filter((r) => r.status === 'rejected').length;
    return NextResponse.json({ success: true, tracked: events.length - failed, failed });
  } catch (error: unknown) {
    console.error('Error tracking batch events:', error);
    return NextResponse.json({ error: 'Failed to track events' }, { status: 500 });
  }
}
