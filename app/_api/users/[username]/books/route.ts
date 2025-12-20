import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book";
import type {
  IBookReference,
  IBookshelfBook,
  ILikedBook,
  ITbrBook,
} from "@/lib/db/models/User";
import {
  getBookByISBN,
  transformISBNdbBook,
} from "@/lib/api/isbndb";
import {
  getOpenLibraryWork,
  transformOpenLibraryBook,
} from "@/lib/api/open-library";

export const dynamic = "force-dynamic";

// Type for Open Library work response
type OpenLibraryWorkData = {
  key?: string;
  title?: string;
  authors?: Array<{ name?: string } | string>;
  first_publish_year?: number;
  isbn?: string[];
  publishers?: string[];
  subjects?: string[];
  ratings_average?: number;
  ratings_count?: number;
};

/**
 * Add a book to user's collection (bookshelf, TBR, liked, etc.)
 *
 * POST /api/users/[username]/books
 * Body: {
 *   isbndbId?: string,        // ISBN-10 or ISBN-13 (ISBNdb ID)
 *   openLibraryId?: string,   // Open Library ID
 *   bookId?: string,          // MongoDB _id
 *   type: "bookshelf" | "tbr" | "liked" | "top" | "favorite" | "currently_reading",
 *   // Additional data based on type
 *   finishedOn?: Date,
 *   rating?: number,
 *   thoughts?: string,
 *   format?: string,
 *   urgency?: string,
 *   reason?: string,
 *   whyNow?: string
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const { isbndbId, openLibraryId, bookId, type, ...additionalData } = body;

    if (!username || !type) {
      return NextResponse.json(
        { error: "Username and type are required" },
        { status: 400 }
      );
    }

    // Must provide at least one book identifier
    if (!isbndbId && !openLibraryId && !bookId) {
      return NextResponse.json(
        { error: "Either isbndbId, openLibraryId, or bookId is required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = [
      "bookshelf",
      "tbr",
      "liked",
      "top",
      "favorite",
      "currently_reading",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Connect to database
    await connectDB();

    // Find book by provided identifier (priority: bookId > isbndbId > openLibraryId)
    let book = null;
    if (bookId) {
      book = await Book.findById(bookId);
    } else if (isbndbId) {
      book = await Book.findOne({ isbndbId });
    } else if (openLibraryId) {
      book = await Book.findOne({ openLibraryId });
    }

    // If book not found, try to fetch from APIs (ISBNdb first)
    if (!book && isbndbId) {
      console.log(`[User Books] Trying ISBNdb for ISBN: "${isbndbId}"`);
      try {
        const isbndbBook = await getBookByISBN(isbndbId);
        const transformedData = transformISBNdbBook(isbndbBook);
        await Book.findOrCreateFromISBNdb(transformedData);
        book = await Book.findOne({ isbndbId });
      } catch (error) {
        console.error("Failed to fetch from ISBNdb:", error);
      }
    }

    // Fallback to Open Library if ISBNdb fails or not available
    if (!book && openLibraryId) {
      console.log(`[User Books] Trying Open Library for ID: "${openLibraryId}"`);
      try {
        const workData = await getOpenLibraryWork(openLibraryId) as OpenLibraryWorkData;
        // Extract author names from various formats
        const authorNames: string[] = [];
        if (workData.authors) {
          for (const author of workData.authors) {
            if (typeof author === 'string') {
              authorNames.push(author);
            } else if (author && typeof author === 'object' && 'name' in author && typeof author.name === 'string') {
              authorNames.push(author.name);
            }
          }
        }
        const transformedDataRaw = transformOpenLibraryBook({
          key: workData.key || `/works/${openLibraryId}`,
          title: workData.title || "",
          author_name: authorNames,
          cover_i: undefined, // Will be handled in transformation
          first_publish_year: workData.first_publish_year,
          isbn: workData.isbn || [],
          publisher: workData.publishers || [],
          subject: workData.subjects || [],
          ratings_average: workData.ratings_average,
          ratings_count: workData.ratings_count,
        });

        // Convert null to undefined for imageLinks properties to match IOpenLibraryBookData interface
        const transformedData = {
          ...transformedDataRaw,
          volumeInfo: {
            ...transformedDataRaw.volumeInfo,
            imageLinks: transformedDataRaw.volumeInfo.imageLinks ? {
              thumbnail: transformedDataRaw.volumeInfo.imageLinks.thumbnail === null ? undefined : transformedDataRaw.volumeInfo.imageLinks.thumbnail,
              smallThumbnail: transformedDataRaw.volumeInfo.imageLinks.smallThumbnail === null ? undefined : transformedDataRaw.volumeInfo.imageLinks.smallThumbnail,
              small: transformedDataRaw.volumeInfo.imageLinks.small === null ? undefined : transformedDataRaw.volumeInfo.imageLinks.small,
              medium: transformedDataRaw.volumeInfo.imageLinks.medium === null ? undefined : transformedDataRaw.volumeInfo.imageLinks.medium,
              large: transformedDataRaw.volumeInfo.imageLinks.large === null ? undefined : transformedDataRaw.volumeInfo.imageLinks.large,
              extraLarge: transformedDataRaw.volumeInfo.imageLinks.extraLarge === null ? undefined : transformedDataRaw.volumeInfo.imageLinks.extraLarge,
            } : undefined,
          },
        };

        await Book.findOrCreateFromOpenLibrary(transformedData);
        book = await Book.findOne({ openLibraryId });
      } catch (error) {
        console.error("Failed to fetch from Open Library:", error);
      }
    }

    if (!book) {
      return NextResponse.json(
        { error: "Book not found. Please ensure the book exists in our database." },
        { status: 404 }
      );
    }

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare book reference
    const bookIdObj = book._id as mongoose.Types.ObjectId;

    // Extract author - handle various formats and edge cases
    let author = "Unknown Author";
    if (book.volumeInfo?.authors && Array.isArray(book.volumeInfo.authors) && book.volumeInfo.authors.length > 0) {
      // Get first author, filter out empty strings
      const authors = book.volumeInfo.authors.filter((a: string) => a && a.trim() !== '');
      if (authors.length > 0) {
        author = authors[0].trim();
      }
    }

    // Log warning if author is missing
    if (author === "Unknown Author") {
      console.warn(`[User Books] Book "${book.volumeInfo?.title || 'Unknown'}" added without author information`);
    }

    const bookReference = {
      bookId: bookIdObj,
      isbndbId: book.isbndbId || undefined,
      openLibraryId: book.openLibraryId || undefined,
      title: book.volumeInfo.title,
      author: author,
      cover:
        book.volumeInfo.imageLinks?.thumbnail ||
        book.volumeInfo.imageLinks?.smallThumbnail ||
        book.volumeInfo.imageLinks?.medium ||
        "",
      mood: additionalData.mood,
    };

    // Helper function to check if book exists in collection
    type BookCollectionItem = IBookReference | IBookshelfBook | ILikedBook | ITbrBook;
    const findBookInCollection = (collection: BookCollectionItem[]): number => {
      return collection.findIndex((item) => {
        const itemBookId = item.bookId?.toString() || item.bookId;
        const currentBookId = bookIdObj.toString();
        return (
          itemBookId === currentBookId ||
          (book.isbndbId && item.isbndbId === book.isbndbId) ||
          (book.openLibraryId && item.openLibraryId === book.openLibraryId) ||
          item.title?.toLowerCase() === book.volumeInfo.title?.toLowerCase()
        );
      });
    };

    // Check if book already exists and handle toggle (remove if exists, add if not)
    let existingIndex = -1;
    let isRemoving = false;

    switch (type) {
      case "bookshelf":
        existingIndex = findBookInCollection(user.bookshelf);
        break;
      case "tbr":
        existingIndex = findBookInCollection(user.tbrBooks);
        break;
      case "liked":
        existingIndex = findBookInCollection(user.likedBooks);
        break;
      case "top":
        existingIndex = findBookInCollection(user.topBooks);
        break;
      case "favorite":
        existingIndex = findBookInCollection(user.favoriteBooks);
        break;
      case "currently_reading":
        existingIndex = findBookInCollection(user.currentlyReading);
        break;
    }

    // If book exists, remove it (toggle off)
    if (existingIndex !== -1) {
      isRemoving = true;
      switch (type) {
        case "bookshelf":
          user.bookshelf.splice(existingIndex, 1);
          user.totalBooksRead = Math.max(0, user.totalBooksRead - 1);
          // Note: We don't decrement book stats here as other users might have the book
          break;
        case "tbr":
          user.tbrBooks.splice(existingIndex, 1);
          break;
        case "liked":
          user.likedBooks.splice(existingIndex, 1);
          break;
        case "top":
          user.topBooks.splice(existingIndex, 1);
          break;
        case "favorite":
          user.favoriteBooks.splice(existingIndex, 1);
          break;
        case "currently_reading":
          user.currentlyReading.splice(existingIndex, 1);
          break;
      }
    }

    // If not removing, add to appropriate collection
    if (!isRemoving) {
      switch (type) {
        case "bookshelf":
          user.bookshelf.push({
            ...bookReference,
            finishedOn: additionalData.finishedOn
              ? new Date(additionalData.finishedOn)
              : new Date(),
            format: additionalData.format,
            rating: additionalData.rating,
            thoughts: additionalData.thoughts,
          });
          user.totalBooksRead += 1;
          await book.updateStats("read");
          if (additionalData.rating) {
            await book.updateStats("rating", additionalData.rating);
          }

          // Add activity
          user.activities.push({
            type: "read",
            bookId: bookIdObj,
            rating: additionalData.rating,
            timestamp: new Date(),
          });
          break;

        case "tbr":
          user.tbrBooks.push({
            ...bookReference,
            addedOn: new Date(),
            urgency: additionalData.urgency,
            whyNow: additionalData.whyNow,
          });
          await book.updateStats("tbr");

          // Add activity
          user.activities.push({
            type: "added_to_list",
            bookId: bookIdObj,
            timestamp: new Date(),
          });
          break;

        case "liked":
          user.likedBooks.push({
            ...bookReference,
            likedOn: new Date(),
            reason: additionalData.reason,
          });
          await book.updateStats("like");

          // Add activity
          user.activities.push({
            type: "liked",
            bookId: bookIdObj,
            timestamp: new Date(),
          });
          break;

        case "top":
          if (user.topBooks.length >= 6) {
            return NextResponse.json(
              { error: "Maximum 6 top books allowed" },
              { status: 400 }
            );
          }
          user.topBooks.push(bookReference);
          break;

        case "favorite":
          if (user.favoriteBooks.length >= 4) {
            return NextResponse.json(
              { error: "Maximum 4 favorite books allowed" },
              { status: 400 }
            );
          }
          user.favoriteBooks.push(bookReference);
          break;

        case "currently_reading":
          user.currentlyReading.push(bookReference);

          // Add activity
          user.activities.push({
            type: "started_reading",
            bookId: bookIdObj,
            timestamp: new Date(),
          });
          break;
      }
    }

    await user.save();

    return NextResponse.json({
      message: isRemoving
        ? `Book removed from ${type} successfully`
        : `Book added to ${type} successfully`,
      book: bookReference,
      removed: isRemoving,
    });
  } catch (error: unknown) {
    console.error("Add book error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to add book",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Get user's books by type
 *
 * GET /api/users/[username]/books?type=bookshelf&limit=10&offset=0
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "bookshelf";
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Connect to database
    await connectDB();

    // Find user
    const user = await User.findOne({ username }).select(
      `${type === "top" ? "topBooks" : type === "favorite" ? "favoriteBooks" : type === "tbr" ? "tbrBooks" : type === "liked" ? "likedBooks" : type === "currently_reading" ? "currentlyReading" : "bookshelf"}`
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    type BookCollection = IBookReference[] | IBookshelfBook[] | ILikedBook[] | ITbrBook[];
    let books: BookCollection = [];
    let total = 0;

    switch (type) {
      case "top":
        books = user.topBooks;
        total = user.topBooks.length;
        break;
      case "favorite":
        books = user.favoriteBooks;
        total = user.favoriteBooks.length;
        break;
      case "tbr":
        books = user.tbrBooks;
        total = user.tbrBooks.length;
        break;
      case "liked":
        books = user.likedBooks;
        total = user.likedBooks.length;
        break;
      case "currently_reading":
        books = user.currentlyReading;
        total = user.currentlyReading.length;
        break;
      case "bookshelf":
      default:
        books = user.bookshelf;
        total = user.bookshelf.length;
        break;
    }

    // Apply pagination
    const paginatedBooks = books.slice(offset, offset + limit);

    return NextResponse.json({
      type,
      total,
      limit,
      offset,
      books: paginatedBooks,
    });
  } catch (error: unknown) {
    console.error("Get books error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to get books",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Reorder favorite books
 *
 * PUT /api/users/[username]/books
 * Body: {
 *   type: "favorite",
 *   bookIds: string[]  // Array of book IDs in the new order
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const { type, bookIds } = body;

    if (!username || !type || !Array.isArray(bookIds)) {
      return NextResponse.json(
        { error: "Username, type, and bookIds array are required" },
        { status: 400 }
      );
    }

    if (type !== "favorite") {
      return NextResponse.json(
        { error: "Reordering is only supported for favorite books" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate that all bookIds exist in user's favoriteBooks
    const existingBookIds = user.favoriteBooks.map((b) => b.bookId?.toString());
    const validBookIds = bookIds.filter((id: string) => existingBookIds.includes(id));

    if (validBookIds.length !== bookIds.length || validBookIds.length !== user.favoriteBooks.length) {
      return NextResponse.json(
        { error: "Invalid book IDs or count mismatch" },
        { status: 400 }
      );
    }

    // Reorder favoriteBooks based on bookIds array
    const reorderedBooks = bookIds
      .map((id: string) => {
        return user.favoriteBooks.find((b) => b.bookId?.toString() === id);
      })
      .filter((b): b is IBookReference => b !== undefined);

    user.favoriteBooks = reorderedBooks;
    await user.save();

    return NextResponse.json({
      message: "Favorite books reordered successfully",
      books: reorderedBooks,
    });
  } catch (error: unknown) {
    console.error("Reorder books error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to reorder books",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
