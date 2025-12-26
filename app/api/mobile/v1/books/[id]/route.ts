import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import {
  getBookByISBN,
  transformISBNdbBook,
} from "@/lib/api/isbndb";
import {
  getOpenLibraryWork,
  transformOpenLibraryBook,
} from "@/lib/api/open-library";
import { getBestBookCover } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Mobile API: Get book details by ID
 * 
 * GET /api/mobile/v1/books/[id]
 * 
 * Supports:
 * - MongoDB ObjectId (24 hex chars)
 * - ISBNdb ID
 * - Open Library ID
 * - ISBN-10 or ISBN-13
 * 
 * Returns: Simplified book data optimized for iOS (no nested volumeInfo)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { id } = await context.params;

    console.log("=".repeat(80));
    console.log(`[Mobile Book Detail API] [${requestId}] === REQUEST START ===`);
    console.log(`[Mobile Book Detail API] [${requestId}] Book ID: ${id}`);
    console.log(`[Mobile Book Detail API] [${requestId}] Timestamp: ${new Date().toISOString()}`);

    if (!id) {
      console.log(`[Mobile Book Detail API] [${requestId}] ❌ ERROR: Book ID is required`);
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    // Connect to database
    console.log(`[Mobile Book Detail API] [${requestId}] Connecting to database...`);
    const dbStartTime = Date.now();
    await connectDB();
    console.log(`[Mobile Book Detail API] [${requestId}] ✅ Database connected (${Date.now() - dbStartTime}ms)`);

    // First, try to find the book in our database by any ID type
    const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    console.log(`[Mobile Book Detail API] [${requestId}] Searching database (isMongoObjectId: ${isMongoObjectId})...`);
    const queryStartTime = Date.now();
    const book = await Book.findOne(
      isMongoObjectId
        ? { _id: id }
        : {
            $or: [
              { isbndbId: id },
              { openLibraryId: id },
              { isbn: id },
              { isbn13: id },
            ],
          }
    );
    console.log(`[Mobile Book Detail API] [${requestId}] Database query completed (${Date.now() - queryStartTime}ms)`);

    if (book) {
      // Update access statistics (non-blocking)
      book.usageCount += 1;
      book.lastAccessed = new Date();
      book.save().catch((saveError) => {
        console.warn(`[Mobile Book Detail API] [${requestId}] ⚠️ Failed to save book stats:`, saveError);
      });

      const apiSource = book.apiSource || (book.isbndbId ? "isbndb" : "open_library");
      console.log(`[Mobile Book Detail API] [${requestId}] ✅ Book found in database (Source: ${apiSource})`);

      // Check if cache is stale (older than 30 days) - update in background
      if (book.isCacheStale()) {
        console.log(`[Mobile Book Detail API] [${requestId}] Cache is stale, updating in background...`);
        // Update cache asynchronously (don't block the response)
        Promise.resolve().then(async () => {
          try {
            if (book.isbndbId) {
              const isbndbBook = await getBookByISBN(book.isbndbId);
              const transformedData = transformISBNdbBook(isbndbBook);
              book.volumeInfo = transformedData.volumeInfo;
              book.lastUpdated = new Date();
              await book.save();
            } else if (book.openLibraryId) {
              const workData = await getOpenLibraryWork(book.openLibraryId);
              type OpenLibraryAuthor = { name?: string } | string;
              const firstPublishYear = workData.first_publish_year 
                ? (typeof workData.first_publish_year === 'number' ? workData.first_publish_year : undefined)
                : (workData.first_publish_date ? parseInt(workData.first_publish_date.split('-')[0], 10) : undefined);
              const transformedData = transformOpenLibraryBook({
                key: workData.key || book.openLibraryId,
                title: workData.title || "",
                author_name: workData.authors?.map((a: OpenLibraryAuthor) => typeof a === 'object' ? (a.name || '') : a).filter((name: string) => name) || [],
                cover_i: undefined,
                first_publish_year: firstPublishYear,
                isbn: workData.isbn || [],
                publisher: (workData.publishers as string[] | undefined) || [],
                subject: workData.subject || [],
                ratings_average: (workData.ratings_average as number | undefined),
                ratings_count: (workData.ratings_count as number | undefined),
              });
              book.volumeInfo = {
                ...transformedData.volumeInfo,
                imageLinks: transformedData.volumeInfo.imageLinks ? {
                  smallThumbnail: transformedData.volumeInfo.imageLinks.smallThumbnail ?? undefined,
                  thumbnail: transformedData.volumeInfo.imageLinks.thumbnail ?? undefined,
                  small: transformedData.volumeInfo.imageLinks.small ?? undefined,
                  medium: transformedData.volumeInfo.imageLinks.medium ?? undefined,
                  large: transformedData.volumeInfo.imageLinks.large ?? undefined,
                  extraLarge: transformedData.volumeInfo.imageLinks.extraLarge ?? undefined,
                } : undefined,
              };
              book.lastUpdated = new Date();
              await book.save();
            }
          } catch (error) {
            console.error(`[Mobile Book Detail API] [${requestId}] Background cache update failed:`, error);
          }
        });
      }

      // Transform to iOS-friendly format (flat structure, not nested volumeInfo)
      const imageLinks = book.volumeInfo?.imageLinks || {};
      const cover = getBestBookCover(imageLinks) || 
                   "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";

      const responseData = {
        id: book.isbndbId || book.openLibraryId || book.isbn13 || book.isbn || (book._id as { toString(): string }).toString(),
        _id: (book._id as { toString(): string }).toString(),
        bookId: (book._id as { toString(): string }).toString(),
        title: book.volumeInfo?.title || "Untitled",
        author: book.volumeInfo?.authors?.[0] || "Unknown Author",
        authors: book.volumeInfo?.authors || [],
        cover: cover,
        description: book.volumeInfo?.description || "",
        publishedDate: book.volumeInfo?.publishedDate || "",
        isbn: book.isbn,
        isbn13: book.isbn13,
        openLibraryId: book.openLibraryId,
        isbndbId: book.isbndbId,
        averageRating: book.volumeInfo?.averageRating,
        ratingsCount: book.volumeInfo?.ratingsCount,
        pageCount: book.volumeInfo?.pageCount,
        categories: book.volumeInfo?.categories || [],
        publisher: book.volumeInfo?.publisher,
        // Paperboxd stats
        paperboxdStats: {
          rating: book.paperboxdRating,
          ratingsCount: book.paperboxdRatingsCount,
          totalReads: book.totalReads,
          totalLikes: book.totalLikes,
          totalTBR: book.totalTBR,
        },
        fromCache: true,
        apiSource: apiSource,
      };

      const totalTime = Date.now() - startTime;
      console.log(`[Mobile Book Detail API] [${requestId}] ✅ SUCCESS: Returning book (total time: ${totalTime}ms)`);
      console.log(`[Mobile Book Detail API] [${requestId}] Book: ${responseData.title} by ${responseData.author}`);
      console.log(`[Mobile Book Detail API] [${requestId}] === REQUEST END ===`);
      console.log("=".repeat(80));

      return NextResponse.json(responseData);
    }

    // Book not found in database - try external APIs
    console.log(`[Mobile Book Detail API] [${requestId}] 📚 Book not found in database, trying external APIs...`);

    // Try ISBNdb API first (if ID looks like an ISBN)
    const isISBN = /^(\d{10}|\d{13})$/.test(id);
    
    if (isISBN) {
      console.log(`[Mobile Book Detail API] [${requestId}] 🔍 Attempting ISBNdb API for ISBN: "${id}"`);
      try {
        const isbndbBook = await getBookByISBN(id);
        const transformedData = transformISBNdbBook(isbndbBook);
        const createdBook = await Book.findOrCreateFromISBNdb(transformedData);
        
        console.log(`[Mobile Book Detail API] [${requestId}] ✅ Book found via ISBNdb API`);

        const imageLinks = createdBook.volumeInfo?.imageLinks || {};
        const cover = getBestBookCover(imageLinks) || 
                     "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";

        const responseData = {
          id: createdBook.isbndbId || id,
          _id: (createdBook._id as { toString(): string }).toString(),
          bookId: (createdBook._id as { toString(): string }).toString(),
          title: createdBook.volumeInfo?.title || "Untitled",
          author: createdBook.volumeInfo?.authors?.[0] || "Unknown Author",
          authors: createdBook.volumeInfo?.authors || [],
          cover: cover,
          description: createdBook.volumeInfo?.description || "",
          publishedDate: createdBook.volumeInfo?.publishedDate || "",
          isbn: createdBook.isbn,
          isbn13: createdBook.isbn13,
          openLibraryId: createdBook.openLibraryId,
          isbndbId: createdBook.isbndbId,
          averageRating: createdBook.volumeInfo?.averageRating,
          ratingsCount: createdBook.volumeInfo?.ratingsCount,
          pageCount: createdBook.volumeInfo?.pageCount,
          categories: createdBook.volumeInfo?.categories || [],
          publisher: createdBook.volumeInfo?.publisher,
          paperboxdStats: {
            rating: createdBook.paperboxdRating,
            ratingsCount: createdBook.paperboxdRatingsCount,
            totalReads: createdBook.totalReads,
            totalLikes: createdBook.totalLikes,
            totalTBR: createdBook.totalTBR,
          },
          apiSource: "isbndb",
          fromCache: false,
        };

        const totalTime = Date.now() - startTime;
        console.log(`[Mobile Book Detail API] [${requestId}] ✅ SUCCESS: Returning book from ISBNdb (total time: ${totalTime}ms)`);
        console.log(`[Mobile Book Detail API] [${requestId}] === REQUEST END ===`);
        console.log("=".repeat(80));

        return NextResponse.json(responseData);
      } catch (error) {
        console.error(`[Mobile Book Detail API] [${requestId}] ❌ ISBNdb API failed:`, error);
      }
    }

    // Try Open Library API (if ID looks like Open Library ID)
    if (id.startsWith("OL") || id.startsWith("/works/")) {
      console.log(`[Mobile Book Detail API] [${requestId}] 🔍 Attempting Open Library API for ID: "${id}"`);
      try {
        const workData = await getOpenLibraryWork(id);
        type OpenLibraryAuthor = { name?: string } | string;
        const firstPublishYear = workData.first_publish_year 
          ? (typeof workData.first_publish_year === 'number' ? workData.first_publish_year : undefined)
          : (workData.first_publish_date ? parseInt(workData.first_publish_date.split('-')[0], 10) : undefined);
        const transformedData = transformOpenLibraryBook({
          key: workData.key || id,
          title: workData.title || "",
          author_name: workData.authors?.map((a: OpenLibraryAuthor) => typeof a === 'object' ? (a.name || '') : a).filter((name: string) => name) || [],
          cover_i: undefined,
          first_publish_year: firstPublishYear,
          isbn: workData.isbn || [],
          publisher: (workData.publishers as string[] | undefined) || [],
          subject: workData.subject || [],
          ratings_average: (workData.ratings_average as number | undefined),
          ratings_count: (workData.ratings_count as number | undefined),
        });
        const transformedDataWithFixedImageLinks = {
          ...transformedData,
          volumeInfo: {
            ...transformedData.volumeInfo,
            imageLinks: transformedData.volumeInfo.imageLinks ? {
              smallThumbnail: transformedData.volumeInfo.imageLinks.smallThumbnail ?? undefined,
              thumbnail: transformedData.volumeInfo.imageLinks.thumbnail ?? undefined,
              small: transformedData.volumeInfo.imageLinks.small ?? undefined,
              medium: transformedData.volumeInfo.imageLinks.medium ?? undefined,
              large: transformedData.volumeInfo.imageLinks.large ?? undefined,
              extraLarge: transformedData.volumeInfo.imageLinks.extraLarge ?? undefined,
            } : undefined,
          },
        };
        const createdBook = await Book.findOrCreateFromOpenLibrary(transformedDataWithFixedImageLinks as Parameters<typeof Book.findOrCreateFromOpenLibrary>[0]);
        
        console.log(`[Mobile Book Detail API] [${requestId}] ✅ Book found via Open Library API`);

        const imageLinks = createdBook.volumeInfo?.imageLinks || {};
        const cover = getBestBookCover(imageLinks) || 
                     "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";

        const responseData = {
          id: createdBook.openLibraryId || id,
          _id: (createdBook._id as { toString(): string }).toString(),
          bookId: (createdBook._id as { toString(): string }).toString(),
          title: createdBook.volumeInfo?.title || "Untitled",
          author: createdBook.volumeInfo?.authors?.[0] || "Unknown Author",
          authors: createdBook.volumeInfo?.authors || [],
          cover: cover,
          description: createdBook.volumeInfo?.description || "",
          publishedDate: createdBook.volumeInfo?.publishedDate || "",
          isbn: createdBook.isbn,
          isbn13: createdBook.isbn13,
          openLibraryId: createdBook.openLibraryId,
          isbndbId: createdBook.isbndbId,
          averageRating: createdBook.volumeInfo?.averageRating,
          ratingsCount: createdBook.volumeInfo?.ratingsCount,
          pageCount: createdBook.volumeInfo?.pageCount,
          categories: createdBook.volumeInfo?.categories || [],
          publisher: createdBook.volumeInfo?.publisher,
          paperboxdStats: {
            rating: createdBook.paperboxdRating,
            ratingsCount: createdBook.paperboxdRatingsCount,
            totalReads: createdBook.totalReads,
            totalLikes: createdBook.totalLikes,
            totalTBR: createdBook.totalTBR,
          },
          apiSource: "open_library",
          fromCache: false,
        };

        const totalTime = Date.now() - startTime;
        console.log(`[Mobile Book Detail API] [${requestId}] ✅ SUCCESS: Returning book from Open Library (total time: ${totalTime}ms)`);
        console.log(`[Mobile Book Detail API] [${requestId}] === REQUEST END ===`);
        console.log("=".repeat(80));

        return NextResponse.json(responseData);
      } catch (error) {
        console.error(`[Mobile Book Detail API] [${requestId}] ❌ Open Library API failed:`, error);
      }
    }

    // No results from any source
    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Book Detail API] [${requestId}] ❌ Book not found (total time: ${totalTime}ms)`);
    console.log(`[Mobile Book Detail API] [${requestId}] === REQUEST END (404) ===`);
    console.log("=".repeat(80));

    return NextResponse.json(
      { error: "Book not found" },
      { status: 404 }
    );
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Book Detail API] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Book Detail API] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Book Detail API] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Book Detail API] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      {
        error: "Failed to fetch book",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

