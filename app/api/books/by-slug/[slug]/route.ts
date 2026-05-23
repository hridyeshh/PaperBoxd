import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json({ error: "Book slug is required" }, { status: 400 });
  }

  const { data, status } = await bookApi.getBySlug(slug);

  if (status === 404) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to fetch book" }, { status });
  }

  const book = data as Record<string, unknown>;
  return NextResponse.json({
    ...book,
    _id: book._id ?? book.id,
    bookId: (book as { bookId?: unknown }).bookId ?? book.id,
  });
}
