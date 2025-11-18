import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/users/[username]/diary/[entryId]/like
 * Like or unlike a diary entry
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; entryId: string }> }
) {
  try {
    const session = await auth();
    const { username, entryId } = await context.params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize diaryEntries if it doesn't exist
    if (!user.diaryEntries) {
      user.diaryEntries = [];
    }

    // Find the diary entry by _id
    // Try multiple ID formats to handle different response formats
    let entryIndex = -1;
    
    // First, try to find by _id (most common case)
    entryIndex = user.diaryEntries.findIndex(
      (entry: any) => {
        if (!entry._id) return false;
        const entryIdStr = entry._id.toString();
        return entryIdStr === entryId;
      }
    );
    
    // If not found, try comparing as strings (handles edge cases)
    if (entryIndex === -1) {
      entryIndex = user.diaryEntries.findIndex(
        (entry: any) => {
          if (!entry._id) return false;
          const entryIdStr = String(entry._id);
          const compareId = String(entryId);
          return entryIdStr === compareId;
        }
      );
    }

    if (entryIndex === -1) {
      console.error('[Diary Like API] Entry not found:', {
        entryId,
        entryIdType: typeof entryId,
        entryIds: user.diaryEntries.map((e: any, idx: number) => ({
          index: idx,
          _id: e._id?.toString(),
          _idType: typeof e._id,
          hasId: !!e._id,
        })),
        totalEntries: user.diaryEntries.length,
      });
      return NextResponse.json({ 
        error: 'Diary entry not found',
        details: `Entry with ID "${entryId}" not found. Total entries: ${user.diaryEntries.length}`
      }, { status: 404 });
    }

    const entry = user.diaryEntries[entryIndex];
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const userIdStr = session.user.id;

    // Initialize likes array if it doesn't exist
    if (!entry.likes) {
      entry.likes = [];
    }

    // Check if user already liked this entry
    // Handle both ObjectId and string formats
    const isLiked = entry.likes.some((id: any) => {
      const idStr = id?.toString ? id.toString() : String(id);
      return idStr === userIdStr;
    });

    console.log('[Diary Like API] Toggling like:', {
      entryId,
      userId: userIdStr,
      isLiked,
      currentLikesCount: entry.likes.length,
      likes: entry.likes.map((id: any) => id?.toString ? id.toString() : String(id)),
    });

    // Use direct MongoDB update to avoid validating all entries
    // This prevents validation errors for general diary entries without bookId/bookTitle/bookAuthor
    if (isLiked) {
      // Unlike: remove user ID from likes array
      // Need to remove both ObjectId and string formats
      // First try with ObjectId
      let updateResult = await User.updateOne(
        { 
          _id: user._id,
          'diaryEntries._id': entry._id
        },
        {
          $pull: {
            'diaryEntries.$.likes': userId
          }
        }
      );

      // Also try removing as string format if the above didn't work
      if (updateResult.modifiedCount === 0) {
        updateResult = await User.updateOne(
          { 
            _id: user._id,
            'diaryEntries._id': entry._id
          },
          {
            $pull: {
              'diaryEntries.$.likes': userIdStr
            }
          }
        );
      }

      if (!updateResult.acknowledged) {
        throw new Error('Failed to unlike entry');
      }
    } else {
      // Like: add user ID to likes array (avoid duplicates using $addToSet)
      const updateResult = await User.updateOne(
        { 
          _id: user._id,
          'diaryEntries._id': entry._id
        },
        {
          $addToSet: {
            'diaryEntries.$.likes': userId
          }
        }
      );

      if (!updateResult.acknowledged) {
        throw new Error('Failed to like entry');
      }
    }

    // Fetch the updated entry to get the new likes count
    const updatedUser = await User.findOne({
      _id: user._id,
      'diaryEntries._id': entry._id
    }).select('diaryEntries');

    if (!updatedUser) {
      throw new Error('Failed to fetch updated entry');
    }

    const updatedEntry = updatedUser.diaryEntries.find((e: any) => 
      e._id?.toString() === entry._id?.toString()
    );

    if (!updatedEntry) {
      throw new Error('Entry not found after update');
    }

    const newLikesCount = updatedEntry.likes?.length || 0;
    const newLiked = updatedEntry.likes?.some((id: any) => {
      const idStr = id?.toString ? id.toString() : String(id);
      return idStr === userIdStr;
    }) || false;

    console.log('[Diary Like API] Like toggled successfully:', {
      newLiked: newLiked,
      newLikesCount: newLikesCount,
    });

    return NextResponse.json({
      liked: newLiked,
      likesCount: newLikesCount,
    });
  } catch (error: any) {
    console.error('[Diary Like API] Error toggling diary entry like:', error);
    console.error('[Diary Like API] Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
    });
    return NextResponse.json(
      { 
        error: 'Failed to toggle like', 
        details: error?.message || 'Unknown error',
        errorName: error?.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
}

