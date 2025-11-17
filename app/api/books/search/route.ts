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
 *
 * Example: /api/books/search?q=harry+potter&maxResults=10
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

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // First, try to find books in our database using text search
    // If text index doesn't exist, this will fail gracefully and fall back to regex search
    let cachedBooks: any[] = [];
    try {
      cachedBooks = await Book.find(
        {
          $text: { $search: query },
        },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(maxResults)
        .skip(startIndex)
        .exec();
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
            const existingIds = new Set(cachedBooks.map(b => b._id.toString()));
            const additionalBooks = scoredBooks
              .filter((b: any) => !existingIds.has(b._id.toString()) && b._matchScore > 0)
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
          id: book.isbndbId || book.openLibraryId,
          volumeInfo: book.volumeInfo,
          saleInfo: book.saleInfo,
          apiSource: book.apiSource,
          fromCache: true,
        })),
      });
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
