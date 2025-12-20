import { NextRequest, NextResponse } from "next/server";
import { searchAuthors } from "@/lib/api/isbndb";

// This route relies on dynamic query parameters and external APIs.
// Mark it as dynamic so it is not treated as a static route during export.
export const dynamic = "force-dynamic";

/**
 * Search for authors using ISBNdb API
 *
 * Query Parameters:
 * - q: Search query (required)
 * - limit: Number of results (default: 10, max: 20)
 *
 * Example: /api/authors/search?q=rowling&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10"),
      20
    );

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    try {
      // Search authors using ISBNdb API
      const result = await searchAuthors(query.trim(), 1, limit);
      
      // Transform the results to a consistent format
      // ISBNdb returns authors in format: { author: "Author Name" }
      type AuthorInput = { author?: string; name?: string } | string;
      type AuthorOutput = { id: string; name: string } | null;
      
      const authors = (result.authors || []).map((author: AuthorInput): AuthorOutput => {
        // Handle different possible response structures
        const authorName = typeof author === 'object' 
          ? (author.author || author.name || '')
          : (typeof author === 'string' ? author : '');
        
        if (!authorName || authorName.trim() === '') {
          return null; // Skip invalid entries
        }
        
        return {
          id: authorName,
          name: authorName.trim(),
        };
      }).filter((author: AuthorOutput): author is { id: string; name: string } => author !== null); // Filter out null entries

      return NextResponse.json({
        authors: authors,
        count: authors.length,
        total: result.total || authors.length,
      });
    } catch (apiError) {
      console.error("Author search API error:", apiError);
      
      // If ISBNdb API fails, return empty results instead of error
      // This allows the UI to show "no results" rather than an error
      return NextResponse.json({
        authors: [],
        count: 0,
        total: 0,
        error: apiError instanceof Error ? apiError.message : "Failed to search authors",
      }, { status: 200 });
    }
  } catch (error) {
    console.error("Author search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search authors",
        details: error instanceof Error ? error.message : "Unknown error",
        authors: [],
        count: 0,
        total: 0,
      },
      { status: 500 }
    );
  }
}

