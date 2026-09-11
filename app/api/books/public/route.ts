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

function toCarouselBook(b: GoBook) {
  const vi = b.volumeInfo ?? {};
  const il = vi.imageLinks ?? {};
  return {
    id: b.id,
    title: vi.title ?? "Unknown Title",
    author: vi.authors?.[0] ?? "Unknown Author",
    // No stock-photo fallback — see the note in /api/books/by-author.
    cover: il.large || il.medium || il.thumbnail || il.smallThumbnail || "",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "popular";

  const { data, status } = await bookApi.getPublic();
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to fetch books" }, { status });
  }

  const goData = data as { new_releases?: GoBook[]; popular?: GoBook[] };
  const source = type === "newly-published" ? (goData.new_releases ?? []) : (goData.popular ?? []);
  const books = source.map(toCarouselBook);

  return NextResponse.json({ books, type, count: books.length });
}
