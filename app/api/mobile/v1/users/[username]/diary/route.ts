import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-token';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import type { IDiaryEntry } from '@/lib/db/models/User';
import mongoose from 'mongoose';

// Type for diary entry with _id (can be Mongoose subdocument or plain object)
type DiaryEntryWithId = IDiaryEntry & {
  _id?: mongoose.Types.ObjectId | string;
  toObject?: () => IDiaryEntry & { _id?: mongoose.Types.ObjectId | string };
};

// Type for like ID (can be ObjectId or string)
type LikeId = mongoose.Types.ObjectId | string;

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/v1/users/[username]/diary
 * Get all diary entries for a user (Mobile API)
 * Headers: Authorization: Bearer <token>
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[Mobile Diary API] [${requestId}] === REQUEST START ===`);
    console.log(`[Mobile Diary API] [${requestId}] Path: ${request.nextUrl.pathname}`);
    console.log(`[Mobile Diary API] [${requestId}] Method: ${request.method}`);
    console.log(`[Mobile Diary API] [${requestId}] Timestamp: ${new Date().toISOString()}`);
    
    const { username } = await context.params;
    console.log(`[Mobile Diary API] [${requestId}] Username: ${username}`);
    
    // Check authentication (Bearer token for mobile)
    const authUser = await getUserFromRequest(request);
    
    if (!authUser || !authUser.id) {
      console.log(`[Mobile Diary API] [${requestId}] ❌ AUTH FAILED: No auth user or missing ID`);
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in to view diary entries' },
        { status: 401 }
      );
    }
    
    console.log(`[Mobile Diary API] [${requestId}] ✅ Authenticated user:`, {
      id: authUser.id,
      username: authUser.username,
      email: authUser.email,
    });
    
    await connectDB();
    console.log(`[Mobile Diary API] [${requestId}] ✅ Database connected`);

    // Fetch user's diary entries
    const user = await User.findOne({ username })
      .select('diaryEntries')
      .lean();

    if (!user) {
      console.log(`[Mobile Diary API] [${requestId}] ❌ User not found: ${username}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Convert to plain object for response
    const userPlain = user as { diaryEntries?: DiaryEntryWithId[] };

    // Sort by updatedAt descending (newest first) and add like info
    const currentUserId = authUser.id;
    type EntryResponse = DiaryEntryWithId & {
      id?: string;
      isLiked: boolean;
      likesCount: number;
    };
    
    const entries = (userPlain.diaryEntries || []).map((entry: DiaryEntryWithId): EntryResponse => {
      const likesArray = entry.likes || [];
      const isLiked = currentUserId ? likesArray.some((id: LikeId) => id.toString() === currentUserId) : false;

      return {
        ...entry,
        _id: entry._id?.toString() || entry._id, // Ensure _id is included as string
        id: entry._id?.toString() || undefined,
        subject: entry.subject || null, // Explicitly include subject
        isLiked,
        likesCount: likesArray.length,
      };
    }).sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log(`[Mobile Diary API] [${requestId}] ✅ Found ${entries.length} diary entries for user: ${username}`);
    console.log(`[Mobile Diary API] [${requestId}] Entry subjects:`, entries.map((e) => ({ id: e.id, subject: e.subject, bookTitle: e.bookTitle })));

    return NextResponse.json({
      entries,
      count: entries.length,
    });
  } catch (error: unknown) {
    console.error(`[Mobile Diary API] [${requestId}] ❌ Error fetching diary entries:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch diary entries', details: errorMessage },
      { status: 500 }
    );
  }
}

