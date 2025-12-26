import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import { getBestBookCover } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Mobile API: Get latest books (Public)
 * 
 * GET /api/mobile/v1/books/latest?page=1&pageSize=50
 * 
 * Returns: { books: Book[], pagination: { page, pageSize, total, totalPages } }
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log("=".repeat(80));
    console.log(`[Mobile Latest Books API] [${requestId}] === REQUEST START ===`);
    console.log(`[Mobile Latest Books API] [${requestId}] Path: ${req.nextUrl.pathname}`);
    console.log(`[Mobile Latest Books API] [${requestId}] Method: ${req.method}`);
    console.log(`[Mobile Latest Books API] [${requestId}] URL: ${req.url}`);
    console.log(`[Mobile Latest Books API] [${requestId}] Timestamp: ${new Date().toISOString()}`);
    
    // Log headers (especially Authorization if present)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    console.log(`[Mobile Latest Books API] [${requestId}] Authorization header present: ${!!authHeader}`);
    if (authHeader) {
      console.log(`[Mobile Latest Books API] [${requestId}] Authorization header (first 30 chars): ${authHeader.substring(0, 30)}...`);
    }
    
    console.log(`[Mobile Latest Books API] [${requestId}] Connecting to database...`);
    const dbStartTime = Date.now();
    await connectDB();
    console.log(`[Mobile Latest Books API] [${requestId}] ✅ Database connected (${Date.now() - dbStartTime}ms)`);
    
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "50")), 200);
    const skip = (page - 1) * pageSize;

    console.log(`[Mobile Latest Books API] [${requestId}] Query params:`, { page, pageSize, skip });

    // Fetch latest books with minimal projection for mobile speed
    // Sort by publishedDate (descending), then by createdAt (descending)
    console.log(`[Mobile Latest Books API] [${requestId}] Fetching books from database...`);
    const queryStartTime = Date.now();
    const books = await Book.find({})
      .sort({
        "volumeInfo.publishedDate": -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(pageSize)
      .lean();
    console.log(`[Mobile Latest Books API] [${requestId}] Books query completed (${Date.now() - queryStartTime}ms), found ${books.length} books`);

    // Get total count for pagination
    console.log(`[Mobile Latest Books API] [${requestId}] Counting total books...`);
    const countStartTime = Date.now();
    const total = await Book.countDocuments({});
    console.log(`[Mobile Latest Books API] [${requestId}] Total count: ${total} (${Date.now() - countStartTime}ms)`);

    // Transform books to match iOS Book model format
    type BookLean = {
      _id?: { toString(): string };
      isbn?: string;
      isbn13?: string;
      openLibraryId?: string;
      isbndbId?: string;
      volumeInfo?: {
        title?: string;
        authors?: string[];
        description?: string;
        publishedDate?: string;
        averageRating?: number;
        ratingsCount?: number;
        pageCount?: number;
        categories?: string[];
        publisher?: string;
        imageLinks?: {
          large?: string;
          medium?: string;
          thumbnail?: string;
          smallThumbnail?: string;
          extraLarge?: string;
        };
      };
    };

    console.log(`[Mobile Latest Books API] [${requestId}] Transforming ${books.length} books...`);
    const transformStartTime = Date.now();
    const transformedBooks = books.map((book: BookLean) => {
      // Determine the best cover image to use
      const imageLinks = book.volumeInfo?.imageLinks || {};
      const cover = getBestBookCover(imageLinks) || 
                  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";

      // Get book ID for navigation
      const bookId = book._id?.toString() || 
                     book.isbn13 || 
                     book.isbn || 
                     book.openLibraryId || 
                     book.isbndbId || 
                     "unknown";

      return {
        id: bookId,
        _id: book._id?.toString(),
        title: book.volumeInfo?.title || "Untitled",
        authors: book.volumeInfo?.authors || [],
        description: book.volumeInfo?.description || "",
        publishedDate: book.volumeInfo?.publishedDate || "",
        cover,
        isbn: book.isbn,
        isbn13: book.isbn13,
        openLibraryId: book.openLibraryId,
        isbndbId: book.isbndbId,
        averageRating: book.volumeInfo?.averageRating,
        ratingsCount: book.volumeInfo?.ratingsCount,
        pageCount: book.volumeInfo?.pageCount,
        categories: book.volumeInfo?.categories || [],
        publisher: book.volumeInfo?.publisher,
      };
    });
    console.log(`[Mobile Latest Books API] [${requestId}] Transformation completed (${Date.now() - transformStartTime}ms)`);

    const responseData = {
      books: transformedBooks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Latest Books API] [${requestId}] ✅ SUCCESS: Returning ${transformedBooks.length} books (total time: ${totalTime}ms)`);
    console.log(`[Mobile Latest Books API] [${requestId}] Pagination: page ${page}/${Math.ceil(total / pageSize)}`);
    console.log(`[Mobile Latest Books API] [${requestId}] === REQUEST END ===`);
    console.log("=".repeat(80));

    return NextResponse.json(responseData);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Latest Books API] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Latest Books API] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Latest Books API] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Latest Books API] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      { error: "Failed to fetch feed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

