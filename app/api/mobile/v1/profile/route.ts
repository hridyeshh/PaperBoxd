import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import User, { IReadingList, IDiaryEntry } from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book";
import mongoose from "mongoose";
import { getBestBookCover } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Mobile API: Get current user profile
 * 
 * GET /api/mobile/v1/profile
 * Headers: Authorization: Bearer <token>
 * 
 * Returns: User profile data matching iOS UserProfile model
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log("=".repeat(80));
    console.log(`[Mobile Profile API] [${requestId}] === REQUEST START ===`);
    console.log(`[Mobile Profile API] [${requestId}] Path: ${req.nextUrl.pathname}`);
    console.log(`[Mobile Profile API] [${requestId}] Method: ${req.method}`);
    console.log(`[Mobile Profile API] [${requestId}] URL: ${req.url}`);
    console.log(`[Mobile Profile API] [${requestId}] Timestamp: ${new Date().toISOString()}`);
    
    // Log ALL headers for debugging
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log(`[Mobile Profile API] [${requestId}] All Headers:`, JSON.stringify(allHeaders, null, 2));
    
    // Specifically check Authorization header (standard and custom fallback)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const customAuthHeader = req.headers.get("x-user-authorization") || req.headers.get("X-User-Authorization");
    
    console.log(`[Mobile Profile API] [${requestId}] Authorization header present: ${!!authHeader}`);
    console.log(`[Mobile Profile API] [${requestId}] X-User-Authorization header present: ${!!customAuthHeader}`);
    
    if (authHeader) {
      console.log(`[Mobile Profile API] [${requestId}] Authorization header length: ${authHeader.length}`);
      console.log(`[Mobile Profile API] [${requestId}] Authorization header (first 50 chars): ${authHeader.substring(0, 50)}...`);
      console.log(`[Mobile Profile API] [${requestId}] Authorization starts with 'Bearer': ${authHeader.startsWith("Bearer ")}`);
    }
    
    if (customAuthHeader) {
      console.log(`[Mobile Profile API] [${requestId}] X-User-Authorization header length: ${customAuthHeader.length}`);
      console.log(`[Mobile Profile API] [${requestId}] X-User-Authorization header (first 50 chars): ${customAuthHeader.substring(0, 50)}...`);
    }
    
    if (!authHeader && !customAuthHeader) {
      console.log(`[Mobile Profile API] [${requestId}] ⚠️ WARNING: No Authorization or X-User-Authorization header found!`);
      const headerKeys = Array.from(req.headers.keys());
      console.log(`[Mobile Profile API] [${requestId}] Available header keys:`, headerKeys);
    }
    
    // Check Vercel internal headers
    const vercelHeaders = req.headers.get("x-vercel-sc-headers");
    if (vercelHeaders) {
      console.log(`[Mobile Profile API] [${requestId}] x-vercel-sc-headers present: ${!!vercelHeaders}`);
      try {
        const parsed = JSON.parse(vercelHeaders);
        console.log(`[Mobile Profile API] [${requestId}] x-vercel-sc-headers parsed:`, JSON.stringify(parsed, null, 2));
        if (parsed.Authorization || parsed.authorization) {
          console.log(`[Mobile Profile API] [${requestId}] Found Authorization in x-vercel-sc-headers`);
        }
      } catch (e) {
        console.log(`[Mobile Profile API] [${requestId}] Could not parse x-vercel-sc-headers:`, e);
      }
    }
    
    console.log(`[Mobile Profile API] [${requestId}] Connecting to database...`);
    const dbStartTime = Date.now();
    await connectDB();
    console.log(`[Mobile Profile API] [${requestId}] ✅ Database connected (${Date.now() - dbStartTime}ms)`);
    
    console.log(`[Mobile Profile API] [${requestId}] Calling getUserFromRequest...`);
    const authStartTime = Date.now();
    const authUser = await getUserFromRequest(req);
    console.log(`[Mobile Profile API] [${requestId}] getUserFromRequest completed (${Date.now() - authStartTime}ms)`);
    
    console.log(`[Mobile Profile API] [${requestId}] Auth user result:`, {
      present: !!authUser,
      id: authUser?.id,
      email: authUser?.email,
      username: authUser?.username,
    });
    
    if (!authUser || !authUser.id) {
      console.log(`[Mobile Profile API] [${requestId}] ❌ AUTH FAILED: No auth user or missing ID`);
      console.log(`[Mobile Profile API] [${requestId}] Auth user object:`, JSON.stringify(authUser, null, 2));
      return NextResponse.json(
        { error: "Invalid Mobile Session" },
        { status: 401 }
      );
    }

    console.log(`[Mobile Profile API] [${requestId}] Fetching user from database with ID: ${authUser.id}`);
    const queryStartTime = Date.now();
    const user = await User.findById(authUser.id)
      .select("-password -__v")
      .lean();
    console.log(`[Mobile Profile API] [${requestId}] User query completed (${Date.now() - queryStartTime}ms)`);
      
    if (!user) {
      console.log(`[Mobile Profile API] [${requestId}] ❌ USER NOT FOUND: No user found with ID ${authUser.id}`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log(`[Mobile Profile API] [${requestId}] ✅ User found:`, {
      id: String(user._id),
      username: user.username,
      email: user.email,
      name: user.name,
      hasAvatar: !!user.avatar,
      topBooksCount: Array.isArray(user.topBooks) ? user.topBooks.length : 0,
      favoriteBooksCount: Array.isArray(user.favoriteBooks) ? user.favoriteBooks.length : 0,
      bookshelfCount: Array.isArray(user.bookshelf) ? user.bookshelf.length : 0,
      readingListsCount: Array.isArray(user.readingLists) ? user.readingLists.length : 0,
    });
    
    // Create a map for reading progress lookup (for DNF detection from TBR books)
    const readingProgressMap = new Map<string, { pagesRead: number; updatedAt: Date | null }>();
    if (Array.isArray(user.readingProgress)) {
      user.readingProgress.forEach((p: { bookId?: mongoose.Types.ObjectId | string; pagesRead?: number; updatedAt?: Date }) => {
        const bookId = p.bookId?.toString() || (typeof p.bookId === 'string' ? p.bookId : null);
        if (bookId) {
          readingProgressMap.set(bookId, {
            pagesRead: p.pagesRead || 0,
            updatedAt: p.updatedAt || null,
          });
        }
      });
    }
    console.log(`[Mobile Profile API] [${requestId}] Reading progress map created: ${readingProgressMap.size} entries`);

    // Helper function to populate book details from bookId references
    // Priority: Uses cover/title/author from bookReference if available (saved when logging), otherwise from database
    const populateBookDetails = async (bookReferences: Array<{ bookId?: mongoose.Types.ObjectId | string; cover?: string; title?: string; author?: string }>) => {
      if (!Array.isArray(bookReferences) || bookReferences.length === 0) {
        return [];
      }

      // Extract all unique book IDs
      const bookIds = bookReferences
        .map(ref => {
          const id = ref.bookId;
          if (!id) return null;
          return typeof id === 'string' ? id : id.toString();
        })
        .filter((id): id is string => Boolean(id));

      if (bookIds.length === 0) {
        return bookReferences.map(ref => ({
          ...ref,
          title: undefined,
          author: undefined,
          cover: undefined,
        }));
      }

      // Type for MongoDB lean book documents
      type BookLean = {
        _id?: mongoose.Types.ObjectId | { toString(): string } | string;
        volumeInfo?: {
          title?: string;
          authors?: string[];
          imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
            medium?: string;
            large?: string;
            extraLarge?: string;
          };
        };
        isbn?: string;
        isbn13?: string;
        openLibraryId?: string;
        isbndbId?: string;
      };

      // Batch fetch all books
      const booksMap = new Map<string, BookLean>();
      try {
        const books = await Book.find({
          _id: { $in: bookIds.map(id => new mongoose.Types.ObjectId(id)) }
        })
          .select('volumeInfo.title volumeInfo.authors volumeInfo.imageLinks isbn isbn13 openLibraryId isbndbId')
          .lean();

        (books as unknown as BookLean[]).forEach((book) => {
          if (book._id) {
            const bookId = typeof book._id === 'string' ? book._id : book._id.toString();
            booksMap.set(bookId, book);
          }
        });
      } catch (error) {
        console.error(`[Mobile Profile API] [${requestId}] Error fetching books:`, error);
      }

      // Map references to include book details
      return bookReferences.map((ref) => {
        const bookId = ref.bookId ? (typeof ref.bookId === 'string' ? ref.bookId : ref.bookId.toString()) : null;
        const book = bookId ? booksMap.get(bookId) : null;

        if (book) {
          // Priority: Use cover from bookReference if available (saved when logging), otherwise get from database
          let cover = (ref as { cover?: string }).cover; // Use cover from bookReference first (saved when logging)
          
          if (!cover) {
            // Fallback to database cover
            const imageLinks = book.volumeInfo?.imageLinks || {};
            cover = getBestBookCover(imageLinks) || 
                   "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";
          }
          
          // Ensure HTTPS for cover URL
          if (cover && cover.startsWith("http://")) {
            cover = cover.replace("http://", "https://");
          }
          
          const authors = book.volumeInfo?.authors || [];
          const author = authors.length > 0 ? authors[0] : undefined;
          const refWithDetails = ref as { title?: string; author?: string; cover?: string };
          
          return {
            ...ref,
            _id: book._id ? (typeof book._id === 'string' ? book._id : book._id.toString()) : ref.bookId?.toString(),
            title: refWithDetails.title || book.volumeInfo?.title || "Unknown Title",
            author: refWithDetails.author || author || "Unknown Author",
            authors: authors,
            cover: cover,
            isbn: book.isbn,
            isbn13: book.isbn13,
            openLibraryId: book.openLibraryId,
            isbndbId: book.isbndbId,
          };
        }

        // If book not found, use saved details from bookReference or placeholder
        const refWithDetails = ref as { title?: string; author?: string; cover?: string };
        return {
          ...ref,
          _id: ref.bookId ? (typeof ref.bookId === 'string' ? ref.bookId : ref.bookId.toString()) : undefined,
          title: refWithDetails.title || "Unknown Title",
          author: refWithDetails.author || "Unknown Author",
          authors: [],
          cover: refWithDetails.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
          isbn: undefined,
          isbn13: undefined,
          openLibraryId: undefined,
          isbndbId: undefined,
        };
      });
    };

    // Populate book details for favorites (max 4)
    console.log(`[Mobile Profile API] [${requestId}] Populating favorite books...`);
    const favoriteStartTime = Date.now();
    const favoriteBooks = Array.isArray(user.favoriteBooks) ? user.favoriteBooks : [];
    const populatedFavorites = await populateBookDetails(favoriteBooks.slice(0, 4)); // Max 4 as per requirement
    console.log(`[Mobile Profile API] [${requestId}] Favorite books populated (${Date.now() - favoriteStartTime}ms)`);

    // Populate book details for bookshelf
    console.log(`[Mobile Profile API] [${requestId}] Populating bookshelf books...`);
    const bookshelfStartTime = Date.now();
    const bookshelf = Array.isArray(user.bookshelf) ? user.bookshelf : [];
    const populatedBookshelf = await populateBookDetails(bookshelf);
    console.log(`[Mobile Profile API] [${requestId}] Bookshelf books populated (${Date.now() - bookshelfStartTime}ms)`);

    // DNF detection will be done after all population is complete

    // Populate book details for topBooks
    console.log(`[Mobile Profile API] [${requestId}] Populating top books...`);
    const topBooksStartTime = Date.now();
    const topBooks = Array.isArray(user.topBooks) ? user.topBooks : [];
    const populatedTopBooks = await populateBookDetails(topBooks);
    console.log(`[Mobile Profile API] [${requestId}] Top books populated (${Date.now() - topBooksStartTime}ms)`);

    // Populate book details for currentlyReading
    console.log(`[Mobile Profile API] [${requestId}] Populating currently reading books...`);
    const currentlyReading = Array.isArray(user.currentlyReading) ? user.currentlyReading : [];
    const populatedCurrentlyReading = await populateBookDetails(currentlyReading);

    // Populate book details for likedBooks
    console.log(`[Mobile Profile API] [${requestId}] Populating liked books...`);
    const likedBooksStartTime = Date.now();
    const likedBooks = Array.isArray(user.likedBooks) ? user.likedBooks : [];
    const populatedLikedBooks = await populateBookDetails(likedBooks);
    console.log(`[Mobile Profile API] [${requestId}] Liked books populated (${Date.now() - likedBooksStartTime}ms)`);

    // Populate book details for tbrBooks and enrich with reading progress
    console.log(`[Mobile Profile API] [${requestId}] Populating TBR books...`);
    const tbrBooks = Array.isArray(user.tbrBooks) ? user.tbrBooks : [];
    const populatedTbrBooksRaw = await populateBookDetails(tbrBooks);
    
    // Enrich TBR books with reading progress (for DNF detection)
    const populatedTbrBooks = populatedTbrBooksRaw.map((tbrBook: { bookId?: mongoose.Types.ObjectId | string; [key: string]: unknown }) => {
      const tbrBookId = tbrBook.bookId ? (typeof tbrBook.bookId === 'string' ? tbrBook.bookId : tbrBook.bookId.toString()) : null;
      const progress = tbrBookId ? readingProgressMap.get(tbrBookId) : null;
      
      return {
        ...tbrBook,
        pagesRead: progress?.pagesRead || 0,
        progressUpdatedAt: progress?.updatedAt || null,
      };
    });

    // Populate reading lists with book details
    console.log(`[Mobile Profile API] [${requestId}] Populating reading lists...`);
    const readingListsStartTime = Date.now();
    type PopulatedReadingList = Omit<IReadingList, 'books'> & {
      books?: Array<{
        _id?: string;
        volumeInfo?: {
          title?: string;
          authors?: string[];
          imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
            medium?: string;
            large?: string;
          };
        };
      }> | mongoose.Types.ObjectId[];
    };
    let populatedReadingLists: PopulatedReadingList[] = Array.isArray(user.readingLists) 
      ? user.readingLists.map(list => ({ ...list })) as unknown as PopulatedReadingList[] 
      : [];
    
    if (populatedReadingLists.length > 0) {
      try {
        populatedReadingLists = await Promise.all(
          populatedReadingLists.map(async (list) => {
            // Check if books is an array of ObjectIds (not yet populated)
            if (!list.books || !Array.isArray(list.books) || list.books.length === 0) {
              return list;
            }

            // Check if books are already populated (have volumeInfo)
            const firstBook = list.books[0];
            if (firstBook && typeof firstBook === 'object' && 'volumeInfo' in firstBook) {
              // Already populated, return as-is
              return list;
            }

            // Convert book IDs to ObjectIds (books is ObjectId[])
            const bookIds = (list.books as mongoose.Types.ObjectId[])
              .map((id: mongoose.Types.ObjectId | string) => {
                if (typeof id === 'string') {
                  return new mongoose.Types.ObjectId(id);
                }
                return id;
              })
              .filter((id): id is mongoose.Types.ObjectId => id != null);

            if (bookIds.length === 0) {
              return list;
            }

            try {
              // Fetch books for this list
              const books = await Book.find({
                _id: { $in: bookIds }
              })
                .select("volumeInfo.title volumeInfo.authors volumeInfo.imageLinks")
                .lean();

              // Map books to the format expected by iOS
              const populatedBooks = books.map((book: {
                _id?: { toString(): string } | mongoose.Types.ObjectId;
                volumeInfo?: {
                  title?: string;
                  authors?: string[];
                  imageLinks?: {
                    thumbnail?: string;
                    smallThumbnail?: string;
                    medium?: string;
                    large?: string;
                    extraLarge?: string;
                  };
                };
              }) => {
                const imageLinks = book.volumeInfo?.imageLinks || {};

                return {
                  _id: book._id?.toString(),
                  volumeInfo: {
                    title: book.volumeInfo?.title,
                    authors: book.volumeInfo?.authors || [],
                    imageLinks: {
                      thumbnail: imageLinks.thumbnail,
                      smallThumbnail: imageLinks.smallThumbnail,
                      medium: imageLinks.medium,
                      large: imageLinks.large,
                    }
                  }
                };
              });

              return {
                ...list,
                books: populatedBooks
              };
            } catch (bookError) {
              console.error(`[Mobile Profile API] [${requestId}] Failed to populate books for list ${list._id}:`, bookError);
              return list; // Return original list if population fails
            }
          })
        );
        console.log(`[Mobile Profile API] [${requestId}] Reading lists populated (${Date.now() - readingListsStartTime}ms)`);
      } catch (error) {
        console.error(`[Mobile Profile API] [${requestId}] Error populating reading lists:`, error);
        // Keep original lists if population fails
      }
    }

    // DNF detection: Match web version - includes both:
    // 1. Bookshelf books with "DNF:" prefix in thoughts (explicitly logged as DNF)
    // 2. TBR books with reading progress > 0 (automatically added via reading progress API)
    console.log(`[Mobile Profile API] [${requestId}] Identifying DNF books (matching web version logic)...`);
    type PopulatedBook = {
      bookId?: mongoose.Types.ObjectId | string;
      title?: string;
      author?: string;
      authors?: string[];
      cover?: string;
      thoughts?: string;
      reason?: string;
      finishedDate?: Date | string;
      pagesRead?: number;
      [key: string]: unknown;
    };
    
    // 1. Bookshelf books with "DNF:" prefix in thoughts (explicitly logged as DNF)
    const dnfBooksFromBookshelf = populatedBookshelf.filter((book: PopulatedBook) => {
      if (book.thoughts) {
        const thoughtsTrimmed = book.thoughts.trim();
        return thoughtsTrimmed.toLowerCase().startsWith("dnf:");
      }
      return false;
    });
    
    // 2. TBR books with reading progress > 0 (automatically added via reading progress API)
    const dnfBooksFromTbr = populatedTbrBooks.filter((book: PopulatedBook) => {
      const pagesRead = book.pagesRead || 0;
      return pagesRead > 0;
    });
    
    // Combine both sources and deduplicate by bookId
    const dnfBooksMap = new Map<string, PopulatedBook>();
    
    // Add bookshelf DNF books
    dnfBooksFromBookshelf.forEach((book: PopulatedBook) => {
      const bookId = book.bookId ? (typeof book.bookId === 'string' ? book.bookId : book.bookId.toString()) : null;
      if (bookId) {
        dnfBooksMap.set(bookId, book);
      }
    });
    
    // Add TBR books with progress (don't overwrite if already in map from bookshelf)
    dnfBooksFromTbr.forEach((book: PopulatedBook) => {
      const bookId = book.bookId ? (typeof book.bookId === 'string' ? book.bookId : book.bookId.toString()) : null;
      if (bookId && !dnfBooksMap.has(bookId)) {
        dnfBooksMap.set(bookId, book);
      }
    });
    
    const dnfBooks = Array.from(dnfBooksMap.values());
    console.log(`[Mobile Profile API] [${requestId}] Found ${dnfBooks.length} DNF books total:`);
    console.log(`[Mobile Profile API] [${requestId}]   - ${dnfBooksFromBookshelf.length} from bookshelf (explicit DNF)`);
    console.log(`[Mobile Profile API] [${requestId}]   - ${dnfBooksFromTbr.length} from TBR (with reading progress)`);
    
    // Log sample DNF books for debugging
    if (dnfBooks.length > 0) {
      console.log(`[Mobile Profile API] [${requestId}] Sample DNF books:`, dnfBooks.slice(0, 3).map((b: PopulatedBook) => ({
        title: b.title,
        thoughts: b.thoughts?.substring(0, 50),
        reason: b.reason
      })));
    } else {
      // Log sample bookshelf books to help debug why DNF detection isn't working
      console.log(`[Mobile Profile API] [${requestId}] Sample bookshelf books (for DNF debugging):`, populatedBookshelf.slice(0, 3).map((b: PopulatedBook) => ({
        title: b.title,
        hasThoughts: !!b.thoughts,
        thoughts: b.thoughts?.substring(0, 50),
        hasReason: !!b.reason,
        reason: b.reason
      })));
    }

    // Build response
    const responseData = {
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        birthday: user.birthday,
        gender: user.gender,
        pronouns: Array.isArray(user.pronouns) ? user.pronouns : [],
        links: Array.isArray(user.links) ? user.links : [],
        isPublic: user.isPublic ?? true,
        
        // Books & Reading - with populated book details
        topBooks: populatedTopBooks,
        favoriteBooks: populatedFavorites,
        bookshelf: populatedBookshelf,
        dnfBooks: dnfBooks, // Separate DNF books array for easy access
        likedBooks: populatedLikedBooks, // Populated liked books with full details
        tbrBooks: populatedTbrBooks,
        currentlyReading: populatedCurrentlyReading,
        readingLists: populatedReadingLists,
        
        // Statistics
        totalBooksRead: user.totalBooksRead ?? 0,
        totalPagesRead: user.totalPagesRead ?? 0,
        followers: Array.isArray(user.followers) ? user.followers.map((id) => String(id)) : [],
        following: Array.isArray(user.following) ? user.following.map((id) => String(id)) : [],
        
        // Diary Entries
        diaryEntries: Array.isArray(user.diaryEntries) ? user.diaryEntries.map((entry: IDiaryEntry & { _id?: mongoose.Types.ObjectId | string }) => {
          const entryId = entry._id ? (typeof entry._id === 'string' ? entry._id : entry._id.toString()) : undefined;
          return {
            id: entryId,
            _id: entryId,
            bookId: entry.bookId ? (typeof entry.bookId === 'string' ? entry.bookId : entry.bookId.toString()) : null,
            bookTitle: entry.bookTitle || null,
            bookAuthor: entry.bookAuthor || null,
            bookCover: entry.bookCover || null,
            subject: entry.subject || null,
            content: entry.content || '',
            createdAt: entry.createdAt ? (entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt) : new Date().toISOString(),
            updatedAt: entry.updatedAt ? (entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt) : new Date().toISOString(),
            likesCount: Array.isArray(entry.likes) ? entry.likes.length : 0,
            isLiked: false, // Will be set based on current user if needed
          };
        }).sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA; // Newest first
        }) : [],
      },
    };

    console.log(`[Mobile Profile API] [${requestId}] Response data structure:`, {
      hasUser: !!responseData.user,
      userId: responseData.user.id,
      username: responseData.user.username,
      email: responseData.user.email,
      topBooksCount: responseData.user.topBooks.length,
      favoriteBooksCount: responseData.user.favoriteBooks.length,
      bookshelfCount: responseData.user.bookshelf.length,
      readingListsCount: responseData.user.readingLists.length,
      dnfCount: dnfBooks.length,
      diaryEntriesCount: responseData.user.diaryEntries.length,
      readingListsWithBooks: responseData.user.readingLists.filter((list) => list.books && Array.isArray(list.books) && list.books.length > 0).length,
    });
    
    // Log reading lists details for debugging
    if (responseData.user.readingLists.length > 0) {
      console.log(`[Mobile Profile API] [${requestId}] Reading lists details:`, responseData.user.readingLists.map((list) => {
        const firstBook = list.books?.[0];
        const firstBookTitle = firstBook && typeof firstBook === 'object' && 'volumeInfo' in firstBook 
          ? (firstBook as { volumeInfo?: { title?: string } }).volumeInfo?.title 
          : undefined;
        return {
          id: list._id,
          title: list.title,
          booksCount: list.books?.length || 0,
          hasBooks: !!(list.books && list.books.length > 0),
          firstBookTitle
        };
      }));
    } else {
      console.log(`[Mobile Profile API] [${requestId}] No reading lists found in user data`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Profile API] [${requestId}] ✅ SUCCESS: Returning profile (total time: ${totalTime}ms)`);
    console.log(`[Mobile Profile API] [${requestId}] === REQUEST END ===`);
    console.log("=".repeat(80));

    return NextResponse.json(responseData);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Profile API] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Profile API] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Profile API] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Profile API] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      { error: "Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

