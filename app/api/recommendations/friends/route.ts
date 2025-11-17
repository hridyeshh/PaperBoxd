import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import RecommendationCache from '@/lib/db/models/RecommendationCache';
import { FriendRecommendations } from '@/lib/services/FriendRecommendations';

/**
 * GET /api/recommendations/friends
 *
 * Get recommendations based on friend activity.
 * Requires authentication.
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Try to get from cache first
    if (!forceRefresh) {
      const cached = await RecommendationCache.getFreshRecommendations(
        session.user.id,
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
  } catch (error: any) {
    console.error('Error generating friend recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate friend recommendations', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper: Cache friend recommendations
 */
async function cacheFriendRecommendations(userId: string, recommendations: any[]): Promise<void> {
  const cached = recommendations.map(rec => ({
    bookId: rec.bookId,
    score: rec.score,
    reason: rec.reason,
    algorithm: rec.algorithm,
    position: rec.position,
    scoreBreakdown: rec.scoreBreakdown,
  }));

  // Get existing cache to preserve home recommendations
  const existing = await RecommendationCache.findOne({ userId });

  if (existing) {
    existing.friendRecommendations = cached;
    existing.generatedAt = new Date();
    existing.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    existing.isStale = false;
    await existing.save();
  } else {
    await RecommendationCache.cacheRecommendations(
      userId,
      [], // Home recommendations empty
      cached,
      1,
      'friend-activity'
    );
  }
}
