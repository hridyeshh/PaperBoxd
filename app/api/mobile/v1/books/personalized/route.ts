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
  try {
    await connectDB();
    
    // Auth check using our Bearer Token helper (bypasses NextAuth)
    const authUser = await getUserFromRequest(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: "Mobile authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "recommended";
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);

    const userId = new mongoose.Types.ObjectId(authUser.id);
    
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
    const preference = await UserPreference.findOne({ userId }).lean();
    const user = await User.findById(userId).lean();

    switch (type) {
      case "recommended": {
        // Simple recommendation based on user's favorite genres and authors
        const genreNames: string[] = [];
        const authorNames: string[] = [];

        // Get genres from onboarding or implicit preferences
        if (preference?.onboarding?.genres) {
          genreNames.push(...preference.onboarding.genres.map((g: { genre: string }) => g.genre));
        }
        if (preference?.implicitPreferences?.genreWeights) {
          const genreWeights = preference.implicitPreferences.genreWeights;
          if (genreWeights instanceof Map) {
            const topGenres = Array.from(genreWeights.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([genre]) => genre);
            genreNames.push(...topGenres);
          }
        }

        // Get authors from onboarding or user's bookshelf
        if (preference?.onboarding?.favoriteAuthors) {
          authorNames.push(...preference.onboarding.favoriteAuthors);
        }
        if (user?.authorsRead && Array.isArray(user.authorsRead)) {
          const userAuthors = user.authorsRead
            .map((a: { authorName?: string }) => a.authorName)
            .filter((a: string | undefined): a is string => a !== undefined && a.length > 0)
            .slice(0, 5);
          authorNames.push(...userAuthors);
        }

        // Build query based on preferences
        const query: {
          "volumeInfo.imageLinks.thumbnail": { $exists: boolean; $ne: null };
          $or?: Array<{ "volumeInfo.categories"?: { $regex: string; $options: string }; "volumeInfo.authors"?: { $regex: string; $options: string } }>;
        } = {
          "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
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

        // Fetch books sorted by rating (personalized recommendations)
        books = await Book.find(query)
          .sort({ "volumeInfo.averageRating": -1, createdAt: -1 })
          .limit(limit * 2) // Fetch more to ensure we have enough after filtering
          .lean();

        // If we don't have enough books, fall back to popular books
        if (books.length < limit) {
          const popularBooks = await Book.find({
            "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
            "volumeInfo.averageRating": { $gte: 4.0 },
          })
            .sort({ "volumeInfo.averageRating": -1, "volumeInfo.ratingsCount": -1 })
            .limit(limit)
            .lean();
          
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
        }

        // Limit to requested amount
        books = books.slice(0, limit);
        break;
      }

      case "onboarding": {
        // Books based on onboarding preferences
        if (preference?.onboarding) {
          const genreNames = preference.onboarding.genres?.map((g: { genre: string }) => g.genre) || [];
          const authorNames = preference.onboarding.favoriteAuthors || [];

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
            books = await Book.find(query)
              .sort({ "volumeInfo.averageRating": -1 })
              .limit(limit)
              .lean();
          }
        }
        break;
      }

      case "friends": {
        // Books liked by users you follow
        if (user?.following && Array.isArray(user.following) && user.following.length > 0) {
          const followingIds = user.following.map((id: string | mongoose.Types.ObjectId) => 
            typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
          );
          
          const followingUsers = await User.find({
            _id: { $in: followingIds },
            likedBooks: { $exists: true, $ne: [] },
          })
            .select("likedBooks")
            .lean();

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

          if (bookIds.size > 0) {
            const bookObjectIds = Array.from(bookIds).map((id) => new mongoose.Types.ObjectId(id));
            books = await Book.find({
              _id: { $in: bookObjectIds },
              "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
            })
              .sort({ "volumeInfo.averageRating": -1 })
              .limit(limit)
              .lean();
          }
        }
        break;
      }

      default:
        // Fallback to popular books
        books = await Book.find({
          "volumeInfo.imageLinks.thumbnail": { $exists: true, $ne: null },
          "volumeInfo.averageRating": { $gte: 4.0 },
        })
          .sort({ "volumeInfo.averageRating": -1, "volumeInfo.ratingsCount": -1 })
          .limit(limit)
          .lean();
    }

    // Transform books to match iOS Book model format
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

    return NextResponse.json({
      books: transformedBooks,
      count: transformedBooks.length,
    });
  } catch (error) {
    console.error("[Mobile API] Personalized Books Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

