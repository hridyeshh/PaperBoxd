import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import { slugToTitle, normalizeTitle } from "@/lib/utils/book-slug";

/**
 * Get a book by title slug
 * 
 * Example: /api/books/by-slug/harry+potter+and+the+philosophers+stone
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { error: "Book slug is required" },
        { status: 400 }
      );
    }

    // Convert slug to title and normalize for search
    const searchTitle = slugToTitle(slug);
    const normalizedTitle = normalizeTitle(searchTitle);

    // Connect to database
    await connectDB();

    // Try to find book by normalized title (case-insensitive, ignoring special chars)
    // First, try exact match with normalized title
    let book = await Book.findOne({
      "volumeInfo.title": { 
        $regex: new RegExp(`^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")
      }
    });

    // If no exact match, try partial match
    if (!book) {
      book = await Book.findOne({
        "volumeInfo.title": { 
          $regex: new RegExp(normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i")
        }
      });
    }

    // If found in database, return it
    if (book) {
      // Update access statistics
      book.usageCount += 1;
      book.lastAccessed = new Date();
      
      // Check if cache is stale
      if (book.isCacheStale()) {
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        if (apiKey && book.googleBooksId) {
          try {
            const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes/${book.googleBooksId}?key=${apiKey}`;
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
        id: book.googleBooksId || book.openLibraryId,
        _id: book._id.toString(),
        bookId: book._id.toString(),
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

    // If not in database, try Google Books API search
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Books API key not configured" },
        { status: 500 }
      );
    }

    // Search Google Books API by title
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:"${encodeURIComponent(searchTitle)}"&maxResults=1&key=${apiKey}`;
    const response = await fetch(googleBooksUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch book from Google Books API" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      );
    }

    // Cache the book in our database
    const googleBookData = data.items[0];
    const createdBook = await Book.findOrCreateFromGoogleBooks(googleBookData);

    return NextResponse.json({
      ...googleBookData,
      _id: createdBook._id.toString(),
      bookId: createdBook._id.toString(),
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
    console.error("Book fetch by slug error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch book",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

