import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeBook(data: unknown) {
  const book = data as Record<string, unknown>;
  return NextResponse.json({
    ...book,
    _id: book._id ?? book.id,
    bookId: (book as { bookId?: unknown }).bookId ?? book.id,
  });
}

/**
 * GET /api/books/[id]
 *
 * Accepts three ID formats:
 *  - Go UUID  → direct lookup via /api/v1/books/{id}
 *  - Go slug  → forwarded to /api/v1/books/by-slug/{id}
 *  - MongoDB ObjectId (24 hex, no hyphens) → forwarded to by-slug which
 *    falls back through title search + ISBNdb + Google Books
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
  }

  // 1. UUID → direct Go lookup
  if (UUID_RE.test(id)) {
    const { data, status } = await bookApi.getById(id);
    if (status < 400) return normalizeBook(data);
    if (status === 404) {
      // UUID exists but not in DB — fall through to slug lookup
    } else {
      return NextResponse.json({ error: "Failed to fetch book" }, { status });
    }
  }

  // 2. Everything else (Go slug, MongoDB ObjectId, ISBNdb ID, etc.) → by-slug
  const { data, status } = await bookApi.getBySlug(id);
  if (status < 400) return normalizeBook(data);
  if (status === 404) return NextResponse.json({ error: "Book not found" }, { status: 404 });
  return NextResponse.json({ error: "Failed to fetch book" }, { status });
}
