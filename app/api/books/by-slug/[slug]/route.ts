import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import { slugToTitle, normalizeTitle, parseBookSlug } from "@/lib/utils/book-slug";
import {
  searchISBNdbWithFallback,
  getBookByISBN,
  transformISBNdbBook,
} from "@/lib/api/isbndb";
import {
  searchOpenLibraryWithFallback,
  transformOpenLibraryBook,
} from "@/lib/api/open-library";

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

    // Parse slug to extract title and unique ID (if present)
    const { titleSlug, uniqueId } = parseBookSlug(slug);
    const searchTitle = decodeURIComponent(titleSlug.replace(/\+/g, ' '));
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
    
    // If still not found and we have a unique ID, try to match by checking if any ID ends with the unique hex
    // This helps find books even when the title doesn't match exactly
    if (!book && uniqueId) {
      // Search in database for books where ISBN or ID ends with the unique hex
      // Note: This is a fallback, not perfect but helps with some edge cases
      const allBooks = await Book.find({
        $or: [
          { "volumeInfo.title": { $regex: new RegExp(normalizedTitle.split(' ').filter(w => w.length > 2).join('|'), "i") } },
        ]
      })
        .limit(50) // Limit to prevent too many results
        .lean();
      
      // Filter books where the ID ends with our unique hex
      const matchingBook = allBooks.find((b: any) => {
        const bookId = (b.isbndbId || b.openLibraryId || '').toString();
        if (!bookId) return false;
        // Check if the last part of the ID matches our unique hex
        const last8 = bookId.slice(-8);
        const num = parseInt(last8.replace(/\D/g, ''), 10) || 0;
        const hexId = num.toString(16).padStart(6, '0');
        return hexId.toLowerCase() === uniqueId.toLowerCase();
      });
      
      if (matchingBook) {
        book = await Book.findById(matchingBook._id);
      }
    }

    // If found in database, return it
    if (book) {
      // Update access statistics
      book.usageCount += 1;
      book.lastAccessed = new Date();
      
      // Check if cache is stale
      if (book.isCacheStale()) {
        // Try ISBNdb first
        if (book.isbndbId) {
          try {
            const isbndbBook = await getBookByISBN(book.isbndbId);
            const transformedData = transformISBNdbBook(isbndbBook);
            book.volumeInfo = transformedData.volumeInfo;
            book.lastUpdated = new Date();
          } catch (error) {
            console.error("Failed to update stale cache from ISBNdb:", error);
          }
        } else if (book.openLibraryId) {
          // Fallback to Open Library if no ISBNdb ID
          try {
            const workData = await getOpenLibraryWork(book.openLibraryId);
            const transformedData = transformOpenLibraryBook({
              key: workData.key || book.openLibraryId,
              title: workData.title || "",
              author_name: workData.authors?.map((a: any) => a.name) || [],
              cover_i: undefined,
              first_publish_year: workData.first_publish_year,
              isbn: workData.isbn || [],
              publisher: workData.publishers || [],
              subject: workData.subjects || [],
              ratings_average: workData.ratings_average,
              ratings_count: workData.ratings_count,
            });
            book.volumeInfo = transformedData.volumeInfo;
            book.lastUpdated = new Date();
          } catch (error) {
            console.error("Failed to update stale cache from Open Library:", error);
          }
        }
      }

      await book.save();
      
      const apiSource = book.apiSource || (book.isbndbId ? "isbndb" : "open_library");
      console.log(`[Book by Slug] ✅ Found in database (Slug: "${slug}", Title: "${book.volumeInfo?.title || 'N/A'}", Source: ${apiSource})`);

      return NextResponse.json({
        id: book.isbndbId || book.openLibraryId,
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

    // If not in database, try ISBNdb API first
    console.log(`[Book by Slug] 📚 Book not found in database. 🔍 Attempting ISBNdb API for title: "${searchTitle}"`);
    const isbndbResult = await searchISBNdbWithFallback(searchTitle, 1, 1);

    if (isbndbResult.success && isbndbResult.data && isbndbResult.data.books.length > 0) {
      const isbndbBook = isbndbResult.data.books[0];
      const transformedData = transformISBNdbBook(isbndbBook);
      
      // Cache the book in our database
      const createdBook = await Book.findOrCreateFromISBNdb(transformedData);
      
      console.log(`[Book by Slug] ✅ SUCCESS: Book found via ISBNdb API (Slug: "${slug}", Title: "${createdBook.volumeInfo?.title || 'N/A'}")`);

      return NextResponse.json({
        id: createdBook.isbndbId,
        _id: createdBook._id.toString(),
        bookId: createdBook._id.toString(),
        volumeInfo: createdBook.volumeInfo,
        paperboxdStats: {
          rating: createdBook.paperboxdRating,
          ratingsCount: createdBook.paperboxdRatingsCount,
          totalReads: createdBook.totalReads,
          totalLikes: createdBook.totalLikes,
          totalTBR: createdBook.totalTBR,
        },
        apiSource: "isbndb",
        fromCache: false,
      });
    }

    // Fallback to Open Library API
    console.log(`[Book by Slug] ❌ ISBNdb failed. 🔍 Attempting Open Library API for title: "${searchTitle}"`);
    const openLibraryResult = await searchOpenLibraryWithFallback(searchTitle, 1, 0);

    if (openLibraryResult.success && openLibraryResult.data && openLibraryResult.data.docs.length > 0) {
      const transformedData = transformOpenLibraryBook(openLibraryResult.data.docs[0]);
      const createdBook = await Book.findOrCreateFromOpenLibrary(transformedData);
      
      console.log(`[Book by Slug] ✅ SUCCESS: Book found via Open Library API (Slug: "${slug}", Title: "${createdBook.volumeInfo?.title || 'N/A'}")`);

      return NextResponse.json({
        id: createdBook.openLibraryId,
        _id: createdBook._id.toString(),
        bookId: createdBook._id.toString(),
        volumeInfo: createdBook.volumeInfo,
        paperboxdStats: {
          rating: createdBook.paperboxdRating,
          ratingsCount: createdBook.paperboxdRatingsCount,
          totalReads: createdBook.totalReads,
          totalLikes: createdBook.totalLikes,
          totalTBR: createdBook.totalTBR,
        },
        apiSource: "open_library",
        fromCache: false,
      });
    }

    // No results from ISBNdb or Open Library
    console.log(`[Book by Slug] ❌ Book not found in ISBNdb or Open Library APIs (Slug: "${slug}", Title: "${searchTitle}")`);
    return NextResponse.json(
      { error: "Book not found in ISBNdb or Open Library APIs" },
      { status: 404 }
    );
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

