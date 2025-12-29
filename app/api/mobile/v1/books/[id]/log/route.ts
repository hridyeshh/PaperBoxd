import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import User from "@/lib/db/models/User";
import mongoose from "mongoose";
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
 * Mobile API: Log book to user's collection (Save to Bookshelf)
 * 
 * POST /api/mobile/v1/books/[id]/log
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   status: "Want to Read" | "Reading" | "Read" | "DNF",
 *   rating?: number (1-5),
 *   thoughts?: string,
 *   format?: "Print" | "Digital" | "Audio"
 * }
 * 
 * Maps status to collection:
 * - "Want to Read" -> tbrBooks (TBR = DNF)
 * - "Reading" -> currentlyReading
 * - "Read" -> bookshelf
 * - "DNF" -> bookshelf (with thoughts containing "DNF")
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log("=".repeat(80));
    console.log(`[Mobile Log Book API] [${requestId}] === REQUEST START ===`);
    
    const { id } = await context.params;
    const body = await req.json();
    const { status, rating, thoughts, format, cover } = body;

    if (!status) {
      console.log(`[Mobile Log Book API] [${requestId}] ❌ ERROR: Status is required`);
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["Want to Read", "Reading", "Read", "DNF"];
    if (!validStatuses.includes(status)) {
      console.log(`[Mobile Log Book API] [${requestId}] ❌ ERROR: Invalid status: ${status}`);
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Auth check
    console.log(`[Mobile Log Book API] [${requestId}] Authenticating user...`);
    await connectDB();
    const authUser = await getUserFromRequest(req);
    
    if (!authUser || !authUser.id) {
      console.log(`[Mobile Log Book API] [${requestId}] ❌ ERROR: Unauthorized`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[Mobile Log Book API] [${requestId}] ✅ User authenticated: ${authUser.id}`);

    // Find or create book
    const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    let book = await Book.findOne(
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

    // If book not found, try to fetch from external APIs
    if (!book) {
      console.log(`[Mobile Log Book API] [${requestId}] Book not in database, fetching from external APIs...`);
      const isISBN = /^(\d{10}|\d{13})$/.test(id);
      
      if (isISBN) {
        try {
          const isbndbBook = await getBookByISBN(id);
          const transformedData = transformISBNdbBook(isbndbBook);
          const createdBook = await Book.findOrCreateFromISBNdb(transformedData);
          book = createdBook as NonNullable<typeof book>;
        } catch (error) {
          console.error(`[Mobile Log Book API] [${requestId}] ISBNdb API failed:`, error);
        }
      } else if (id.startsWith("OL") || id.startsWith("/works/")) {
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
          book = createdBook as NonNullable<typeof book>;
        } catch (error) {
          console.error(`[Mobile Log Book API] [${requestId}] Open Library API failed:`, error);
        }
      }
    }

    if (!book) {
      console.log(`[Mobile Log Book API] [${requestId}] ❌ ERROR: Book not found`);
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      );
    }

    const bookIdObj = book._id as mongoose.Types.ObjectId;
    const bookIdString = bookIdObj.toString();

    // Get user
    const user = await User.findById(authUser.id);
    if (!user) {
      console.log(`[Mobile Log Book API] [${requestId}] ❌ ERROR: User not found`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Build book reference (use provided cover if available, otherwise get from book)
    let coverURL = cover; // Use cover from request if provided
    
    if (!coverURL) {
      // Fallback to getting cover from book's imageLinks
    const imageLinks = book.volumeInfo?.imageLinks || {};
      coverURL = getBestBookCover(imageLinks) || 
                 "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";
    }
    
    // Ensure HTTPS for the cover URL
    if (coverURL && coverURL.startsWith("http://")) {
      coverURL = coverURL.replace("http://", "https://");
    }

    const bookReference = {
      bookId: bookIdObj,
      isbndbId: book.isbndbId,
      openLibraryId: book.openLibraryId,
      title: book.volumeInfo?.title || "Untitled",
      author: book.volumeInfo?.authors?.[0] || "Unknown Author",
      cover: coverURL,
    };

    // Check if book already exists in any collection (to avoid duplicates)
    const checkInCollection = (collection: Array<{ bookId?: mongoose.Types.ObjectId | string }>) => {
      return Array.isArray(collection) && collection.some((item) => {
        const itemBookId = item.bookId ? (typeof item.bookId === 'string' ? item.bookId : item.bookId.toString()) : null;
        return itemBookId === bookIdString;
      });
    };

    // Remove from other collections first (to avoid duplicates)
    const removeFromCollection = (collection: Array<{ bookId?: mongoose.Types.ObjectId | string }>) => {
      if (!Array.isArray(collection)) return;
      const index = collection.findIndex((item) => {
        const itemBookId = item.bookId ? (typeof item.bookId === 'string' ? item.bookId : item.bookId.toString()) : null;
        return itemBookId === bookIdString;
      });
      if (index !== -1) {
        collection.splice(index, 1);
      }
    };

    // Map status to collection and add/update
    switch (status) {
      case "Want to Read":
        removeFromCollection(user.tbrBooks);
        removeFromCollection(user.currentlyReading);
        removeFromCollection(user.bookshelf);
        
        if (!checkInCollection(user.tbrBooks)) {
          user.tbrBooks.push({
            ...bookReference,
            addedOn: new Date(),
          });
          await book.updateStats("tbr");
          
          user.activities.push({
            type: "added_to_list",
            bookId: bookIdObj,
            timestamp: new Date(),
          });
        }
        break;

      case "Reading":
        removeFromCollection(user.tbrBooks);
        removeFromCollection(user.currentlyReading);
        removeFromCollection(user.bookshelf);
        
        if (!checkInCollection(user.currentlyReading)) {
          user.currentlyReading.push(bookReference);
          
          user.activities.push({
            type: "started_reading",
            bookId: bookIdObj,
            timestamp: new Date(),
          });
        }
        break;

      case "Read":
        removeFromCollection(user.tbrBooks);
        removeFromCollection(user.currentlyReading);
        removeFromCollection(user.bookshelf);
        
        if (!checkInCollection(user.bookshelf)) {
          user.bookshelf.push({
            ...bookReference,
            finishedOn: new Date(),
            format: format,
            rating: rating,
            thoughts: thoughts,
          });
          user.totalBooksRead += 1;
          await book.updateStats("read");
          if (rating) {
            await book.updateStats("rating", rating);
          }
          
          user.activities.push({
            type: "read",
            bookId: bookIdObj,
            rating: rating,
            timestamp: new Date(),
          });
        }
        break;

      case "DNF":
        removeFromCollection(user.tbrBooks);
        removeFromCollection(user.currentlyReading);
        removeFromCollection(user.bookshelf);
        
        if (!checkInCollection(user.bookshelf)) {
          // Always prefix with "DNF: " to make detection simple
          const dnfThoughts = thoughts ? `DNF: ${thoughts}` : "DNF: Did not finish";
          user.bookshelf.push({
            ...bookReference,
            finishedOn: new Date(),
            format: format,
            rating: rating,
            thoughts: dnfThoughts,
          });
          // Match web version: DNF books are in bookshelf but don't count toward totalBooksRead
          // This is different from "Read" status which increments totalBooksRead
          // Note: Web version would increment totalBooksRead, but DNF semantically shouldn't count as "read"
          // Keeping current behavior: don't increment totalBooksRead for DNF
          // Don't update book stats for DNF (to avoid inflating read counts)
          
          user.activities.push({
            type: "dnf",
            bookId: bookIdObj,
            timestamp: new Date(),
          });
        }
        break;
    }

    await user.save();

    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Log Book API] [${requestId}] ✅ SUCCESS: Book logged (total time: ${totalTime}ms)`);
    console.log(`[Mobile Log Book API] [${requestId}] Status: ${status}, Book: ${book.volumeInfo?.title || "Unknown"}`);
    console.log(`[Mobile Log Book API] [${requestId}] === REQUEST END ===`);
    console.log("=".repeat(80));

    return NextResponse.json({
      success: true,
      status: status,
      message: `Book ${status === "Read" || status === "DNF" ? "added to" : "marked as"} ${status}`,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Log Book API] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Log Book API] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Log Book API] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Log Book API] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      {
        error: "Failed to log book",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

