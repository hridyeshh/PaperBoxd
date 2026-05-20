import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

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
