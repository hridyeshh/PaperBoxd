import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";

/**
 * Search for authors from books in the database
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

    // Connect to database
    await connectDB();

    // Search for authors from books
    // We'll aggregate unique authors from books that match the search
    const books = await Book.find({
      "volumeInfo.authors": { $regex: query.trim(), $options: "i" },
    })
      .select("volumeInfo.authors volumeInfo.imageLinks")
      .limit(50) // Get more books to find unique authors
      .lean();

    // Extract unique authors with their book covers
    const authorMap = new Map<string, { name: string; cover?: string }>();

    books.forEach((book: any) => {
      const authors = book.volumeInfo?.authors || [];
      const cover =
        book.volumeInfo?.imageLinks?.thumbnail ||
        book.volumeInfo?.imageLinks?.smallThumbnail;

      authors.forEach((author: string) => {
        // Case-insensitive match
        if (author.toLowerCase().includes(query.trim().toLowerCase())) {
          if (!authorMap.has(author)) {
            authorMap.set(author, {
              name: author,
              cover: cover || undefined,
            });
          } else {
            // If we don't have a cover yet, use this one
            const existing = authorMap.get(author);
            if (existing && !existing.cover && cover) {
              existing.cover = cover;
            }
          }
        }
      });
    });

    // Convert map to array and limit results
    const authorsList = Array.from(authorMap.values())
      .slice(0, limit)
      .map((author, index) => ({
        id: `author-${index}`,
        name: author.name,
        cover: author.cover,
      }));

    return NextResponse.json({
      authors: authorsList,
      count: authorsList.length,
    });
  } catch (error) {
    console.error("Author search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search authors",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

