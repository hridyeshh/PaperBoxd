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
    cover:
      il.large ||
      il.medium ||
      il.thumbnail ||
      il.smallThumbnail ||
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
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
