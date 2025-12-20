import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book";
import { getUserFromRequest } from "@/lib/auth-token";

export const dynamic = "force-dynamic";

/**
 * Get reading progress for a book
 * 
 * GET /api/users/[username]/reading-progress?bookId=...
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get("bookId");

    if (!username || !bookId) {
      return NextResponse.json(
        { error: "Username and bookId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ username }).select("readingProgress");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const progress = user.readingProgress?.find(
      (p) => p.bookId?.toString() === bookId
    );

    return NextResponse.json({
      pagesRead: progress?.pagesRead || 0,
    });
  } catch (error: unknown) {
    console.error("Get reading progress error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to get reading progress",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Update reading progress for a book
 * 
 * POST /api/users/[username]/reading-progress
 * Body: {
 *   bookId: string,
 *   pagesRead: number
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await context.params;
    const body = await request.json();
    const { bookId, pagesRead } = body;

    if (!username || !bookId || pagesRead === undefined) {
      return NextResponse.json(
        { error: "Username, bookId, and pagesRead are required" },
        { status: 400 }
      );
    }

    // Verify user can only update their own progress
    if (authUser.username !== username) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof pagesRead !== "number" || pagesRead < 0) {
      return NextResponse.json(
        { error: "pagesRead must be a non-negative number" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Get total pages from book
    const totalPages = book.volumeInfo?.pageCount || 0;

    // Clamp pagesRead to totalPages
    const clampedPagesRead = totalPages > 0
      ? Math.min(pagesRead, totalPages)
      : pagesRead;

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find existing progress or create new
    const bookIdObj = new mongoose.Types.ObjectId(bookId);
    const existingIndex = user.readingProgress?.findIndex(
      (p) => p.bookId?.toString() === bookId
    ) ?? -1;

    if (existingIndex >= 0) {
      // Update existing progress
      user.readingProgress[existingIndex].pagesRead = clampedPagesRead;
      user.readingProgress[existingIndex].updatedAt = new Date();
    } else {
      // Add new progress
      if (!user.readingProgress) {
        user.readingProgress = [];
      }
      user.readingProgress.push({
        bookId: bookIdObj,
        pagesRead: clampedPagesRead,
        updatedAt: new Date(),
      });
    }

    // If progress is complete (100%), optionally add to currentlyReading or bookshelf
    const isComplete = totalPages > 0 && clampedPagesRead >= totalPages;

    if (isComplete) {
      // Check if book is already in bookshelf
      const isInBookshelf = user.bookshelf?.some(
        (b) => b.bookId?.toString() === bookId
      );

      // If not in bookshelf, add to currentlyReading (user can manually add to bookshelf)
      if (!isInBookshelf) {
        const isInCurrentlyReading = user.currentlyReading?.some(
          (b) => b.bookId?.toString() === bookId
        );

        if (!isInCurrentlyReading) {
          // Add to currentlyReading with book reference
          const bookReference = {
            bookId: bookIdObj,
            isbndbId: book.isbndbId,
            openLibraryId: book.openLibraryId,
            title: book.volumeInfo?.title || "Unknown",
            author: book.volumeInfo?.authors?.[0] || "Unknown",
            cover: book.volumeInfo?.imageLinks?.thumbnail ||
              book.volumeInfo?.imageLinks?.smallThumbnail || "",
          };

          if (!user.currentlyReading) {
            user.currentlyReading = [];
          }
          user.currentlyReading.push(bookReference);
        }
      }
    } else if (clampedPagesRead > 0) {
      // If progress is set but not complete, add to DNF (TBR) if not already there
      const isInTbr = user.tbrBooks?.some(
        (b) => b.bookId?.toString() === bookId
      );

      if (!isInTbr) {
        // Add to TBR (DNF) with book reference
        const bookReference = {
          bookId: bookIdObj,
          isbndbId: book.isbndbId,
          openLibraryId: book.openLibraryId,
          title: book.volumeInfo?.title || "Unknown",
          author: book.volumeInfo?.authors?.[0] || "Unknown",
          cover: book.volumeInfo?.imageLinks?.thumbnail ||
            book.volumeInfo?.imageLinks?.smallThumbnail || "",
        };

        if (!user.tbrBooks) {
          user.tbrBooks = [];
        }
        user.tbrBooks.push({
          ...bookReference,
          addedOn: new Date(),
        });
      }
    } else if (clampedPagesRead === 0) {
      // If progress is reset to 0, remove from DNF (TBR) if it's there
      if (user.tbrBooks && user.tbrBooks.length > 0) {
        const tbrIndex = user.tbrBooks.findIndex(
          (b) => b.bookId?.toString() === bookId
        );

        if (tbrIndex >= 0) {
          user.tbrBooks.splice(tbrIndex, 1);
        }
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      pagesRead: clampedPagesRead,
      totalPages,
      isComplete,
    });
  } catch (error: unknown) {
    console.error("Update reading progress error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to update reading progress",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

