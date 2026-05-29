import { NextRequest, NextResponse } from "next/server";
import { bookshelfApi, favoritesApi, goFetchAuthed, userApi } from "@/lib/api/endpoints";
import { getSession } from "@/lib/auth/jwt-session";
import { recordActivity, STREAK_COOKIE_OPTIONS } from "@/lib/streak";
import { extractGoError } from "@/lib/api/error";

function isPostgresBookUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

/** Strip to 10- or 13-digit ISBN for Go ISBNdb lookup. */
function normalizeIsbnForGo(s: string): string | null {
  const d = s.replace(/\D/g, "");
  if (d.length === 13 || d.length === 10) return d;
  if (d.length > 13) return d.slice(-13);
  return null;
}

/**
 * Go /books/:id/like only accepts a Postgres `books.id` (UUID). Resolve from ISBN or Google volume id via POST /api/v1/books.
 * Priority: PG UUID → ISBN → Google Books ID → book_id treated as ISBN or Google ID directly.
 */
type ResolveResult =
  | { ok: true; uuid: string }
  | { ok: false; status: number; message: string };

async function resolvePostgresBookIDForLike(params: {
  book_id?: string;
  isbn?: string;
  google_books_id?: string;
}): Promise<ResolveResult> {
  const id = (params.book_id ?? "").trim();
  if (isPostgresBookUUID(id)) return { ok: true, uuid: id };

  let rawIsbn = (params.isbn ?? "").trim();
  let g = (params.google_books_id ?? "").trim();

  // If no isbn/google_books_id was explicitly sent, try interpreting book_id directly:
  // - could be a bare ISBN (10 or 13 digits)
  // - could be a Google Books volume ID (alphanumeric, not a Mongo 24-char hex)
  if (!rawIsbn && !g && id) {
    const isbnFromId = normalizeIsbnForGo(id);
    const isMongo24 = /^[0-9a-f]{24}$/i.test(id);
    if (isbnFromId) {
      rawIsbn = isbnFromId;
    } else if (!isMongo24 && /^[A-Za-z0-9_-]{6,}$/.test(id)) {
      g = id;
    }
  }

  const isbnNorm = rawIsbn ? normalizeIsbnForGo(rawIsbn) : null;
  if (!isbnNorm && !g) {
    return {
      ok: false,
      status: 400,
      message:
        "Could not resolve this book. Send a Postgres book UUID as bookId, or an ISBN / Google Books volume id.",
    };
  }
  const body = isbnNorm ? { isbn: isbnNorm } : { google_books_id: g };
  const { data, status } = await goFetchAuthed("/api/v1/books", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (status >= 400) {
    const err = data as { error?: { message?: string }; message?: string };
    return {
      ok: false,
      status,
      message: extractGoError(err, `Book lookup failed (${status})`),
    };
  }
  const row = data as { id?: string };
  const rid = (row?.id ?? "").trim();
  if (!isPostgresBookUUID(rid)) {
    return { ok: false, status: 502, message: "Book lookup returned an invalid id" };
  }
  return { ok: true, uuid: rid };
}

/**
 * Add a book to a user's collection.
 *
 * POST /api/users/[username]/books
 * Body: {
 *   googleBooksId?: string,
 *   isbn?: string,
 *   book_id?: string,
 *   type: "bookshelf" | "tbr" | "liked" | "favorite" | "currently_reading",
 *   status?: "read" | "reading" | "to-read",   // for bookshelf
 *   rating?: number,
 *   finishedOn?: string,
 *   ...
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const raw = (await request.json()) as Record<string, unknown>;
    const type = raw.type as string | undefined;
    const rawGoogle = (raw.googleBooksId ?? raw.google_books_id) as string | undefined;
    let isbn = (raw.isbn ?? raw.isbndbId) as string | undefined;
    let googleForGo = rawGoogle;
    let book_id: string | undefined;

    // The client sometimes sends an ISBN or Google Books volume ID in `bookId`
    // (because book.id can be any of those). Only forward as book_id when it's a
    // valid Postgres UUID — otherwise promote it to isbn/google_books_id so the
    // Go backend doesn't try to uuid.Parse() a non-UUID and reject the request.
    const rawBookId = (raw.book_id ?? raw.bookId) as string | undefined;
    if (rawBookId) {
      const trimmed = rawBookId.trim();
      if (isPostgresBookUUID(trimmed)) {
        book_id = trimmed;
      } else {
        const isbnFromId = normalizeIsbnForGo(trimmed);
        if (!isbn && isbnFromId) {
          isbn = isbnFromId;
        } else if (!googleForGo && !isbnFromId && /^[A-Za-z0-9_-]{6,20}$/.test(trimmed) && !/^[0-9a-f]{24}$/i.test(trimmed)) {
          googleForGo = trimmed;
        }
      }
    }

    const rest = raw;

    if (!username || !type) {
      return NextResponse.json({ error: "Username and type are required" }, { status: 400 });
    }

    // Map old "type" values to Go backend endpoints
    switch (type) {
      case "bookshelf": {
        // Map to Go bookshelf with status "read"
        const goBody: Record<string, unknown> = { status: (rest.status as string) ?? "read" };
        if (googleForGo) goBody.google_books_id = googleForGo;
        if (isbn) goBody.isbn = isbn;
        if (book_id) goBody.book_id = book_id;
        if (rest.rating !== undefined) goBody.rating = rest.rating;
        if (rest.finishedOn) goBody.finished_at = rest.finishedOn;

        const { data, status } = await bookshelfApi.add(username, goBody);
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to add to bookshelf") }, { status });
        }
        // Marking a book as read counts as a reading activity
        {
          const session = await getSession();
          const userId = session.user?.id;
          if (userId) {
            const { result, cookieName, cookieValue } = await recordActivity(userId);
            const res = NextResponse.json({ message: "Book added to bookshelf successfully", ...(data as object), streak: result.streak });
            res.cookies.set(cookieName, cookieValue, STREAK_COOKIE_OPTIONS);
            return res;
          }
        }
        return NextResponse.json({ message: "Book added to bookshelf successfully", ...(data as object) });
      }

      case "tbr": {
        // Map to Go bookshelf with status "to-read"
        const goBody: Record<string, unknown> = { status: "to-read" };
        if (googleForGo) goBody.google_books_id = googleForGo;
        if (isbn) goBody.isbn = isbn;
        if (book_id) goBody.book_id = book_id;
        if (rest.urgency) goBody.tbr_priority = rest.urgency;
        if (rest.whyNow) goBody.tbr_notes = rest.whyNow;

        const { data, status } = await bookshelfApi.add(username, goBody);
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to add to TBR") }, { status });
        }
        return NextResponse.json({ message: "Book added to TBR successfully", ...(data as object) });
      }

      case "currently_reading": {
        // Map to Go bookshelf with status "reading"
        const goBody: Record<string, unknown> = { status: "reading" };
        if (googleForGo) goBody.google_books_id = googleForGo;
        if (isbn) goBody.isbn = isbn;
        if (book_id) goBody.book_id = book_id;

        const { data, status } = await bookshelfApi.add(username, goBody);
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to add to currently reading") }, { status });
        }
        return NextResponse.json({ message: "Book added to currently reading successfully", ...(data as object) });
      }

      case "favorite": {
        const goBody: Record<string, unknown> = {};
        if (googleForGo) goBody.google_books_id = googleForGo;
        if (isbn) goBody.isbn = isbn;
        if (book_id) goBody.book_id = book_id;

        const { data, status } = await favoritesApi.add(username, goBody);
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to add to favorites") }, { status });
        }
        return NextResponse.json({ message: "Book added to favorites successfully", ...(data as object) });
      }

      case "liked": {
        const resolved = await resolvePostgresBookIDForLike({
          book_id,
          isbn,
          google_books_id: googleForGo,
        });
        if (!resolved.ok) {
          return NextResponse.json({ error: resolved.message }, { status: resolved.status });
        }
        const { data, status } = await goFetchAuthed(`/api/v1/books/${encodeURIComponent(resolved.uuid)}/like`, {
          method: "POST",
        });
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to like book") }, { status });
        }
        return NextResponse.json({ message: "Book liked successfully", id: resolved.uuid, ...(data as object) });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Add book error:", error);
    return NextResponse.json(
      { error: "Failed to add book", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * Get user's books by type.
 *
 * GET /api/users/[username]/books?type=bookshelf&limit=10&offset=0
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") ?? "bookshelf";
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const page = Math.floor(parseInt(searchParams.get("offset") ?? "0") / limit) + 1;

    switch (type) {
      case "bookshelf": {
        const { data, status } = await bookshelfApi.get(username, page, limit, "read");
        if (status >= 400) return NextResponse.json({ error: "Failed to fetch bookshelf" }, { status });
        const bs = data as { books: Array<{ id: string; volumeInfo?: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string } } }>; total_count: number };
        const books = (bs.books ?? []).map((b) => ({
          bookId: b.id,
          title: b.volumeInfo?.title ?? "",
          cover: b.volumeInfo?.imageLinks?.thumbnail ?? "",
          authors: b.volumeInfo?.authors ?? [],
        }));
        return NextResponse.json({ type, total: bs.total_count, limit, offset: (page - 1) * limit, books });
      }

      case "tbr": {
        const { data, status } = await bookshelfApi.getTBR(username, page, limit);
        if (status >= 400) return NextResponse.json({ error: "Failed to fetch TBR" }, { status });
        type TbrEntry = {
          book_id?: string;
          current_page?: number;
          tbr_priority?: string;
          tbr_notes?: string;
          created_at?: string;
          book?: {
            id?: string;
            volumeInfo?: {
              title?: string;
              authors?: string[];
              imageLinks?: { thumbnail?: string; medium?: string };
              pageCount?: number;
            };
          };
        };
        const tbr = (data ?? []) as TbrEntry[];
        const books = tbr.map((b) => ({
          bookId: b.book?.id ?? b.book_id ?? "",
          title: b.book?.volumeInfo?.title ?? "",
          cover: b.book?.volumeInfo?.imageLinks?.thumbnail ?? b.book?.volumeInfo?.imageLinks?.medium ?? "",
          authors: b.book?.volumeInfo?.authors ?? [],
          current_page: b.current_page ?? 0,
          totalPages: b.book?.volumeInfo?.pageCount ?? 0,
          tbr_priority: b.tbr_priority,
          tbr_notes: b.tbr_notes,
          created_at: b.created_at,
        }));
        return NextResponse.json({ type, total: books.length, limit, offset: (page - 1) * limit, books });
      }

      case "currently_reading": {
        const { data, status } = await bookshelfApi.getCurrentlyReading(username, page, limit);
        if (status >= 400) return NextResponse.json({ error: "Failed to fetch currently reading" }, { status });
        const cr = data as unknown[];
        return NextResponse.json({ type, total: cr.length, limit, offset: (page - 1) * limit, books: cr });
      }

      case "favorite": {
        const { data, status } = await favoritesApi.get(username);
        if (status >= 400) return NextResponse.json({ error: "Failed to fetch favorites" }, { status });
        const favs = data as unknown[];
        return NextResponse.json({ type, total: favs.length, limit, offset: 0, books: favs });
      }

      case "liked": {
        const { data, status } = await userApi.getLikes(username, page, limit);
        if (status >= 400) {
          return NextResponse.json({ error: "Failed to fetch liked books" }, { status });
        }
        const lr = data as {
          books?: Array<{
            id: string;
            _id?: string;
            volumeInfo?: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string } };
            isbndbId?: string;
            openLibraryId?: string;
            googleBooksId?: string;
          }>;
          total_count?: number;
        };
        const rawBooks = lr.books ?? [];
        const books = rawBooks.map((b) => ({
          bookId: b.id,
          title: b.volumeInfo?.title ?? "",
          cover: b.volumeInfo?.imageLinks?.thumbnail ?? "",
          authors: b.volumeInfo?.authors ?? [],
          isbndbId: b.isbndbId,
          openLibraryId: b.openLibraryId,
          googleBooksId: b.googleBooksId,
        }));
        const total = typeof lr.total_count === "number" ? lr.total_count : books.length;
        return NextResponse.json({
          type,
          total,
          limit,
          offset: (page - 1) * limit,
          books,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Get books error:", error);
    return NextResponse.json(
      { error: "Failed to get books", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * Reorder favorites.
 *
 * PUT /api/users/[username]/books
 * Body: { type: "favorite", bookIds: string[] }
 *   bookIds is the ordered array of Postgres book UUIDs.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const type = body.type as string | undefined;

    if (type !== "favorite") {
      return NextResponse.json({ error: "Only favorite reordering is supported via PUT" }, { status: 400 });
    }

    const bookIds = body.bookIds as string[] | undefined;
    if (!Array.isArray(bookIds) || bookIds.length === 0) {
      return NextResponse.json({ error: "bookIds array is required" }, { status: 400 });
    }

    const goBody = {
      favorites: bookIds.map((id, i) => ({ book_id: id, display_order: i + 1 })),
    };
    const { data, status } = await favoritesApi.reorder(username, goBody);
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: extractGoError(err, "Failed to reorder favorites") }, { status });
    }
    return NextResponse.json({ message: "Favorites reordered successfully" });
  } catch (error) {
    console.error("Reorder favorites error:", error);
    return NextResponse.json(
      { error: "Failed to reorder favorites", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * Remove a book from bookshelf/favorites.
 *
 * DELETE /api/users/[username]/books
 * Body: { type: "bookshelf" | "favorite" | "liked", bookId: string }
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const type = body.type as string | undefined;
    const bookId = (body.bookId ?? body.book_id) as string | undefined;
    const isbnHint = (body.isbn ?? body.isbndbId) as string | undefined;
    const googleHint = (body.googleBooksId ?? body.openLibraryId ?? body.google_books_id) as
      | string
      | undefined;

    if (!username || !type) {
      return NextResponse.json({ error: "Username and type are required" }, { status: 400 });
    }

    // Go backend expects a Postgres UUID in the URL path. The frontend sometimes
    // sends a Mongo ObjectID (legacy) as bookId. Resolve to a real UUID first.
    const resolveForRemove = async () => {
      if (!bookId && !isbnHint && !googleHint) {
        return { ok: false as const, status: 400, message: "bookId is required" };
      }
      return resolvePostgresBookIDForLike({
        book_id: bookId,
        isbn: isbnHint,
        google_books_id: googleHint,
      });
    };

    switch (type) {
      case "bookshelf":
      case "tbr":
      case "currently_reading": {
        const resolved = await resolveForRemove();
        if (!resolved.ok) {
          return NextResponse.json({ error: resolved.message }, { status: resolved.status });
        }
        const { data, status } = await bookshelfApi.remove(username, resolved.uuid);
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to remove from bookshelf") }, { status });
        }
        return NextResponse.json({ message: "Book removed successfully" });
      }

      case "favorite": {
        const resolved = await resolveForRemove();
        if (!resolved.ok) {
          return NextResponse.json({ error: resolved.message }, { status: resolved.status });
        }
        const { data, status } = await favoritesApi.remove(username, resolved.uuid);
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to remove from favorites") }, { status });
        }
        return NextResponse.json({ message: "Book removed from favorites" });
      }

      case "liked": {
        const resolved = await resolveForRemove();
        if (!resolved.ok) {
          return NextResponse.json({ error: resolved.message }, { status: resolved.status });
        }
        const { data, status } = await goFetchAuthed(`/api/v1/books/${encodeURIComponent(resolved.uuid)}/like`, {
          method: "DELETE",
        });
        if (status >= 400) {
          const err = data as { error?: { message?: string }; message?: string };
          return NextResponse.json({ error: extractGoError(err, "Failed to unlike book") }, { status });
        }
        return NextResponse.json({ message: "Book unliked" });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Remove book error:", error);
    return NextResponse.json(
      { error: "Failed to remove book", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
