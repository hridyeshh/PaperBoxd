import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import UserPreference from "@/lib/db/models/UserPreference";
import User from "@/lib/db/models/User";
import { getBestBookCover } from "@/lib/utils";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Mobile API: Get personalized book recommendations
 * 
 * GET /api/mobile/v1/books/personalized?type=recommended&limit=20
 * Headers: Authorization: Bearer <token>
 * 
 * Returns: { books: Book[], count?: number }
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log("=".repeat(80));
    console.log(`[Mobile Personalized Books API] [${requestId}] === REQUEST START ===`);
    console.log(`[Mobile Personalized Books API] [${requestId}] Path: ${req.nextUrl.pathname}`);
    console.log(`[Mobile Personalized Books API] [${requestId}] Method: ${req.method}`);
    console.log(`[Mobile Personalized Books API] [${requestId}] URL: ${req.url}`);
    console.log(`[Mobile Personalized Books API] [${requestId}] Timestamp: ${new Date().toISOString()}`);
    
    // Log ALL headers for debugging
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log(`[Mobile Personalized Books API] [${requestId}] All Headers:`, JSON.stringify(allHeaders, null, 2));
    
    // Specifically check Authorization header
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    console.log(`[Mobile Personalized Books API] [${requestId}] Authorization header present: ${!!authHeader}`);
    if (authHeader) {
      console.log(`[Mobile Personalized Books API] [${requestId}] Authorization header length: ${authHeader.length}`);
      console.log(`[Mobile Personalized Books API] [${requestId}] Authorization header (first 50 chars): ${authHeader.substring(0, 50)}...`);
      console.log(`[Mobile Personalized Books API] [${requestId}] Authorization starts with 'Bearer': ${authHeader.startsWith("Bearer ")}`);
    } else {
      console.log(`[Mobile Personalized Books API] [${requestId}] ⚠️ WARNING: No Authorization header found!`);
      const headerKeys = Array.from(req.headers.keys());
      console.log(`[Mobile Personalized Books API] [${requestId}] Available header keys:`, headerKeys);
    }
    
    console.log(`[Mobile Personalized Books API] [${requestId}] Connecting to database...`);
    const dbStartTime = Date.now();
    await connectDB();
    console.log(`[Mobile Personalized Books API] [${requestId}] ✅ Database connected (${Date.now() - dbStartTime}ms)`);
    
    // Auth check using our Bearer Token helper (bypasses NextAuth)
    console.log(`[Mobile Personalized Books API] [${requestId}] Calling getUserFromRequest...`);
    const authStartTime = Date.now();
    const authUser = await getUserFromRequest(req);
    console.log(`[Mobile Personalized Books API] [${requestId}] getUserFromRequest completed (${Date.now() - authStartTime}ms)`);
    
    console.log(`[Mobile Personalized Books API] [${requestId}] Auth user result:`, {
      present: !!authUser,
      id: authUser?.id,
      email: authUser?.email,
      username: authUser?.username,
    });
    
    if (!authUser || !authUser.id) {
      console.log(`[Mobile Personalized Books API] [${requestId}] ❌ AUTH FAILED: No auth user or missing ID`);
      console.log(`[Mobile Personalized Books API] [${requestId}] Auth user object:`, JSON.stringify(authUser, null, 2));
      return NextResponse.json(
        { error: "Mobile authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "recommended";
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);

    console.log(`[Mobile Personalized Books API] [${requestId}] Query params:`, { type, limit });

    const userId = new mongoose.Types.ObjectId(authUser.id);
    console.log(`[Mobile Personalized Books API] [${requestId}] User ID (ObjectId): ${userId.toString()}`);
    
    // Type for MongoDB lean documents
    type BookLean = {
      _id?: { toString(): string } | mongoose.Types.ObjectId;
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
    
    let books: BookLean[] = [];

    // Get user preferences
    console.log(`[Mobile Personalized Books API] [${requestId}] Fetching user preferences...`);
    const prefStartTime = Date.now();
    const preference = await UserPreference.findOne({ userId }).lean();
    console.log(`[Mobile Personalized Books API] [${requestId}] Preferences query completed (${Date.now() - prefStartTime}ms)`, {
      found: !!preference,
      hasOnboarding: !!preference?.onboarding,
      hasImplicitPrefs: !!preference?.implicitPreferences,
    });
    
    console.log(`[Mobile Personalized Books API] [${requestId}] Fetching user data...`);
    const userStartTime = Date.now();
    const user = await User.findById(userId).lean();
    console.log(`[Mobile Personalized Books API] [${requestId}] User query completed (${Date.now() - userStartTime}ms)`, {
      found: !!user,
      hasAuthorsRead: !!user?.authorsRead && Array.isArray(user.authorsRead),
      authorsReadCount: user?.authorsRead && Array.isArray(user.authorsRead) ? user.authorsRead.length : 0,
      hasFollowing: !!user?.following && Array.isArray(user.following),
      followingCount: user?.following && Array.isArray(user.following) ? user.following.length : 0,
    });

    console.log(`[Mobile Personalized Books API] [${requestId}] Processing type: ${type}`);
    
    switch (type) {
      case "recommended": {
        console.log(`[Mobile Personalized Books API] [${requestId}] Building 'recommended' recommendations...`);
        // Simple recommendation based on user's favorite genres and authors
        const genreNames: string[] = [];
        const authorNames: string[] = [];

        // Get genres from onboarding or implicit preferences
        if (preference?.onboarding?.genres) {
          const onboardingGenres = preference.onboarding.genres.map((g: { genre: string }) => g.genre);
          genreNames.push(...onboardingGenres);
          console.log(`[Mobile Personalized Books API] [${requestId}] Found ${onboardingGenres.length} genres from onboarding:`, onboardingGenres);
        }
        if (preference?.implicitPreferences?.genreWeights) {
          const genreWeights = preference.implicitPreferences.genreWeights;
          if (genreWeights instanceof Map) {
            const topGenres = Array.from(genreWeights.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([genre]) => genre);
            genreNames.push(...topGenres);
            console.log(`[Mobile Personalized Books API] [${requestId}] Found ${topGenres.length} top genres from implicit preferences:`, topGenres);
          } else {
            console.log(`[Mobile Personalized Books API] [${requestId}] Genre weights is not a Map, type:`, typeof genreWeights);
          }
        }

        // Get authors from onboarding or user's bookshelf
        if (preference?.onboarding?.favoriteAuthors) {
          authorNames.push(...preference.onboarding.favoriteAuthors);
          console.log(`[Mobile Personalized Books API] [${requestId}] Found ${preference.onboarding.favoriteAuthors.length} authors from onboarding:`, preference.onboarding.favoriteAuthors);
        }
        if (user?.authorsRead && Array.isArray(user.authorsRead)) {
          const userAuthors = user.authorsRead
            .map((a: { authorName?: string }) => a.authorName)
            .filter((a: string | undefined): a is string => a !== undefined && a.length > 0)
            .slice(0, 5);
          authorNames.push(...userAuthors);
          console.log(`[Mobile Personalized Books API] [${requestId}] Found ${userAuthors.length} authors from user's reading history:`, userAuthors);
        }
        
        console.log(`[Mobile Personalized Books API] [${requestId}] Total genres: ${genreNames.length}, Total authors: ${authorNames.length}`);

        // Build query based on preferences
        // Filter: Only show books from ISBNdb or Open Library (exclude Google Books)
        const query: {
          "volumeInfo.imageLinks.thumbnail": { $exists: boolean; $ne: null };
          apiSource: { $in: string[] };
          $or?: Array<{ "volumeInfo.categories"?: { $regex: string; $options: string }; "volumeInfo.authors"?: { $regex: string; $options: string } }>;
        } = {
          "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
          apiSource: { $in: ["isbndb", "open_library"] }, // Only ISBNdb and Open Library, exclude Google Books
        };

        if (genreNames.length > 0 || authorNames.length > 0) {
          query.$or = [];
          
          // Add genre matches
          for (const genre of genreNames.slice(0, 5)) {
            query.$or.push({
              "volumeInfo.categories": { $regex: genre, $options: "i" },
            });
          }
          
          // Add author matches
          for (const author of authorNames.slice(0, 5)) {
            const authorParts = author.trim().split(/\s+/).filter((part: string) => part.length > 2);
            for (const part of authorParts) {
              query.$or.push({
                "volumeInfo.authors": { $regex: part, $options: "i" },
              });
            }
          }
        }

        console.log(`[Mobile Personalized Books API] [${requestId}] Query structure:`, JSON.stringify(query, null, 2));
        
        // Fetch books sorted by rating (personalized recommendations)
        // Filter: Only show books from ISBNdb or Open Library (exclude Google Books)
        console.log(`[Mobile Personalized Books API] [${requestId}] Fetching books from database (ISBNdb and Open Library only)...`);
        const queryStartTime = Date.now();
        books = await Book.find(query)
          .sort({ "volumeInfo.averageRating": -1, createdAt: -1 })
          .limit(limit * 2) // Fetch more to ensure we have enough after filtering
          .lean();
        console.log(`[Mobile Personalized Books API] [${requestId}] Books query completed (${Date.now() - queryStartTime}ms), found ${books.length} books`);

        // If we don't have enough books, fall back to popular books
        if (books.length < limit) {
          console.log(`[Mobile Personalized Books API] [${requestId}] Only found ${books.length} books, fetching popular books as fallback...`);
          const fallbackStartTime = Date.now();
          const popularBooks = await Book.find({
            "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
            "volumeInfo.averageRating": { $gte: 4.0 },
            apiSource: { $in: ["isbndb", "open_library"] }, // Only ISBNdb and Open Library, exclude Google Books
          })
            .sort({ "volumeInfo.averageRating": -1, "volumeInfo.ratingsCount": -1 })
            .limit(limit)
            .lean();
          console.log(`[Mobile Personalized Books API] [${requestId}] Fallback query completed (${Date.now() - fallbackStartTime}ms), found ${popularBooks.length} popular books`);
          
          // Combine and deduplicate
          const seenIds = new Set(books.map((b: BookLean) => {
            const id = b._id;
            return id ? (typeof id === 'object' && 'toString' in id ? id.toString() : String(id)) : undefined;
          }).filter((id): id is string => id !== undefined));
          for (const book of popularBooks) {
            const bookId = book._id?.toString();
            if (bookId && !seenIds.has(bookId)) {
              books.push(book);
              seenIds.add(bookId);
            }
          }
          console.log(`[Mobile Personalized Books API] [${requestId}] After fallback merge: ${books.length} total books`);
        }

        // Limit to requested amount
        books = books.slice(0, limit);
        console.log(`[Mobile Personalized Books API] [${requestId}] Final book count after limit: ${books.length}`);
        break;
      }

      case "onboarding": {
        console.log(`[Mobile Personalized Books API] [${requestId}] Building 'onboarding' recommendations...`);
        // Books based on onboarding preferences
        if (preference?.onboarding) {
          const genreNames = preference.onboarding.genres?.map((g: { genre: string }) => g.genre) || [];
          const authorNames = preference.onboarding.favoriteAuthors || [];
          console.log(`[Mobile Personalized Books API] [${requestId}] Onboarding data:`, {
            genres: genreNames,
            authors: authorNames,
          });

          const query: {
            "volumeInfo.imageLinks.thumbnail": { $exists: boolean; $ne: null };
            $or: Array<{ "volumeInfo.categories"?: { $regex: string; $options: string }; "volumeInfo.authors"?: { $regex: string; $options: string } }>;
          } = {
            "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
            $or: [],
          };

          for (const genre of genreNames) {
            query.$or.push({
              "volumeInfo.categories": { $regex: genre, $options: "i" },
            });
          }

          for (const author of authorNames) {
            query.$or.push({
              "volumeInfo.authors": { $regex: author, $options: "i" },
            });
          }

          if (query.$or.length > 0) {
            console.log(`[Mobile Personalized Books API] [${requestId}] Fetching onboarding books...`);
            const queryStartTime = Date.now();
            books = await Book.find(query)
              .sort({ "volumeInfo.averageRating": -1 })
              .limit(limit)
              .lean();
            console.log(`[Mobile Personalized Books API] [${requestId}] Onboarding books query completed (${Date.now() - queryStartTime}ms), found ${books.length} books`);
          } else {
            console.log(`[Mobile Personalized Books API] [${requestId}] No query conditions, skipping onboarding books`);
          }
        } else {
          console.log(`[Mobile Personalized Books API] [${requestId}] No onboarding preferences found`);
        }
        break;
      }

      case "friends": {
        console.log(`[Mobile Personalized Books API] [${requestId}] Building 'friends' recommendations...`);
        // Books liked by users you follow
        if (user?.following && Array.isArray(user.following) && user.following.length > 0) {
          console.log(`[Mobile Personalized Books API] [${requestId}] User follows ${user.following.length} users`);
          const followingIds = user.following.map((id: string | mongoose.Types.ObjectId) => 
            typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
          );
          
          console.log(`[Mobile Personalized Books API] [${requestId}] Fetching following users...`);
          const followingStartTime = Date.now();
          const followingUsers = await User.find({
            _id: { $in: followingIds },
            likedBooks: { $exists: true, $ne: [] },
          })
            .select("likedBooks")
            .lean();
          console.log(`[Mobile Personalized Books API] [${requestId}] Following users query completed (${Date.now() - followingStartTime}ms), found ${followingUsers.length} users with liked books`);

          const bookIds = new Set<string>();
          for (const followingUser of followingUsers) {
            if (followingUser.likedBooks && Array.isArray(followingUser.likedBooks)) {
              for (const likedBook of followingUser.likedBooks) {
                const bookId = likedBook.bookId?.toString();
                if (bookId) {
                  bookIds.add(bookId);
                }
              }
            }
          }
          console.log(`[Mobile Personalized Books API] [${requestId}] Collected ${bookIds.size} unique book IDs from friends`);

          if (bookIds.size > 0) {
            const bookObjectIds = Array.from(bookIds).map((id) => new mongoose.Types.ObjectId(id));
            console.log(`[Mobile Personalized Books API] [${requestId}] Fetching friend-liked books...`);
            const booksStartTime = Date.now();
            books = await Book.find({
              _id: { $in: bookObjectIds },
              "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
            })
              .sort({ "volumeInfo.averageRating": -1 })
              .limit(limit)
              .lean();
            console.log(`[Mobile Personalized Books API] [${requestId}] Friends books query completed (${Date.now() - booksStartTime}ms), found ${books.length} books`);
          } else {
            console.log(`[Mobile Personalized Books API] [${requestId}] No book IDs collected from friends`);
          }
        } else {
          console.log(`[Mobile Personalized Books API] [${requestId}] User has no following or following array is empty`);
        }
        break;
      }

      default:
        console.log(`[Mobile Personalized Books API] [${requestId}] Unknown type '${type}', using popular books fallback`);
        // Fallback to popular books
        const fallbackStartTime = Date.now();
        books = await Book.find({
          "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
          "volumeInfo.averageRating": { $gte: 4.0 },
        })
          .sort({ "volumeInfo.averageRating": -1, "volumeInfo.ratingsCount": -1 })
          .limit(limit)
          .lean();
        console.log(`[Mobile Personalized Books API] [${requestId}] Fallback query completed (${Date.now() - fallbackStartTime}ms), found ${books.length} books`);
    }
    
    console.log(`[Mobile Personalized Books API] [${requestId}] Total books found: ${books.length}`);

    // Transform books to match iOS Book model format
    console.log(`[Mobile Personalized Books API] [${requestId}] Transforming ${books.length} books...`);
    const transformStartTime = Date.now();
    const transformedBooks = books.map((book: BookLean) => {
      const imageLinks = book.volumeInfo?.imageLinks || {};
      const cover = getBestBookCover(imageLinks) || 
                  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";

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
    console.log(`[Mobile Personalized Books API] [${requestId}] Transformation completed (${Date.now() - transformStartTime}ms)`);

    const responseData = {
      books: transformedBooks,
      count: transformedBooks.length,
    };

    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Personalized Books API] [${requestId}] ✅ SUCCESS: Returning ${transformedBooks.length} books (total time: ${totalTime}ms)`);
    console.log(`[Mobile Personalized Books API] [${requestId}] Response structure:`, {
      booksCount: responseData.books.length,
      count: responseData.count,
      firstBookId: responseData.books[0]?.id,
      firstBookTitle: responseData.books[0]?.title,
    });
    console.log(`[Mobile Personalized Books API] [${requestId}] === REQUEST END ===`);
    console.log("=".repeat(80));

    return NextResponse.json(responseData);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Personalized Books API] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Personalized Books API] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Personalized Books API] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Personalized Books API] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

