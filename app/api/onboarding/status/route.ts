import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import UserPreference from '@/lib/db/models/UserPreference';
import User from '@/lib/db/models/User';

/**
 * GET /api/onboarding/status
 *
 * Check if user has completed onboarding.
 * Also returns username status for the onboarding page.
 * Requires authentication.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user has username (in case session hasn't updated yet)
    const user = await User.findById(session.user.id)
      .select('username bookshelf favoriteBooks topBooks createdAt')
      .lean();
    const hasUsername = !!user?.username;
    const username = user?.username || null;

    // Check if user is new (has no activity - no books in any collection)
    const hasActivity = 
      (user?.bookshelf && user.bookshelf.length > 0) ||
      (user?.favoriteBooks && user.favoriteBooks.length > 0) ||
      (user?.topBooks && user.topBooks.length > 0);
    
    // Also check if account was created recently (within last 24 hours)
    const accountAge = user?.createdAt ? Date.now() - new Date(user.createdAt).getTime() : Infinity;
    const isRecentlyCreated = accountAge < 24 * 60 * 60 * 1000; // 24 hours
    const isNewUser = !hasActivity && isRecentlyCreated;

    const preference = await UserPreference.findOne({ userId: session.user.id });

    const completed = preference?.onboarding?.completedAt ? true : false;

    return NextResponse.json({
      completed,
      completedAt: preference?.onboarding?.completedAt || null,
      hasUsername, // Include username status
      username, // Include username for redirect
      isNewUser, // Whether this is a new user (no activity, recently created)
      hasActivity, // Whether user has any books/activity
    });
  } catch (error: unknown) {
    console.error('Error checking onboarding status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to check onboarding status', details: errorMessage },
      { status: 500 }
    );
  }
}

