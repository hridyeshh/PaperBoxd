import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Book from '@/lib/db/models/Book';
import mongoose from 'mongoose';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[username]/diary
 * Get all diary entries for a user
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();
    const { username } = await context.params;
    await connectDB();

    const user = await User.findOne({ username })
      .select('diaryEntries');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Convert to plain object for response
    const userPlain = user.toObject ? user.toObject() : user;

    // Sort by updatedAt descending (newest first) and add like info
    const currentUserId = session?.user?.id;
    const entries = (userPlain.diaryEntries || []).map((entry: any) => {
      const likesArray = entry.likes || [];
      const isLiked = currentUserId ? likesArray.some((id: any) => id.toString() === currentUserId) : false;

      return {
        _id: entry._id?.toString() || entry._id, // Ensure _id is included as string
        ...entry,
        id: entry._id?.toString() || entry.id,
        subject: entry.subject || null, // Explicitly include subject
        isLiked,
        likesCount: likesArray.length,
      };
    }).sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log('[Diary API] GET - Found', entries.length, 'diary entries for user:', username);
    console.log('[Diary API] GET - Entry subjects:', entries.map((e: any) => ({ id: e.id, subject: e.subject, bookTitle: e.bookTitle })));

    return NextResponse.json({
      entries,
      count: entries.length,
    });
  } catch (error: any) {
    console.error('Error fetching diary entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diary entries', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/[username]/diary
 * Create or update a diary entry for a book
 * Body: {
 *   bookId: string,
 *   content: string (HTML),
 *   bookTitle?: string (optional - used if book not in DB),
 *   bookAuthor?: string (optional - used if book not in DB),
 *   bookCover?: string (optional - used if book not in DB),
 *   volumeInfo?: object (optional - full book data if not in DB)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();
    const { username } = await context.params;
    const body = await request.json();
    const { bookId, content, subject, bookTitle: providedTitle, bookAuthor: providedAuthor, bookCover: providedCover, volumeInfo } = body;

    console.log('[Diary API] POST request received:', {
      username,
      bookId: typeof bookId === 'string' ? bookId.substring(0, 50) : bookId,
      contentLength: content?.length,
      subject: subject,
      hasSubject: 'subject' in body,
      subjectType: typeof subject
    });

    if (!session?.user?.id) {
      console.log('[Diary API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!content) {
      console.log('[Diary API] Missing required field: content');
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // bookId is optional - if not provided, this is a general diary entry
    const isGeneralEntry = !bookId;

    await connectDB();

    // Verify user owns this profile
    const user = await User.findOne({ username });
    if (!user) {
      console.log('[Diary API] User not found:', username);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUserId = user._id?.toString();
    if (!currentUserId || currentUserId !== session.user.id) {
      console.log('[Diary API] Forbidden - user mismatch:', { userId: currentUserId, sessionId: session.user.id });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let bookTitle, bookAuthor, bookCover, bookMongoId;

    // Only fetch book details if bookId is provided
    if (!isGeneralEntry && bookId) {
      // Get book details - handle different ID formats
      // Check if it's a MongoDB ObjectId (24 hex characters)
      const isMongoObjectId = typeof bookId === 'string' && /^[0-9a-fA-F]{24}$/.test(bookId);
      console.log('[Diary API] Searching for book:', { bookId: typeof bookId === 'string' ? bookId.substring(0, 50) : bookId, isMongoObjectId });

      let book = await Book.findOne(
        isMongoObjectId
          ? { _id: bookId } // Search by MongoDB ObjectId
          : {
              $or: [
                { isbndbId: bookId },
                { openLibraryId: bookId },
                { isbn: bookId },
                { isbn13: bookId },
              ],
            }
      ).lean();

      if (!book) {
        console.log('[Diary API] Book not found in database for ID:', typeof bookId === 'string' ? bookId.substring(0, 50) : bookId);

        // If book details were provided, use them
        if (providedTitle && providedAuthor) {
          console.log('[Diary API] Using provided book details instead');
          bookTitle = providedTitle;
          bookAuthor = providedAuthor;
          bookCover = providedCover || '';

          // Create a new book entry in the database
          const newBook = new Book({
            isbndbId: bookId,
            volumeInfo: volumeInfo || {
              title: providedTitle,
              authors: [providedAuthor],
              imageLinks: providedCover ? { thumbnail: providedCover } : {},
            },
          });

        const savedBook = await newBook.save();
        bookMongoId = savedBook._id?.toString() || '';
          console.log('[Diary API] Created new book in database:', { bookId: bookMongoId, title: bookTitle });
        } else {
          console.log('[Diary API] No book details provided and book not found');
          return NextResponse.json({
            error: 'Book not found. Please provide book details (bookTitle, bookAuthor, bookCover).'
          }, { status: 404 });
        }
      } else {
        console.log('[Diary API] Book found:', { bookId: book._id.toString(), title: book.volumeInfo?.title });
        bookTitle = book.volumeInfo?.title || 'Unknown Title';
        bookAuthor = book.volumeInfo?.authors?.[0] || 'Unknown Author';
        bookCover = book.volumeInfo?.imageLinks?.thumbnail ||
                          book.volumeInfo?.imageLinks?.smallThumbnail ||
                          book.volumeInfo?.imageLinks?.medium ||
                          '';
        bookMongoId = book._id.toString();
      }
    } else {
      // General diary entry - no book associated
      bookTitle = null;
      bookAuthor = null;
      bookCover = null;
      bookMongoId = null;
    }
    
    // Initialize diaryEntries if it doesn't exist
    if (!user.diaryEntries) {
      user.diaryEntries = [];
    }
    
    let wasUpdated = false;
    
    if (isGeneralEntry) {
      // For general entries, always create a new entry (no bookId to match against)
      // Use direct MongoDB update to bypass Mongoose validation on existing entries
      const newEntry: any = {
        content,
        likes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Add subject if provided (must be a non-empty string)
      if (subject && typeof subject === 'string' && subject.trim().length > 0) {
        newEntry.subject = subject.trim();
        console.log('[Diary API] Adding subject to entry:', newEntry.subject);
      } else {
        console.log('[Diary API] No subject provided or subject is empty');
      }
      
      console.log('[Diary API] New entry object before save:', JSON.stringify(newEntry, null, 2));
      
      // Use updateOne to push the entry directly, bypassing full document validation
      const updateResult = await User.updateOne(
        { _id: user._id },
        { $push: { diaryEntries: newEntry } }
      );
      
      if (!updateResult.acknowledged) {
        throw new Error('Failed to save diary entry');
      }
      
      console.log('[Diary API] General entry saved via updateOne, modifiedCount:', updateResult.modifiedCount);
      console.log('[Diary API] Entry subject sent:', subject);
      
      // Fetch the updated user to get the new entry - use lean() to get plain object
      const updatedUser = await User.findById(user._id).select('diaryEntries').lean();
      if (!updatedUser) {
        throw new Error('Failed to fetch updated user');
      }
      
      const diaryEntries = (updatedUser as any).diaryEntries || [];
      const lastEntry = diaryEntries[diaryEntries.length - 1];
      console.log('[Diary API] Retrieved entry from DB:', {
        _id: lastEntry?._id,
        subject: lastEntry?.subject,
        hasSubject: 'subject' in (lastEntry || {}),
        allFields: Object.keys(lastEntry || {}),
      });
      
      // Ensure _id is properly formatted
      const entryResponse = {
        ...lastEntry,
        _id: lastEntry?._id?.toString() || lastEntry?._id,
        id: lastEntry?._id?.toString() || lastEntry?._id || lastEntry?.id,
        subject: lastEntry?.subject || null, // Explicitly include subject
      };
      
      console.log('[Diary API] Entry response being sent:', {
        id: entryResponse.id,
        subject: entryResponse.subject,
      });
      
      return NextResponse.json({
        message: 'Diary entry created',
        entry: entryResponse,
      });
    } else {
      // For book entries, check if entry already exists for this book
      const existingIndex = user.diaryEntries.findIndex(
        (entry: any) => entry.bookId && entry.bookId.toString() === bookMongoId
      );

      if (existingIndex !== -1) {
        // Update existing entry
        const existingEntry = user.diaryEntries[existingIndex];
        existingEntry.content = content;
        existingEntry.updatedAt = new Date();
        // Mark the subdocument as modified (if it's a Mongoose document)
        if (existingEntry && typeof (existingEntry as any).markModified === 'function') {
          (existingEntry as any).markModified('content');
          (existingEntry as any).markModified('updatedAt');
        }
        wasUpdated = true;
      } else {
        // Create new entry
        if (!bookMongoId) {
          return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
        }
        user.diaryEntries.push({
          bookId: new mongoose.Types.ObjectId(bookMongoId),
          bookTitle,
          bookAuthor,
          bookCover,
          content,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    
    // Mark the diaryEntries array as modified so Mongoose saves it
    user.markModified('diaryEntries');

    console.log('[Diary API] Saving user document...');
    console.log('[Diary API] Diary entries before save:', user.diaryEntries.length);
    console.log('[Diary API] User document modified fields:', user.modifiedPaths());
    console.log('[Diary API] Mongoose connection state:', mongoose.connection.readyState);
    console.log('[Diary API] Is general entry:', isGeneralEntry);

    try {
      const saveResult = await user.save({ validateBeforeSave: true });
      console.log('[Diary API] Save operation completed');
      console.log('[Diary API] Save result acknowledged:', !!saveResult);
    } catch (saveError: any) {
      console.error('[Diary API] Save error:', saveError);
      console.error('[Diary API] Save error details:', {
        name: saveError.name,
        message: saveError.message,
        errors: saveError.errors,
      });
      
      // Handle Mongoose validation errors
      if (saveError.name === 'ValidationError' && saveError.errors) {
        const validationErrors: Record<string, string> = {};
        Object.keys(saveError.errors).forEach((key) => {
          validationErrors[key] = saveError.errors[key].message;
        });
        return NextResponse.json(
          { 
            error: 'Validation error', 
            details: saveError.message,
            validationErrors 
          },
          { status: 400 }
        );
      }
      
      // Handle other Mongoose errors
      return NextResponse.json(
        { 
          error: 'Failed to save diary entry', 
          details: saveError.message || 'Unknown error',
          errorName: saveError.name 
        },
        { status: 500 }
      );
    }

    // Verify the save by fetching the user again
    const verifyUserId = user._id?.toString();
    const savedUser = verifyUserId ? await User.findById(verifyUserId).select('diaryEntries').lean() : null;
    console.log('[Diary API] Diary entries after save (verification):', savedUser?.diaryEntries?.length || 0);

    if ((savedUser?.diaryEntries?.length || 0) === user.diaryEntries.length) {
      console.log('[Diary API] ✅ Verification PASSED - entry was saved');
    } else {
      console.error('[Diary API] ❌ Verification FAILED - entry was NOT saved!');
      console.error('[Diary API] Expected:', user.diaryEntries.length, 'Got:', savedUser?.diaryEntries?.length || 0);
    }

    const lastEntry = user.diaryEntries[user.diaryEntries.length - 1];
    const message = wasUpdated ? 'Diary entry updated' : 'Diary entry created';
    return NextResponse.json({
      message,
      entry: lastEntry,
    });
  } catch (error: any) {
    console.error('[Diary API] Error saving diary entry:', error);
    console.error('[Diary API] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500),
      errors: error.errors,
    });
    
    // If this is already a NextResponse (from saveError handler), return it
    if (error instanceof Response) {
      return error;
    }
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors: Record<string, string> = {};
      Object.keys(error.errors).forEach((key) => {
        validationErrors[key] = error.errors[key].message;
      });
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.message || 'Unknown validation error',
          validationErrors 
        },
        { status: 400 }
      );
    }
    
    // Handle other errors
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to save diary entry', 
        details: errorMessage,
        errorName: error?.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[username]/diary
 * Delete a diary entry
 * Body: { bookId: string }
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();
    const { username } = await context.params;
    const body = await request.json();
    const { bookId } = body;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = body;

    if (!bookId && !entryId) {
      return NextResponse.json(
        { error: 'Either bookId (for book entries) or entryId (for general entries) is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deleteUserId = user._id?.toString();
    if (!deleteUserId || deleteUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Initialize diaryEntries if it doesn't exist
    if (!user.diaryEntries) {
      user.diaryEntries = [];
    }

    let entryRemoved = false;
    const initialLength = user.diaryEntries.length;

    // Remove entry by bookId (for book entries) or entryId (for general entries)
    if (bookId) {
      // Delete by bookId for book entries
      user.diaryEntries = user.diaryEntries.filter(
        (entry: any) => !entry.bookId || entry.bookId.toString() !== bookId
      );
      entryRemoved = user.diaryEntries.length < initialLength;
      console.log('[Diary API] DELETE by bookId:', { bookId, initialLength, finalLength: user.diaryEntries.length, entryRemoved });
    } else if (entryId) {
      // Delete by entryId for general entries (or any entry by _id)
      user.diaryEntries = user.diaryEntries.filter(
        (entry: any) => {
          if (!entry._id) return true; // Keep entries without _id (shouldn't happen)
          const entryIdStr = entry._id.toString();
          return entryIdStr !== entryId;
        }
      );
      entryRemoved = user.diaryEntries.length < initialLength;
      console.log('[Diary API] DELETE by entryId:', { entryId, initialLength, finalLength: user.diaryEntries.length, entryRemoved });
    }

    if (!entryRemoved) {
      return NextResponse.json(
        { error: 'Diary entry not found' },
        { status: 404 }
      );
    }

    // Use direct MongoDB update to avoid validation errors
    const updateResult = await User.updateOne(
      { _id: user._id },
      { $set: { diaryEntries: user.diaryEntries } }
    );

    if (!updateResult.acknowledged) {
      throw new Error('Failed to update user after deletion');
    }

    console.log('[Diary API] Diary entry deleted successfully, modifiedCount:', updateResult.modifiedCount);

    return NextResponse.json({
      message: 'Diary entry deleted',
    });
  } catch (error: any) {
    console.error('Error deleting diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete diary entry', details: error.message },
      { status: 500 }
    );
  }
}

