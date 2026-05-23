import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

const DEFAULT_GENRES = [
  "fiction",
  "mystery",
  "thriller",
  "fantasy",
  "science fiction",
  "romance",
  "historical fiction",
  "biography",
  "non-fiction",
  "young adult",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(40, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const genreIndex = (page - 1) % DEFAULT_GENRES.length;
  const genreCycle = Math.floor((page - 1) / DEFAULT_GENRES.length);
  const genre = DEFAULT_GENRES[genreIndex];
  const pageWithinGenre = genreCycle + 1;

  const { data, status } = await bookApi.search(genre, pageWithinGenre, limit);

  if (status >= 400) {
    return NextResponse.json({
      books: [],
      page,
      hasMore: false,
      genre,
      source: "isbndb",
    });
  }

  type GoBook = {
    id?: string;
    isbndbId?: string;
    googleBooksId?: string;
    volumeInfo?: {
      title?: string;
      authors?: string[];
      description?: string;
      publishedDate?: string;
      imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string };
      averageRating?: number;
      ratingsCount?: number;
      pageCount?: number;
      categories?: string[];
      publisher?: string;
    };
    apiSource?: string;
  };

  const result = data as { items?: GoBook[]; source?: string } | null;
  const items = result?.items ?? [];
  const seen = new Set<string>();

  const books = items
    .filter((b) => b.volumeInfo?.imageLinks?.thumbnail && b.volumeInfo?.title && (b.volumeInfo?.authors?.length ?? 0) > 0)
    .map((b) => {
      const id = b.isbndbId ?? b.id ?? "";
      const title = b.volumeInfo?.title ?? "Unknown Title";
      const author = b.volumeInfo?.authors?.[0] ?? "Unknown Author";
      return {
        id,
        _id: id,
        isbndbId: b.isbndbId,
        title,
        author,
        authors: b.volumeInfo?.authors ?? [],
        description: b.volumeInfo?.description ?? "",
        publishedDate: b.volumeInfo?.publishedDate ?? "",
        cover:
          b.volumeInfo?.imageLinks?.thumbnail ??
          b.volumeInfo?.imageLinks?.smallThumbnail ??
          b.volumeInfo?.imageLinks?.medium ??
          "",
        averageRating: b.volumeInfo?.averageRating,
        ratingsCount: b.volumeInfo?.ratingsCount,
        pageCount: b.volumeInfo?.pageCount,
        categories: b.volumeInfo?.categories ?? [],
        publisher: b.volumeInfo?.publisher,
      };
    })
    .filter((b) => {
      const key = `${b.title.toLowerCase().trim()}|${b.author.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return NextResponse.json({
    books,
    page,
    hasMore: true,
    count: books.length,
    genre,
    source: result?.source ?? "isbndb",
  });
}
