import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";

/**
 * Search for books using Google Books API with database caching
 *
 * Query Parameters:
 * - q: Search query (required)
 * - maxResults: Number of results (default: 10, max: 40)
 * - startIndex: Pagination offset (default: 0)
 *
 * Example: /api/books/search?q=harry+potter&maxResults=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const maxResults = Math.min(
      parseInt(searchParams.get("maxResults") || "10"),
      40
    );
    const startIndex = parseInt(searchParams.get("startIndex") || "0");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // First, try to find books in our database using text search
    const cachedBooks = await Book.find(
      {
        $text: { $search: query },
      },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(maxResults)
      .skip(startIndex);

    // If we have enough cached results, return them
    if (cachedBooks.length >= maxResults) {
      // Update last accessed for cached books
      await Promise.all(
        cachedBooks.map((book) => {
          book.lastAccessed = new Date();
          book.usageCount += 1;
          return book.save();
        })
      );

      return NextResponse.json({
        kind: "books#volumes",
        totalItems: cachedBooks.length,
        items: cachedBooks.map((book) => ({
          id: book.googleBooksId,
          volumeInfo: book.volumeInfo,
          saleInfo: book.saleInfo,
          fromCache: true,
        })),
      });
    }

    // If not enough cached results, fetch from Google Books API
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Books API key not configured" },
        { status: 500 }
      );
    }

    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}&startIndex=${startIndex}&key=${apiKey}`;

    const response = await fetch(googleBooksUrl);

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the results in our database
    if (data.items && data.items.length > 0) {
      await Promise.all(
        data.items.map(async (item: any) => {
          try {
            await Book.findOrCreateFromGoogleBooks(item);
          } catch (error) {
            console.error(`Failed to cache book ${item.id}:`, error);
          }
        })
      );
    }

    return NextResponse.json({
      ...data,
      fromCache: false,
    });
  } catch (error) {
    console.error("Book search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search books",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
