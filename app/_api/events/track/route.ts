import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-token';
import connectDB from '@/lib/db/mongodb';
import { EventTracker } from '@/lib/services/EventTracker';
import { EventType } from '@/lib/db/models/Event';

export const dynamic = "force-dynamic";

/**
 * POST /api/events/track
 *
 * Track user interaction events.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);

    if (!authUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { type, metadata, sessionId } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    // Validate event type
    if (!Object.values(EventType).includes(type as EventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    const eventTracker = new EventTracker();
    await eventTracker.track(
      type as EventType,
      authUser.id,
      metadata || {},
      sessionId
    );

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error: unknown) {
    console.error('Error tracking event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to track event', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/track/batch
 *
 * Track multiple events in batch.
 */
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);

    if (!authUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Events array is required' },
        { status: 400 }
      );
    }

    const eventTracker = new EventTracker();

    // Add userId to each event
    const eventsWithUser = events.map(event => ({
      ...event,
      userId: authUser.id,
    }));

    await eventTracker.trackBatch(eventsWithUser);

    return NextResponse.json({
      success: true,
      message: `${events.length} events tracked successfully`,
    });
  } catch (error: unknown) {
    console.error('Error tracking batch events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to track events', details: errorMessage },
      { status: 500 }
    );
  }
}
