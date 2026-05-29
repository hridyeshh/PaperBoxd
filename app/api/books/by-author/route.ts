import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23374151'/%3E%3Crect x='0' y='0' width='16' height='300' fill='%231f2937'/%3E%3Crect x='16' y='0' width='2' height='300' fill='%234b5563'/%3E%3Crect x='50' y='110' width='100' height='80' rx='6' fill='none' stroke='%234b5563' stroke-width='2'/%3E%3Cline x1='65' y1='135' x2='135' y2='135' stroke='%234b5563' stroke-width='1.5'/%3E%3Cline x1='65' y1='150' x2='120' y2='150' stroke='%234b5563' stroke-width='1.5'/%3E%3Cline x1='65' y1='165' x2='105' y2='165' stroke='%234b5563' stroke-width='1.5'/%3E%3C/svg%3E";

type GoBook = {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      large?: string;
      medium?: string;
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const author = searchParams.get("author");
  const excludeBookId = searchParams.get("excludeBookId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  if (!author) {
    return NextResponse.json({ error: "Author name is required" }, { status: 400 });
  }

  // Fetch one extra to absorb the excluded book if present
  const { data, status } = await bookApi.getByAuthor(author, 1, excludeBookId ? limit + 1 : limit);
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to fetch books by author" }, { status });
  }

  const goData = data as { items?: GoBook[] };
  const books = (goData.items ?? [])
    .filter((b) => !excludeBookId || b.id !== excludeBookId)
    .slice(0, limit)
    .map((b) => {
      const vi = b.volumeInfo ?? {};
      const il = vi.imageLinks ?? {};
      return {
        id: b.id,
        title: vi.title ?? "Unknown Title",
        author: vi.authors?.[0] ?? "Unknown Author",
        cover:
          il.large ||
          il.medium ||
          il.thumbnail ||
          il.smallThumbnail ||
          "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
      };
    });

  return NextResponse.json({ books, author, count: books.length });
}
