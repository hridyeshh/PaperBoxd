import { NextRequest, NextResponse } from 'next/server';
import { goFetchAuthed } from '@/lib/api/endpoints';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, book_id, metadata } = body;

    if (!type) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    const { data, status } = await goFetchAuthed('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify({ event_type: type, book_id: book_id ?? undefined, metadata: metadata ?? undefined }),
    });

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
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Events array is required' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      events.map((event) =>
        goFetchAuthed('/api/v1/events', {
          method: 'POST',
          body: JSON.stringify({
            event_type: event.type,
            book_id: event.book_id ?? undefined,
            metadata: event.metadata ?? undefined,
          }),
        }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    return NextResponse.json({ success: true, tracked: events.length - failed, failed });
  } catch (error: unknown) {
    console.error('Error tracking batch events:', error);
    return NextResponse.json({ error: 'Failed to track events' }, { status: 500 });
  }
}
