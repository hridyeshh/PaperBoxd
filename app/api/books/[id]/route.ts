import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";

/**
 * Get a specific book by Google Books ID with database caching
 *
 * Example: /api/books/abc123
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // First, try to find the book in our database
    let book = await Book.findOne({ googleBooksId: id });

    if (book) {
      // Update access statistics
      book.usageCount += 1;
      book.lastAccessed = new Date();

      // Check if cache is stale (older than 30 days)
      if (book.isCacheStale()) {
        // Fetch fresh data from Google Books API
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        if (apiKey) {
          try {
            const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`;
            const response = await fetch(googleBooksUrl);

            if (response.ok) {
              const data = await response.json();
              book.volumeInfo = data.volumeInfo;
              book.saleInfo = data.saleInfo;
              book.lastUpdated = new Date();
            }
          } catch (error) {
            console.error("Failed to update stale cache:", error);
          }
        }
      }

      await book.save();

      return NextResponse.json({
        id: book.googleBooksId,
        volumeInfo: book.volumeInfo,
        saleInfo: book.saleInfo,
        paperboxdStats: {
          rating: book.paperboxdRating,
          ratingsCount: book.paperboxdRatingsCount,
          totalReads: book.totalReads,
          totalLikes: book.totalLikes,
          totalTBR: book.totalTBR,
        },
        fromCache: true,
      });
    }

    // If not in database, fetch from Google Books API
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Books API key not configured" },
        { status: 500 }
      );
    }

    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`;
    const response = await fetch(googleBooksUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }
      throw new Error(`Google Books API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the book in our database
    const createdBook = await Book.findOrCreateFromGoogleBooks(data);

    return NextResponse.json({
      ...data,
      paperboxdStats: {
        rating: createdBook.paperboxdRating,
        ratingsCount: createdBook.paperboxdRatingsCount,
        totalReads: createdBook.totalReads,
        totalLikes: createdBook.totalLikes,
        totalTBR: createdBook.totalTBR,
      },
      fromCache: false,
    });
  } catch (error) {
    console.error("Book fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch book",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
