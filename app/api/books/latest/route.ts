import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

type GoBook = {
  id: string;
  _id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    publisher?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: {
      large?: string;
      medium?: string;
      thumbnail?: string;
      smallThumbnail?: string;
      extraLarge?: string;
    };
  };
};

function flattenBook(b: GoBook) {
  const vi = b.volumeInfo ?? {};
  const il = vi.imageLinks ?? {};
  const cover =
    il.large ||
    il.medium ||
    il.thumbnail ||
    il.smallThumbnail ||
    il.extraLarge ||
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";
  return {
    id: b.id,
    _id: b._id ?? b.id,
    title: vi.title ?? "Untitled",
    authors: vi.authors ?? [],
    description: vi.description ?? "",
    publishedDate: vi.publishedDate ?? "",
    cover,
    averageRating: vi.averageRating,
    ratingsCount: vi.ratingsCount,
    pageCount: vi.pageCount,
    categories: vi.categories ?? [],
    publisher: vi.publisher,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "10")), 50);

  const { data, status } = await bookApi.getLatest(page, pageSize);
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to fetch latest books" }, { status });
  }

  const goData = data as { items?: GoBook[]; totalItems?: number };
  const books = (goData.items ?? []).map(flattenBook);
  const total = goData.totalItems ?? books.length;

  return NextResponse.json({
    books,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
