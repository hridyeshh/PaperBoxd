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
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "50")), 200);
    const skip = (page - 1) * pageSize;

    // Fetch latest books with minimal projection for mobile speed
    // Sort by publishedDate (descending), then by createdAt (descending)
    const books = await Book.find({})
      .sort({
        "volumeInfo.publishedDate": -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Get total count for pagination
    const total = await Book.countDocuments({});

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
    console.error("[Mobile API] Latest Books Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}

