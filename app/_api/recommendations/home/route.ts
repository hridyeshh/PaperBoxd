import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-token';
import connectDB from '@/lib/db/mongodb';
import RecommendationCache from '@/lib/db/models/RecommendationCache';
import { RecommendationService } from '@/lib/services/RecommendationService';
import mongoose from 'mongoose';

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations/home
 *
 * Get personalized homepage recommendations for authenticated user.
 * Uses cached recommendations if available and fresh, otherwise generates new ones.
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Try to get from cache first
    if (!forceRefresh) {
      const userIdObj = new mongoose.Types.ObjectId(authUser.id);
      const cached = await RecommendationCache.getFreshRecommendations(
        userIdObj,
        'home',
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

    // Generate fresh recommendations
    const recommendationService = new RecommendationService(authUser.id);

    const context = {
      page: 'home',
      sessionId: request.headers.get('x-session-id') || undefined,
      timeOfDay: getTimeOfDay(),
    };

    const recommendations = await recommendationService.getRecommendations(
      authUser.id,
      limit,
      context
    );

    // Cache for next time (don't await)
    cacheRecommendations(authUser.id, recommendations).catch(err => {
      console.error('Failed to cache recommendations:', err);
    });

    return NextResponse.json({
      recommendations,
      source: 'fresh',
      cached: false,
    });
  } catch (error: unknown) {
    console.error('Error generating recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get time of day
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Helper: Cache recommendations
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

async function cacheRecommendations(userId: string, recommendations: RecommendationItem[]): Promise<void> {
  const cached = recommendations.map(rec => ({
    bookId: typeof rec.bookId === 'string' ? new mongoose.Types.ObjectId(rec.bookId) : rec.bookId,
    score: rec.score,
    reason: rec.reason,
    algorithm: rec.algorithm,
    position: rec.position,
    scoreBreakdown: rec.scoreBreakdown,
  }));

  const userIdObj = new mongoose.Types.ObjectId(userId);
  await RecommendationCache.cacheRecommendations(
    userIdObj,
    cached,
    [], // Friend recommendations cached separately
    1, // 1 hour TTL
    'hybrid'
  );
}
