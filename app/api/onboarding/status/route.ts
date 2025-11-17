import { NextRequest, NextResponse } from 'next/server';
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

    // Check if user has username (in case session hasn't updated yet)
    const user = await User.findById(session.user.id).select('username').lean();
    const hasUsername = !!user?.username;
    const username = user?.username || null;

    const preference = await UserPreference.findOne({ userId: session.user.id });

    const completed = preference?.onboarding?.completedAt ? true : false;

    return NextResponse.json({
      completed,
      completedAt: preference?.onboarding?.completedAt || null,
      hasUsername, // Include username status
      username, // Include username for redirect
    });
  } catch (error: any) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status', details: error.message },
      { status: 500 }
    );
  }
}

