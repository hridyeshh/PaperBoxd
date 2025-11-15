import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book";

/**
 * Add a book to user's collection (bookshelf, TBR, liked, etc.)
 *
 * POST /api/users/[username]/books
 * Body: {
 *   googleBooksId: string,
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
    const { googleBooksId, openLibraryId, bookId, type, ...additionalData } = body;

    if (!username || !type) {
      return NextResponse.json(
        { error: "Username and type are required" },
        { status: 400 }
      );
    }

    // Must provide at least one book identifier
    if (!googleBooksId && !openLibraryId && !bookId) {
      return NextResponse.json(
        { error: "Either googleBooksId, openLibraryId, or bookId is required" },
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

    // Find book by provided identifier
    let book = null;
    if (bookId) {
      book = await Book.findById(bookId);
    } else if (googleBooksId) {
      book = await Book.findOne({ googleBooksId });
    } else if (openLibraryId) {
      book = await Book.findOne({ openLibraryId });
    }

    // If book not found and we have googleBooksId, try to fetch from Google Books API
    if (!book && googleBooksId) {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      if (apiKey) {
        try {
          const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes/${googleBooksId}?key=${apiKey}`;
          const response = await fetch(googleBooksUrl);

          if (response.ok) {
            const googleBooksData = await response.json();
            await Book.findOrCreateFromGoogleBooks(googleBooksData);
            book = await Book.findOne({ googleBooksId });
          }
        } catch (error) {
          console.error("Failed to fetch from Google Books:", error);
        }
      }
    }

    // If book not found and we have openLibraryId, try to fetch from Open Library API
    if (!book && openLibraryId) {
      try {
        // Import Open Library functions
        const { getOpenLibraryWork, transformOpenLibraryBook } = await import("@/lib/api/open-library");
        const workData = await getOpenLibraryWork(openLibraryId);
        const transformedData = transformOpenLibraryBook({
          key: workData.key || `/works/${openLibraryId}`,
          title: workData.title || "",
          author_name: workData.authors?.map((a: any) => a.name) || [],
          cover_i: undefined, // Will be handled in transformation
          first_publish_year: workData.first_publish_year,
          isbn: workData.isbn || [],
          publisher: workData.publishers || [],
          subject: workData.subjects || [],
          ratings_average: workData.ratings_average,
          ratings_count: workData.ratings_count,
        });
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
    const bookReference = {
      bookId: bookIdObj,
      googleBooksId: book.googleBooksId || undefined,
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors[0] || "Unknown Author",
      cover:
        book.volumeInfo.imageLinks?.thumbnail ||
        book.volumeInfo.imageLinks?.smallThumbnail ||
        book.volumeInfo.imageLinks?.medium ||
        "",
      mood: additionalData.mood,
    };

    // Helper function to check if book exists in collection
    const findBookInCollection = (collection: any[]) => {
      return collection.findIndex((item: any) => {
        const itemBookId = item.bookId?.toString() || item.bookId;
        const currentBookId = bookIdObj.toString();
        return (
          itemBookId === currentBookId ||
          (book.googleBooksId && item.googleBooksId === book.googleBooksId) ||
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
        if (user.favoriteBooks.length >= 12) {
          return NextResponse.json(
            { error: "Maximum 12 favorite books allowed" },
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
  } catch (error) {
    console.error("Add book error:", error);
    return NextResponse.json(
      {
        error: "Failed to add book",
        details: error instanceof Error ? error.message : "Unknown error",
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

    let books: any[] = [];
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
  } catch (error) {
    console.error("Get books error:", error);
    return NextResponse.json(
      {
        error: "Failed to get books",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
