import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";

/**
 * Get latest books sorted by published date or creation date
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Number of results per page (default: 10)
 * 
 * Example: /api/books/latest?page=1&pageSize=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "10")), 50);
    const skip = (page - 1) * pageSize;

    // Connect to database
    await connectDB();

    // Find books sorted by publishedDate (descending), then by createdAt (descending)
    // Prefer books with cover images, but include all books
    const books = await Book.find({})
      .sort({
        "volumeInfo.publishedDate": -1, // Most recent first
        createdAt: -1, // Fallback to creation date
      })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Get total count for pagination
    const total = await Book.countDocuments({});

    // Transform books to match expected format
    const transformedBooks = books.map((book: any) => {
      // Determine the best cover image to use
      // Prioritize ISBNdb images for high resolution
      const imageLinks = book.volumeInfo?.imageLinks || {};
      let cover = imageLinks.large || 
                  imageLinks.medium || 
                  imageLinks.thumbnail || 
                  imageLinks.smallThumbnail || 
                  imageLinks.extraLarge ||
                  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";
      
      // If it's an ISBNdb image, ensure we're using the best resolution
      // ISBNdb images are typically high quality, but we can check for image_original
      if (cover && (cover.includes('isbndb.com') || cover.includes('images.isbndb.com') || cover.includes('covers.isbndb.com'))) {
        // ISBNdb images are already high quality, use as-is
        // If we have image_original in the future, we could use that
      }

      // Get book ID for navigation
      const bookId = book._id?.toString() || 
                     book.isbn13 || 
                     book.isbn || 
                     book.openLibraryId || 
                     book.isbndbId;

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

    return NextResponse.json({
      books: transformedBooks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching latest books:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest books" },
      { status: 500 }
    );
  }
}

