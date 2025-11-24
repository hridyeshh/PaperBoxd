import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import { UserProfileBuilder } from '@/lib/services/UserProfileBuilder';
import { EventTracker } from '@/lib/services/EventTracker';

/**
 * POST /api/onboarding
 *
 * Complete user onboarding quiz and initialize preferences.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { genres, authors } = body;

    // Validate input
    if (!Array.isArray(genres) || genres.length === 0) {
      return NextResponse.json(
        { error: 'At least one genre is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(authors)) {
      return NextResponse.json(
        { error: 'Authors array is required' },
        { status: 400 }
      );
    }

    // Transform genres to include weights
    const genresWithWeights = genres.map((genre, index) => ({
      genre,
      weight: 5 - (index * 0.5), // Descending weights: 5, 4.5, 4, 3.5, 3
    }));

    // Create user preference with onboarding data
    const profileBuilder = new UserProfileBuilder();
    await profileBuilder.mergeOnboardingPreferences(
      session.user.id,
      genresWithWeights,
      authors
    );

    // Track onboarding completion event
    const eventTracker = new EventTracker();
    await eventTracker.trackOnboardingCompleted(
      session.user.id,
      genres,
      authors
    );

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      preferences: {
        genres: genresWithWeights,
        authors,
      },
    });
  } catch (error: unknown) {
    console.error('Error completing onboarding:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to complete onboarding', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/genres
 *
 * Get list of popular genres for onboarding quiz.
 * Public endpoint.
 */
export async function GET() {
  try {
    // Predefined list of popular genres
    const genres = [
      { id: 'fiction', name: 'Fiction', description: 'Literary and contemporary fiction' },
      { id: 'mystery', name: 'Mystery', description: 'Detective stories and whodunits' },
      { id: 'thriller', name: 'Thriller', description: 'Suspenseful page-turners' },
      { id: 'romance', name: 'Romance', description: 'Love stories and relationships' },
      { id: 'science-fiction', name: 'Science Fiction', description: 'Futuristic and speculative' },
      { id: 'fantasy', name: 'Fantasy', description: 'Magic and mythical worlds' },
      { id: 'horror', name: 'Horror', description: 'Scary and supernatural' },
      { id: 'historical', name: 'Historical Fiction', description: 'Stories set in the past' },
      { id: 'biography', name: 'Biography', description: 'True stories of real people' },
      { id: 'self-help', name: 'Self-Help', description: 'Personal development' },
      { id: 'business', name: 'Business', description: 'Business and economics' },
      { id: 'non-fiction', name: 'Non-Fiction', description: 'True stories and factual' },
      { id: 'young-adult', name: 'Young Adult', description: 'Books for teens and young adults' },
      { id: 'classics', name: 'Classics', description: 'Timeless literary works' },
      { id: 'poetry', name: 'Poetry', description: 'Verse and poetic works' },
    ];

    return NextResponse.json({
      genres,
    });
  } catch (error: unknown) {
    console.error('Error getting genres:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get genres', details: errorMessage },
      { status: 500 }
    );
  }
}
