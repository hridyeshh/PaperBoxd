import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-token';
import connectDB from '@/lib/db/mongodb';
import RecommendationLog from '@/lib/db/models/RecommendationLog';
import mongoose from 'mongoose';

export const dynamic = "force-dynamic";

/**
 * POST /api/recommendations/feedback
 *
 * Track user feedback on recommendations (shown, clicked, converted, dismissed).
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
    const userIdObj = new mongoose.Types.ObjectId(authUser.id);
    const bookIdObj = new mongoose.Types.ObjectId(bookId);
    await RecommendationLog.updateRecommendationStatus(
      userIdObj,
      bookIdObj,
      action,
      convertedAction
    );

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
    });
  } catch (error: unknown) {
    console.error('Error recording recommendation feedback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to record feedback', details: errorMessage },
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
    const authUser = await getUserFromRequest(request);

    if (!authUser?.id) {
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
  } catch (error: unknown) {
    console.error('Error getting recommendation metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get metrics', details: errorMessage },
      { status: 500 }
    );
  }
}
