import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";
import {
  searchISBNdbWithFallback,
  transformISBNdbBook,
} from "@/lib/api/isbndb";
import {
  searchOpenLibraryWithFallback,
  transformOpenLibraryBook,
} from "@/lib/api/open-library";

/**
 * Search for books using ISBNdb API (primary) with Open Library fallback
 *
 * Search Strategy:
 * 1. Check database cache first
 * 2. Try ISBNdb API (premium, high-quality data)
 * 3. Fallback to Open Library API
 *
 * Query Parameters:
 * - q: Search query (required)
 * - maxResults: Number of results (default: 10, max: 40)
 * - startIndex: Pagination offset (default: 0)
 * - forceFresh: If "true", bypass cache and always query external APIs (default: false)
 *
 * Example: /api/books/search?q=harry+potter&maxResults=10&forceFresh=true
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const maxResults = Math.min(
      parseInt(searchParams.get("maxResults") || "10"),
      40
    );
    const startIndex = parseInt(searchParams.get("startIndex") || "0");
    const forceFresh = searchParams.get("forceFresh") === "true";

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // If forceFresh is true, skip cache and go straight to APIs
    if (forceFresh) {
      console.log(`[Search] 🔄 Force fresh mode: bypassing cache for query: "${query}"`);
    } else {
    // First, try to find books in our database using text search
    // If text index doesn't exist, this will fail gracefully and fall back to regex search
    let cachedBooks: any[] = [];
    try {
      const textSearchResults = await Book.find(
        {
          $text: { $search: query },
        },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(maxResults * 2) // Get more to filter by minimum score
        .skip(startIndex)
        .exec();
      
      // Filter by minimum text score to ensure relevance (at least 1.0 score)
      // This prevents random books from being returned
      cachedBooks = textSearchResults.filter((book: any) => {
        const score = (book as any).score || 0;
        return score >= 1.0; // Minimum relevance threshold
      }).slice(0, maxResults);
    } catch (textSearchError) {
      // Text index might not exist - use regex search instead
      console.log("Text search not available, using regex search:", textSearchError instanceof Error ? textSearchError.message : "Unknown error");
    }

    // If text search returned few results, supplement with regex-based partial matching
    // This handles cases like "a lord of the ring" matching "The Lord of the Rings"
    if (cachedBooks.length < maxResults) {
      try {
        // Normalize the query: remove extra spaces, convert to lowercase for matching
        const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
        
        // Escape special regex characters but keep the query flexible
        const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Split query into individual words for better matching
        const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
        
        // Filter out very short words (articles, prepositions) that don't help with matching
        const significantWords = queryWords.filter(word => word.length > 2 || queryWords.length === 1);
        
        // If no significant words, skip regex search
        if (significantWords.length === 0) {
          console.log("No significant words in query, skipping regex search");
        } else {
          // Build search conditions: match if all significant words appear in the title
          // This handles cases like "a lord of the ring" -> matches "The Lord of the Rings"
          const searchConditions: any[] = [
            // Simple partial match: query appears anywhere in title
            { "volumeInfo.title": { $regex: escapedQuery, $options: "i" } },
          ];
          
          // If we have multiple significant words, also search for books where all words appear
          if (significantWords.length > 1) {
            // Use $and to ensure all significant words appear in the title
            const wordConditions = significantWords.map(word => {
              try {
                const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return { "volumeInfo.title": { $regex: escapedWord, $options: "i" } };
              } catch (err) {
                console.warn(`Failed to create regex for word "${word}":`, err);
                return null;
              }
            }).filter(Boolean);
            
            if (wordConditions.length > 0) {
              searchConditions.push({
                $and: wordConditions,
              });
            }
          }
          
          // Also try matching individual significant words (for very loose matching)
          if (significantWords.length > 1) {
            significantWords.forEach(word => {
              try {
                const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchConditions.push({
                  "volumeInfo.title": { $regex: escapedWord, $options: "i" }
                });
              } catch (err) {
                console.warn(`Failed to create regex for word "${word}":`, err);
              }
            });
          }
          
          // Search with regex for partial matching
          try {
            const regexBooks = await Book.find({
              $or: [
                ...searchConditions,
                // Also match in authors
                { "volumeInfo.authors": { $regex: escapedQuery, $options: "i" } },
              ],
            })
              .limit(maxResults * 3) // Get more results to sort and dedupe
              .lean();

            // Filter results: prioritize books where all significant words appear
            let allWordsRegex: RegExp | null = null;
            try {
              if (significantWords.length > 1) {
                allWordsRegex = new RegExp(
                  significantWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*'),
                  'i'
                );
              }
            } catch (regexErr) {
              console.warn("Failed to create allWordsRegex:", regexErr);
            }

            const scoredBooks = regexBooks.map((book: any) => {
              const title = (book.volumeInfo?.title || '').toLowerCase();
              let score = 0;
              
              // Higher score if all significant words appear
              if (allWordsRegex && allWordsRegex.test(title)) {
                score += 10;
              }
              
              // Higher score if exact query appears
              if (title.includes(normalizedQuery)) {
                score += 5;
              }
              
              // Score based on how many words match
              significantWords.forEach(word => {
                if (title.includes(word)) {
                  score += 1;
                }
              });
              
              return { ...book, _matchScore: score };
            });

            // Sort by match score (highest first), then by title
            scoredBooks.sort((a: any, b: any) => {
              if (b._matchScore !== a._matchScore) {
                return b._matchScore - a._matchScore;
              }
              return (a.volumeInfo?.title || '').localeCompare(b.volumeInfo?.title || '');
            });

            // Merge and deduplicate results
            // Only include books with meaningful match score (at least 2 points)
            // This ensures we don't return random books that barely match
            const existingIds = new Set(cachedBooks.map(b => b._id.toString()));
            const additionalBooks = scoredBooks
              .filter((b: any) => {
                const isNotDuplicate = !existingIds.has(b._id.toString());
                const hasGoodMatch = b._matchScore >= 2; // Minimum match threshold
                return isNotDuplicate && hasGoodMatch;
              })
              .slice(0, maxResults - cachedBooks.length)
              .map(({ _matchScore, ...book }: any) => book); // Remove score before returning

            // Add to cached books
            cachedBooks = [...cachedBooks, ...additionalBooks];
          } catch (dbError) {
            console.warn("Database query failed in regex search:", dbError instanceof Error ? dbError.message : "Unknown error");
            // Continue without regex results - not critical
          }
        }
      } catch (regexError) {
        console.warn("Regex search failed (non-critical):", regexError instanceof Error ? regexError.message : "Unknown error");
        // Don't throw - this is a supplement search, not critical
      }
    }

    // If we have enough cached results, return them
    if (cachedBooks.length >= maxResults) {
      console.log(`[Search] ✅ Found ${cachedBooks.length} books in database cache for query: "${query}"`);
      
      // Check for stale books (7 days old) and refresh them in the background
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const staleBooks = cachedBooks.filter((book: any) => {
        return new Date(book.cachedAt) < sevenDaysAgo;
      });

      // Refresh stale books in the background (don't block the response)
      if (staleBooks.length > 0) {
        console.log(`[Search] 🔄 Found ${staleBooks.length} stale books, refreshing in background...`);
        // Refresh stale books asynchronously - don't await to avoid blocking
        Promise.all(
          staleBooks.map(async (book: any) => {
            try {
              // Re-fetch from the original API source using the book's title
              if (book.apiSource === "isbndb" && book.volumeInfo?.title) {
                const result = await searchISBNdbWithFallback(book.volumeInfo.title, 1, 1);
                if (result.success && result.data?.books?.length > 0) {
                  const transformed = transformISBNdbBook(result.data.books[0]);
                  await Book.findOrCreateFromISBNdb(transformed);
                  console.log(`[Search] ✅ Refreshed stale ISBNdb book: ${book.volumeInfo.title}`);
                }
              } else if (book.apiSource === "open_library" && book.volumeInfo?.title) {
                const result = await searchOpenLibraryWithFallback(book.volumeInfo.title, 1, 0);
                if (result.success && result.data?.docs?.length > 0) {
                  const transformed = transformOpenLibraryBook(result.data.docs[0]);
                  await Book.findOrCreateFromOpenLibrary(transformed);
                  console.log(`[Search] ✅ Refreshed stale Open Library book: ${book.volumeInfo.title}`);
                }
              }
            } catch (refreshError) {
              console.warn(`Failed to refresh stale book ${book._id}:`, refreshError);
              // Don't fail - just log the error
            }
          })
        ).catch((error) => {
          console.warn("Background book refresh failed:", error);
        });
      }

      // Update last accessed for cached books using updateOne (safer than .save())
      await Promise.all(
        cachedBooks.map((book) =>
          Book.updateOne(
            { _id: book._id },
            {
              $set: { lastAccessed: new Date() },
              $inc: { usageCount: 1 }
            }
          )
        )
      ).catch((updateError) => {
        // Don't fail the request if stats update fails
        console.warn("Failed to update book access stats:", updateError);
      });

      return NextResponse.json({
        kind: "books#volumes",
        totalItems: cachedBooks.length,
        items: cachedBooks.map((book) => ({
          id: book.isbndbId || book.openLibraryId || book._id?.toString() || '',
          _id: book._id?.toString(), // Also include _id for reference
          volumeInfo: book.volumeInfo,
          saleInfo: book.saleInfo,
          apiSource: book.apiSource,
          fromCache: true,
        })),
      });
      }
    }

    // Step 2: Try ISBNdb API first (premium, high-quality data)
    console.log(`[Search] 🔍 Attempting ISBNdb API for query: "${query}"`);
    const isbndbResult = await searchISBNdbWithFallback(
      query,
      1, // ISBNdb uses 1-indexed pages
      maxResults
    );

    if (isbndbResult.success && isbndbResult.data) {
      const transformedBooks = isbndbResult.data.books.map(transformISBNdbBook);

      // Cache the results in our database
      await Promise.all(
        transformedBooks.map(async (book: any) => {
          try {
            await Book.findOrCreateFromISBNdb(book);
          } catch (error) {
            console.error(`Failed to cache ISBNdb book ${book.isbndbId}:`, error);
          }
        })
      );

      console.log(`[Search] ✅ SUCCESS: ISBNdb API returned ${transformedBooks.length} results for query: "${query}"`);

      return NextResponse.json({
        kind: "books#volumes",
        totalItems: isbndbResult.data.total,
        items: transformedBooks.map((book: any) => ({
          id: book.isbndbId,
          isbndbId: book.isbndbId, // Include explicitly for easier access
          volumeInfo: book.volumeInfo,
          apiSource: "isbndb",
          fromCache: false,
        })),
      });
    }

    // Step 3: Fallback to Open Library API
    console.log(`[Search] ❌ ISBNdb failed or returned no results. 🔍 Attempting Open Library API for query: "${query}"`);
    const openLibraryResult = await searchOpenLibraryWithFallback(
      query,
      maxResults,
      startIndex
    );

    if (openLibraryResult.success && openLibraryResult.data) {
      const transformedBooks = openLibraryResult.data.docs.map(transformOpenLibraryBook);

      // Cache the results in our database
      await Promise.all(
        transformedBooks.map(async (book: any) => {
          try {
            await Book.findOrCreateFromOpenLibrary(book);
          } catch (error) {
            console.error(`Failed to cache Open Library book ${book.openLibraryId}:`, error);
          }
        })
      );

      console.log(`[Search] ✅ SUCCESS: Open Library API returned ${transformedBooks.length} results for query: "${query}"`);

      return NextResponse.json({
        kind: "books#volumes",
        totalItems: openLibraryResult.data.numFound,
        items: transformedBooks.map((book: any) => ({
          id: book.openLibraryId,
          openLibraryId: book.openLibraryId, // Include explicitly for easier access
          volumeInfo: book.volumeInfo,
          apiSource: "open_library",
          fromCache: false,
        })),
      });
    }

    // No results from ISBNdb or Open Library - return empty results
    console.log(`[Search] ❌ No results found from ISBNdb or Open Library for query: "${query}"`);
    return NextResponse.json(
      {
        error: "No search results found",
        details: "ISBNdb and Open Library APIs returned no results for this query.",
        items: [],
        kind: "books#volumes",
        totalItems: 0,
        apiSource: null,
      },
      { status: 200 } // Return 200 with empty results
    );
  } catch (error) {
    console.error("Book search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search books",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
