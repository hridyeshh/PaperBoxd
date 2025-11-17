import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import RecommendationLog from '@/lib/db/models/RecommendationLog';

/**
 * POST /api/recommendations/feedback
 *
 * Track user feedback on recommendations (shown, clicked, converted, dismissed).
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { bookId, action, convertedAction } = body;

    if (!bookId || !action) {
      return NextResponse.json(
        { error: 'bookId and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['shown', 'clicked', 'converted', 'dismissed'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: shown, clicked, converted, or dismissed' },
        { status: 400 }
      );
    }

    // Update recommendation log
    await RecommendationLog.updateRecommendationStatus(
      session.user.id,
      bookId,
      action,
      convertedAction
    );

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
    });
  } catch (error: any) {
    console.error('Error recording recommendation feedback:', error);
    return NextResponse.json(
      { error: 'Failed to record feedback', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recommendations/feedback/metrics
 *
 * Get recommendation performance metrics.
 * Admin endpoint for analytics.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const algorithm = searchParams.get('algorithm') || undefined;
    const days = parseInt(searchParams.get('days') || '7');

    const metrics = await RecommendationLog.getAlgorithmMetrics(algorithm || 'hybrid', days);

    return NextResponse.json({
      metrics,
      algorithm: algorithm || 'all',
      days,
    });
  } catch (error: any) {
    console.error('Error getting recommendation metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get metrics', details: error.message },
      { status: 500 }
    );
  }
}
