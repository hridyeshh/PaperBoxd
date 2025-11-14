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
    const { googleBooksId, type, ...additionalData } = body;

    if (!username || !googleBooksId || !type) {
      return NextResponse.json(
        { error: "Username, googleBooksId, and type are required" },
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

    // Find or create book in our database
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Books API key not configured" },
        { status: 500 }
      );
    }

    let book = await Book.findOne({ googleBooksId });

    if (!book) {
      // Fetch from Google Books API and cache
      const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes/${googleBooksId}?key=${apiKey}`;
      const response = await fetch(googleBooksUrl);

      if (!response.ok) {
        return NextResponse.json(
          { error: "Book not found in Google Books" },
          { status: 404 }
        );
      }

      const googleBooksData = await response.json();
      await Book.findOrCreateFromGoogleBooks(googleBooksData);
      book = await Book.findOne({ googleBooksId });
    }

    if (!book) {
      return NextResponse.json(
        { error: "Failed to load book information" },
        { status: 500 }
      );
    }

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare book reference
    const bookId = book._id as mongoose.Types.ObjectId;
    const bookReference = {
      bookId,
      googleBooksId: book.googleBooksId,
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors[0] || "Unknown Author",
      cover:
        book.volumeInfo.imageLinks?.thumbnail ||
        book.volumeInfo.imageLinks?.smallThumbnail ||
        "",
      mood: additionalData.mood,
    };

    // Add to appropriate collection
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
          bookId,
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
          bookId,
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
          bookId,
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
          bookId,
          timestamp: new Date(),
        });
        break;
    }

    await user.save();

    return NextResponse.json({
      message: `Book added to ${type} successfully`,
      book: bookReference,
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
