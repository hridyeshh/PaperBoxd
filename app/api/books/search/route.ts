import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import {
  searchOpenLibraryWithFallback,
  transformOpenLibraryBook,
} from "@/lib/api/open-library";

/**
 * Search for books using Open Library API (primary) with Google Books API fallback
 *
 * Search Strategy:
 * 1. Check database cache first
 * 2. Try Open Library API
 * 3. Fallback to Google Books API if Open Library fails or returns no results
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
    // If text index doesn't exist, this will fail gracefully and fall back to Google Books API
    let cachedBooks: any[] = [];
    try {
      cachedBooks = await Book.find(
        {
          $text: { $search: query },
        },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(maxResults)
        .skip(startIndex)
        .exec();
    } catch (textSearchError) {
      // Text index might not exist - that's okay, we'll use Google Books API
      console.log("Text search not available (index may not exist), using Google Books API:", textSearchError instanceof Error ? textSearchError.message : "Unknown error");
    }

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
          id: book.googleBooksId || book.openLibraryId,
          volumeInfo: book.volumeInfo,
          saleInfo: book.saleInfo,
          apiSource: book.apiSource,
          fromCache: true,
        })),
      });
    }

    // Step 2: Try Open Library API first
    console.log(`[Search] Trying Open Library for query: "${query}"`);
    const openLibraryResult = await searchOpenLibraryWithFallback(
      query,
      maxResults,
      startIndex
    );

    if (openLibraryResult.success && openLibraryResult.data) {
      const transformedBooks = openLibraryResult.data.docs.map(transformOpenLibraryBook);

      // Cache the results in our database
      await Promise.all(
        transformedBooks.map(async (book: any) => {
          try {
            await Book.findOrCreateFromOpenLibrary(book);
          } catch (error) {
            console.error(`Failed to cache Open Library book ${book.openLibraryId}:`, error);
          }
        })
      );

      console.log(`[Search] Open Library returned ${transformedBooks.length} results`);

      return NextResponse.json({
        kind: "books#volumes",
        totalItems: openLibraryResult.data.numFound,
        items: transformedBooks.map((book: any) => ({
          id: book.openLibraryId,
          volumeInfo: book.volumeInfo,
          apiSource: "open_library",
          fromCache: false,
        })),
      });
    }

    // Step 3: Fallback to Google Books API
    console.log(`[Search] Open Library failed or returned no results. Falling back to Google Books API`);

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Books API key not configured and Open Library search failed" },
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

    console.log(`[Search] Google Books returned ${data.items?.length || 0} results`);

    return NextResponse.json({
      ...data,
      apiSource: "google_books",
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
