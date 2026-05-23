import { NextRequest, NextResponse } from "next/server";
import { bookshelfApi } from "@/lib/api/endpoints";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/jwt-session";
import { recordActivity, STREAK_COOKIE_OPTIONS } from "@/lib/streak";

/**
 * GET /api/users/[username]/reading-progress?bookId=...
 * Resolves pages read from Go: currently-reading entries and TBR (DNF) rows expose current_page.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("pb_access_token")?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await context.params;
    const bookId = request.nextUrl.searchParams.get("bookId");
    if (!username || !bookId) {
      return NextResponse.json({ error: "Username and bookId are required" }, { status: 400 });
    }

    const [crRes, tbrRes] = await Promise.all([
      bookshelfApi.getCurrentlyReading(username, 1, 100),
      bookshelfApi.getTBR(username, 1, 100),
    ]);

    type EntryBook = {
      id?: string;
      _id?: string;
      isbndbId?: string;
      openLibraryId?: string;
      googleBooksId?: string;
    };
    type ProgressRow = {
      book_id?: string;
      current_page?: number | null;
      book?: EntryBook;
    };

    const matches = (row: ProgressRow, needle: string) => {
      if (row.book_id === needle) return true;
      const b = row.book;
      if (!b) return false;
      return (
        b.id === needle ||
        b._id === needle ||
        b.isbndbId === needle ||
        b.openLibraryId === needle ||
        b.googleBooksId === needle
      );
    };

    if (crRes.status < 400 && Array.isArray(crRes.data)) {
      const row = (crRes.data as ProgressRow[]).find((r) => matches(r, bookId));
      if (row && typeof row.current_page === "number") {
        return NextResponse.json({ pagesRead: row.current_page });
      }
    }

    if (tbrRes.status < 400 && Array.isArray(tbrRes.data)) {
      const row = (tbrRes.data as ProgressRow[]).find((r) => matches(r, bookId));
      if (row && typeof row.current_page === "number") {
        return NextResponse.json({ pagesRead: row.current_page });
      }
    }

    return NextResponse.json({ pagesRead: 0 });
  } catch (error: unknown) {
    console.error("Get reading progress error:", error);
    return NextResponse.json(
      {
        error: "Failed to get reading progress",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/[username]/reading-progress
 * Body: { bookId: string, pagesRead: number }
 * Proxies to Go PUT .../bookshelf/:bookId/progress (current_page).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("pb_access_token")?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await context.params;
    const body = await request.json();
    const bookId = body.bookId ?? body.book_id;
    const pagesRead = body.pagesRead;

    if (!username || !bookId || pagesRead === undefined) {
      return NextResponse.json(
        { error: "Username, bookId, and pagesRead are required" },
        { status: 400 }
      );
    }

    if (typeof pagesRead !== "number" || pagesRead < 0 || !Number.isFinite(pagesRead)) {
      return NextResponse.json({ error: "pagesRead must be a non-negative number" }, { status: 400 });
    }

    const currentPage = Math.floor(pagesRead);
    const { data, status } = await bookshelfApi.updateProgress(username, String(bookId), {
      current_page: currentPage,
    });

    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json(
        { error: err?.error?.message ?? err?.message ?? "Failed to update progress" },
        { status }
      );
    }

    const row = data as { current_page?: number | null; book_id?: string };
    const resolvedPages =
      typeof row?.current_page === "number" ? row.current_page : currentPage;

    // Only count streak if user actually logged pages (pagesRead > 0)
    if (currentPage > 0) {
      const session = await getSession();
      const userId = session.user?.id;
      if (userId) {
        const { result, cookieName, cookieValue } = await recordActivity(userId);
        const res = NextResponse.json({
          success: true,
          pagesRead: resolvedPages,
          totalPages: 0,
          isComplete: false,
          streak: result.streak,
          streakUpdatedToday: result.updatedToday,
        });
        res.cookies.set(cookieName, cookieValue, STREAK_COOKIE_OPTIONS);
        return res;
      }
    }

    return NextResponse.json({
      success: true,
      pagesRead: resolvedPages,
      totalPages: 0,
      isComplete: false,
    });
  } catch (error: unknown) {
    console.error("Update reading progress error:", error);
    return NextResponse.json(
      {
        error: "Failed to update reading progress",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
