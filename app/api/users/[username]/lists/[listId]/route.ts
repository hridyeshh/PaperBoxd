import { NextRequest, NextResponse } from "next/server";
import { listsApi } from "@/lib/api/endpoints";

// UUID pattern (PostgreSQL / Go UUID)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GoBook = {
  id?: string;
  _id?: string;
  slug?: string;
  volumeInfo?: unknown;
};

type GoList = {
  id?: string;
  user_id?: string;
  username?: string;
  title?: string;
  description?: string | null;
  is_private?: boolean;
  book_count?: number;
  save_count?: number;
  is_saved?: boolean;
  can_edit?: boolean;
  can_view?: boolean;
  created_at?: string;
  updated_at?: string;
  books?: GoBook[];
};

function normalizeListDetail(raw: GoList) {
  return {
    id: raw.id ?? "",
    userId: raw.user_id ?? "",
    username: raw.username ?? "",
    title: raw.title ?? "",
    description: raw.description ?? undefined,
    booksCount: raw.book_count ?? 0,
    isPublic: !(raw.is_private ?? false),
    isSaved: raw.is_saved ?? false,
    canEdit: raw.can_edit ?? false,
    canView: raw.can_view ?? true,
    saveCount: raw.save_count ?? 0,
    books: (raw.books || []).map((b) => ({
      // The frontend's Book interface uses _id; Go returns both id and _id.
      _id: b._id || b.id || "",
      id: b.id || b._id || "",
      slug: b.slug,
      volumeInfo: b.volumeInfo ?? {},
    })),
    createdAt: raw.created_at ?? "",
    updatedAt: raw.updated_at ?? "",
  };
}

// ── GET /api/users/[username]/lists/[listId] ──────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const { data, status } = await listsApi.getList(username, listId);
    if (status === 404) return NextResponse.json({ error: "List not found" }, { status: 404 });
    if (status >= 400) return NextResponse.json({ error: "Failed to fetch list" }, { status });

    return NextResponse.json({ list: normalizeListDetail(data as GoList) });
  } catch (error) {
    console.error("List GET error:", error);
    return NextResponse.json({ error: "Failed to fetch list" }, { status: 500 });
  }
}

// ── PATCH /api/users/[username]/lists/[listId] — edit title / visibility ─────

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const body = await request.json();

    const goBody: Record<string, unknown> = {};
    if (body.title !== undefined) goBody.title = body.title;
    if (body.description !== undefined) goBody.description = body.description;
    if (body.isPublic !== undefined) goBody.is_private = !body.isPublic;

    const { data, status } = await listsApi.updateList(username, listId, goBody);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: err?.error?.message ?? "Failed to update list" }, { status });
    }

    // UpdateList returns ListResponse (no books). Re-fetch the full list so books are preserved.
    const { data: fullList, status: fetchStatus } = await listsApi.getList(username, listId);
    if (fetchStatus >= 400) {
      // Fallback: return the update response without books (better than erroring).
      return NextResponse.json({ list: normalizeListDetail(data as GoList) });
    }
    return NextResponse.json({ list: normalizeListDetail(fullList as GoList) });
  } catch (error) {
    console.error("List PATCH error:", error);
    return NextResponse.json({ error: "Failed to update list" }, { status: 500 });
  }
}

// ── PUT /api/users/[username]/lists/[listId] — add or remove book ─────────────
// Body: { action: "add" | "remove", bookId?, isbndbId?, openLibraryId? }
// "add"    → POST  /api/v1/users/{username}/lists/{listId}/books
// "remove" → DELETE /api/v1/users/{username}/lists/{listId}/books/{bookId}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const body = await request.json();

    const { action, bookId, isbndbId, openLibraryId } = body as {
      action?: string;
      bookId?: string;
      isbndbId?: string;
      openLibraryId?: string;
    };

    // ── Add book ──────────────────────────────────────────────────────────────
    if (action === "add") {
      const goBody: Record<string, unknown> = {};

      // If bookId is a Go UUID, use it directly.
      if (bookId && UUID_RE.test(bookId)) {
        goBody.book_id = bookId;
      } else if (isbndbId) {
        // isbndbId is really an ISBN in this context
        goBody.isbn = isbndbId;
      } else if (openLibraryId) {
        // Go doesn't have an openLibraryId field; best-effort use the slug as isbn.
        // If the ID looks like an ISBN embedded in the OL ID, extract it.
        const isbnMatch = openLibraryId.replace(/\D/g, "");
        if (isbnMatch.length === 10 || isbnMatch.length === 13) {
          goBody.isbn = isbnMatch;
        } else {
          return NextResponse.json({ error: "Unable to identify book for Go backend" }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "Provide bookId, isbndbId, or openLibraryId" }, { status: 400 });
      }

      const { data, status } = await listsApi.addBook(username, listId, goBody);
      if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (status === 409) return NextResponse.json({ error: "Book already in list" }, { status: 409 });
      if (status >= 400) {
        const err = data as { error?: { message?: string }; message?: string };
        return NextResponse.json({ error: err?.error?.message ?? "Failed to add book" }, { status });
      }

      // Re-fetch the updated list so the frontend can update its state.
      const { data: listData, status: listStatus } = await listsApi.getList(username, listId);
      if (listStatus >= 400) return NextResponse.json({ error: "Added book but failed to refresh list" }, { status: 500 });
      return NextResponse.json({ list: normalizeListDetail(listData as GoList) });
    }

    // ── Remove book ───────────────────────────────────────────────────────────
    if (action === "remove") {
      if (!bookId) {
        return NextResponse.json({ error: "bookId is required for remove" }, { status: 400 });
      }

      const { data, status } = await listsApi.removeBook(username, listId, bookId);
      if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (status >= 400) {
        const err = data as { error?: { message?: string }; message?: string };
        return NextResponse.json({ error: err?.error?.message ?? "Failed to remove book" }, { status });
      }

      const { data: listData, status: listStatus } = await listsApi.getList(username, listId);
      if (listStatus >= 400) return NextResponse.json({ error: "Removed book but failed to refresh list" }, { status: 500 });
      return NextResponse.json({ list: normalizeListDetail(listData as GoList) });
    }

    // ── Fallback: update list metadata (legacy PUT usage) ────────────────────
    const goBody: Record<string, unknown> = {};
    if (body.title !== undefined) goBody.title = body.title;
    if (body.description !== undefined) goBody.description = body.description;
    if (body.isPublic !== undefined) goBody.is_private = !body.isPublic;

    const { data, status } = await listsApi.updateList(username, listId, goBody);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: err?.error?.message ?? "Failed to update list" }, { status });
    }
    return NextResponse.json({ list: normalizeListDetail(data as GoList) });
  } catch (error) {
    console.error("List PUT error:", error);
    return NextResponse.json({ error: "Failed to update list" }, { status: 500 });
  }
}

// ── DELETE /api/users/[username]/lists/[listId] ───────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const { data, status } = await listsApi.deleteList(username, listId);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: err?.error?.message ?? "Failed to delete list" }, { status });
    }
    return NextResponse.json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("List DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete list" }, { status: 500 });
  }
}
