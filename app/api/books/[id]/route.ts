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

/**
 * Get a specific book by ID (ISBNdb ID or Open Library ID) with database caching
 *
 * Example: /api/books/9780747532699 (ISBN-13)
 * Example: /api/books/OL45804W (Open Library ID)
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

    // First, try to find the book in our database by any ID type
    // Check if it's a MongoDB ObjectId (24 hex characters)
    const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    const book = await Book.findOne(
      isMongoObjectId
        ? { _id: id } // Search by MongoDB ObjectId
        : {
            $or: [
              { isbndbId: id },
              { openLibraryId: id },
              { isbn: id },
              { isbn13: id },
            ],
          }
    );

    if (book) {
      // Update access statistics
      book.usageCount += 1;
      book.lastAccessed = new Date();
      
      const apiSource = book.apiSource || (book.isbndbId ? "isbndb" : "open_library");
      console.log(`[Book by ID] ✅ Found in database (ID: "${id}", Source: ${apiSource})`);

      // Check if cache is stale (older than 30 days)
      if (book.isCacheStale()) {
        console.log(`[Book by ID] Cache is stale, updating from ${apiSource}...`);
        // Try ISBNdb first
        if (book.isbndbId) {
          try {
            console.log(`[Book by ID] 🔄 Updating stale cache from ISBNdb (ISBN: ${book.isbndbId})`);
            const isbndbBook = await getBookByISBN(book.isbndbId);
            const transformedData = transformISBNdbBook(isbndbBook);
            book.volumeInfo = transformedData.volumeInfo;
            book.lastUpdated = new Date();
            console.log(`[Book by ID] ✅ Successfully updated from ISBNdb`);
          } catch (error) {
            console.error(`[Book by ID] ❌ Failed to update stale cache from ISBNdb:`, error);
          }
        } else if (book.openLibraryId) {
          // Fetch fresh data from Open Library API
          try {
            console.log(`[Book by ID] 🔄 Updating stale cache from Open Library (ID: ${book.openLibraryId})`);
            const workData = await getOpenLibraryWork(book.openLibraryId);
            type OpenLibraryAuthor = { name?: string } | string;
            // Extract year from first_publish_date if first_publish_year is not available
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
            // Convert null imageLinks values to undefined to match IVolumeInfo type
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
            console.log(`[Book by ID] ✅ Successfully updated from Open Library`);
          } catch (error) {
            console.error(`[Book by ID] ❌ Failed to update stale cache from Open Library:`, error);
          }
        }
      }

      await book.save().catch((saveError) => {
        // Don't fail the request if save fails
        console.warn("[Book by ID] ⚠️ Failed to save book stats:", saveError);
      });

      return NextResponse.json({
        id: book.isbndbId || book.openLibraryId || book.isbn13 || book.isbn || (book._id as { toString(): string }).toString(),
        _id: (book._id as { toString(): string }).toString(),
        bookId: (book._id as { toString(): string }).toString(),
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
        apiSource: apiSource,
      });
    }

    // Book not found in database - try external APIs
    console.log(`[Book by ID] 📚 Book not found in database for ID: "${id}"`);

    // If not in database, try ISBNdb API first (check if ID looks like an ISBN)
    const isISBN = /^(\d{10}|\d{13})$/.test(id);
    
    if (isISBN) {
      console.log(`[Book by ID] 🔍 Attempting ISBNdb API for ISBN: "${id}"`);
      try {
        const isbndbBook = await getBookByISBN(id);
        const transformedData = transformISBNdbBook(isbndbBook);
        
        // Cache the book in our database
        const createdBook = await Book.findOrCreateFromISBNdb(transformedData);
        
        console.log(`[Book by ID] ✅ SUCCESS: Book found via ISBNdb API (ISBN: ${id}, Title: ${createdBook.volumeInfo?.title || 'N/A'})`);

        return NextResponse.json({
          id: createdBook.isbndbId || id,
          _id: (createdBook._id as { toString(): string }).toString(),
          bookId: (createdBook._id as { toString(): string }).toString(),
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
      } catch (error) {
        console.error(`[Book by ID] ❌ ISBNdb API failed for ISBN "${id}":`, error instanceof Error ? error.message : "Unknown error");
        // Continue to fallback APIs
      }
    }

    // Try Open Library API (if ID looks like Open Library ID)
    if (id.startsWith("OL") || id.startsWith("/works/")) {
      console.log(`[Book by ID] 🔍 Attempting Open Library API for ID: "${id}"`);
      try {
        const workData = await getOpenLibraryWork(id);
        type OpenLibraryAuthor = { name?: string } | string;
        // Extract year from first_publish_date if first_publish_year is not available
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
        // Convert null imageLinks values to undefined to match IVolumeInfo type
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
        
        console.log(`[Book by ID] ✅ SUCCESS: Book found via Open Library API (ID: ${id}, Title: ${createdBook.volumeInfo?.title || 'N/A'})`);

        return NextResponse.json({
          id: createdBook.openLibraryId || id,
          _id: (createdBook._id as { toString(): string }).toString(),
          bookId: (createdBook._id as { toString(): string }).toString(),
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
      } catch (error) {
        console.error(`[Book by ID] ❌ Open Library API failed for ID "${id}":`, error instanceof Error ? error.message : "Unknown error");
      }
    }

    // No results from ISBNdb or Open Library
    console.log(`[Book by ID] ❌ Book not found in ISBNdb or Open Library APIs for ID: "${id}"`);
    return NextResponse.json(
      { error: "Book not found in ISBNdb or Open Library APIs" },
      { status: 404 }
    );
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
