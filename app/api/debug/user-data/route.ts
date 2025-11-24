import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';

/**
 * DEBUG: Check if current user's data is being fetched correctly
 * GET /api/debug/user-data
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'Not authenticated',
        session: session,
        help: 'You need to sign in first',
      }, { status: 401 });
    }

    await connectDB();

    // Fetch user from database using session ID
    const user = await User.findById(session.user.id)
      .select('email username name avatar bookshelf likedBooks tbrBooks currentlyReading favoriteBooks topBooks activities')
      .lean();

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        sessionUserId: session.user.id,
        help: 'Session user ID does not match any user in database',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        username: session.user.username,
        hasImage: !!session.user.image,
        image: session.user.image,
      },
      database: {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        name: user.name,
        hasAvatar: !!user.avatar,
        avatar: user.avatar,
        bookshelfCount: user.bookshelf?.length || 0,
        likedBooksCount: user.likedBooks?.length || 0,
        tbrBooksCount: user.tbrBooks?.length || 0,
        currentlyReadingCount: user.currentlyReading?.length || 0,
        favoriteBooksCount: user.favoriteBooks?.length || 0,
        topBooksCount: user.topBooks?.length || 0,
        activitiesCount: user.activities?.length || 0,
      },
      bookshelfSample: user.bookshelf?.slice(0, 2).map((b) => ({
        bookId: b.bookId?.toString(),
        title: b.title,
        author: b.author,
        rating: b.rating,
      })),
      match: {
        sessionIdMatchesDatabase: session.user.id === user._id.toString(),
        emailMatch: session.user.email === user.email,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({
      error: 'Failed to fetch user data',
      message: errorMessage,
      stack: errorStack,
    }, { status: 500 });
  }
}
