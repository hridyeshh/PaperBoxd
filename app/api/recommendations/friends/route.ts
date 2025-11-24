import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import RecommendationCache from '@/lib/db/models/RecommendationCache';
import { FriendRecommendations } from '@/lib/services/FriendRecommendations';
import mongoose from 'mongoose';

/**
 * GET /api/recommendations/friends
 *
 * Get recommendations based on friend activity.
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Try to get from cache first
    if (!forceRefresh) {
      const userIdObj = new mongoose.Types.ObjectId(session.user.id);
      const cached = await RecommendationCache.getFreshRecommendations(
        userIdObj,
        'friends',
        limit
      );

      if (cached) {
        return NextResponse.json({
          recommendations: cached,
          source: 'cache',
          cached: true,
        });
      }
    }

    // Generate fresh friend recommendations
    const friendRecommendations = new FriendRecommendations();
    const recommendations = await friendRecommendations.getFriendRecommendations(
      session.user.id,
      limit
    );

    // Cache for next time (don't await)
    cacheFriendRecommendations(session.user.id, recommendations).catch(err => {
      console.error('Failed to cache friend recommendations:', err);
    });

    return NextResponse.json({
      recommendations,
      source: 'fresh',
      cached: false,
    });
  } catch (error: unknown) {
    console.error('Error generating friend recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate friend recommendations', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Helper: Cache friend recommendations
 */
type RecommendationItem = {
  bookId: mongoose.Types.ObjectId | string;
  score: number;
  reason: string;
  algorithm: string;
  position: number;
  scoreBreakdown?: {
    genre: number;
    author: number;
    quality: number;
    friends: number;
    trending: number;
    recency: number;
    diversity: number;
  };
};

async function cacheFriendRecommendations(userId: string, recommendations: RecommendationItem[]): Promise<void> {
  const cached = recommendations.map(rec => ({
    bookId: typeof rec.bookId === 'string' ? new mongoose.Types.ObjectId(rec.bookId) : rec.bookId,
    score: rec.score,
    reason: rec.reason,
    algorithm: rec.algorithm,
    position: rec.position,
    scoreBreakdown: rec.scoreBreakdown,
  }));

  // Get existing cache to preserve home recommendations
  const userIdObj = new mongoose.Types.ObjectId(userId);
  const existing = await RecommendationCache.findOne({ userId: userIdObj });

  if (existing) {
    existing.friendRecommendations = cached;
    existing.generatedAt = new Date();
    existing.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    existing.isStale = false;
    await existing.save();
  } else {
    await RecommendationCache.cacheRecommendations(
      userIdObj,
      [], // Home recommendations empty
      cached,
      1,
      'friend-activity'
    );
  }
}
