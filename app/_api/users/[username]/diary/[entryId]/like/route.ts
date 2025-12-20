import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-token';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import type { IDiaryEntry } from '@/lib/db/models/User';
import mongoose from 'mongoose';

// Type for diary entry with _id (can be Mongoose subdocument or plain object)
type DiaryEntryWithId = IDiaryEntry & {
  _id?: mongoose.Types.ObjectId | string;
  toObject?: () => IDiaryEntry & { _id?: mongoose.Types.ObjectId | string; createdAt?: Date };
};


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
    const authUser = await getUserFromRequest(request);
    const { username, entryId } = await context.params;

    if (!authUser?.id) {
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
      (entry) => {
        const entryWithId = entry as DiaryEntryWithId;
        if (!entryWithId._id) return false;
        const entryIdStr = entryWithId._id.toString();
        return entryIdStr === entryId;
      }
    );
    
    // If not found, try comparing as strings (handles edge cases)
    if (entryIndex === -1) {
      entryIndex = user.diaryEntries.findIndex(
        (entry) => {
          const entryWithId = entry as DiaryEntryWithId;
          if (!entryWithId._id) return false;
          const entryIdStr = String(entryWithId._id);
          const compareId = String(entryId);
          return entryIdStr === compareId;
        }
      );
    }

    if (entryIndex === -1) {
      console.error('[Diary Like API] Entry not found:', {
        entryId,
        entryIdType: typeof entryId,
        entryIds: user.diaryEntries.map((e, idx: number) => {
          const entryWithId = e as DiaryEntryWithId;
          return {
            index: idx,
            _id: entryWithId._id?.toString(),
            _idType: typeof entryWithId._id,
            hasId: !!entryWithId._id,
          };
        }),
        totalEntries: user.diaryEntries.length,
      });
      return NextResponse.json({ 
        error: 'Diary entry not found',
        details: `Entry with ID "${entryId}" not found. Total entries: ${user.diaryEntries.length}`
      }, { status: 404 });
    }

    const entry = user.diaryEntries[entryIndex] as DiaryEntryWithId;
    const userId = new mongoose.Types.ObjectId(authUser.id);
    const userIdStr = authUser.id;

    // Initialize likes array if it doesn't exist
    if (!entry.likes) {
      entry.likes = [];
    }

    // Check if user already liked this entry
    // Handle both ObjectId and string formats
    type LikeId = mongoose.Types.ObjectId | string;
    const isLiked = entry.likes.some((id: LikeId) => {
      const idStr = id?.toString ? id.toString() : String(id);
      return idStr === userIdStr;
    });

    console.log('[Diary Like API] Toggling like:', {
      entryId,
      userId: userIdStr,
      isLiked,
      currentLikesCount: entry.likes.length,
      likes: entry.likes.map((id: LikeId) => id?.toString ? id.toString() : String(id)),
    });

    // Use direct MongoDB update to avoid validating all entries
    // This prevents validation errors for general diary entries without bookId/bookTitle/bookAuthor
    if (isLiked) {
      // Unlike: remove user ID from likes array
      // Need to remove both ObjectId and string formats
      // First try with ObjectId
      const entryIdForQuery = entry._id as mongoose.Types.ObjectId | string;
      let updateResult = await User.updateOne(
        { 
          _id: user._id,
          'diaryEntries._id': entryIdForQuery
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
            'diaryEntries._id': entryIdForQuery
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
      const entryIdForQuery = entry._id as mongoose.Types.ObjectId | string;
      const updateResult = await User.updateOne(
        { 
          _id: user._id,
          'diaryEntries._id': entryIdForQuery
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

      // Create activity notification for the diary entry owner
      // Only create activity if the liker is not the owner (don't notify yourself)
      const ownerIdStr = user._id?.toString ? user._id.toString() : String(user._id);
      if (ownerIdStr !== userIdStr) {
        // Get the liker's user info
        const likerUser = await User.findById(userId).select('username name avatar').lean();
        
        if (likerUser) {
          // Determine the diary entry name/subject
          const entrySubject = entry.subject && entry.subject.trim() 
            ? entry.subject 
            : (entry.bookTitle || 'your diary entry');
          
          // Add activity to the diary entry owner's activities
          const newActivity = {
            type: "liked_diary_entry" as const,
            diaryEntryId: entryIdForQuery,
            subject: entrySubject,
            sharedBy: userId,
            sharedByUsername: likerUser.username || '',
            timestamp: new Date(),
          };

          // Re-fetch the user to ensure we have the latest document
          const freshUser = await User.findById(user._id);
          if (freshUser) {
            if (!freshUser.activities) {
              freshUser.activities = [];
            }
            freshUser.activities.push(newActivity);
            await freshUser.save();
          }
        }
      }
    }

    // Fetch the updated entry to get the new likes count
    const entryIdForQuery = entry._id as mongoose.Types.ObjectId | string;
    const updatedUser = await User.findOne({
      _id: user._id,
      'diaryEntries._id': entryIdForQuery
    }).select('diaryEntries');

    if (!updatedUser) {
      throw new Error('Failed to fetch updated entry');
    }

    const entryIdStr = entry._id?.toString();
    const updatedEntry = updatedUser.diaryEntries.find((e) => {
      const entryWithId = e as DiaryEntryWithId;
      return entryWithId._id?.toString() === entryIdStr;
    });

    if (!updatedEntry) {
      throw new Error('Entry not found after update');
    }

    const newLikesCount = updatedEntry.likes?.length || 0;
    const newLiked = updatedEntry.likes?.some((id: LikeId) => {
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
  } catch (error: unknown) {
    console.error('[Diary Like API] Error toggling diary entry like:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const errorStack = error instanceof Error ? error.stack?.substring(0, 500) : undefined;
    console.error('[Diary Like API] Error details:', {
      message: errorMessage,
      name: errorName,
      stack: errorStack,
    });
    return NextResponse.json(
      { 
        error: 'Failed to toggle like', 
        details: errorMessage,
        errorName: errorName
      },
      { status: 500 }
    );
  }
}

