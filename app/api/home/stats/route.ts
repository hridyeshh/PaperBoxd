import { NextResponse } from "next/server";
import { bookshelfApi, listsApi } from "@/lib/api/endpoints";
import { getSession } from "@/lib/auth/jwt-session";

type GoVolumeInfo = {
  title?: string;
  authors?: string[];
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
};

type GoReadingEntry = {
  id?: string;
  book_id?: string;
  current_page?: number | null;
  started_at?: string;
  created_at?: string;
  updated_at?: string;
  book?: {
    id?: string;
    _id?: string;
    slug?: string;
    volumeInfo?: GoVolumeInfo;
    isbndbId?: string;
    openLibraryId?: string;
  };
};

type GoList = {
  id?: string;
  title?: string;
  book_count?: number;
};

/**
 * GET /api/home/stats
 * Returns the currently-reading books (with current_page), shelf counts, and user lists.
 * Used by the home page hero strip and sidebar.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session.accessToken || !session.user?.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { username } = session.user;

    const [crRes, tbrRes, bsRes, listsRes] = await Promise.all([
      bookshelfApi.getCurrentlyReading(username, 1, 50),
      bookshelfApi.getTBR(username, 1, 50),
      bookshelfApi.get(username, 1, 1, "read"),
      listsApi.getUserLists(username),
    ]);

    function normalizeEntry(entry: GoReadingEntry) {
      const bookId = entry.book_id || entry.book?.id || entry.book?._id;
      if (!bookId) return null;
      const vi = entry.book?.volumeInfo;
      const cover =
        vi?.imageLinks?.thumbnail ||
        vi?.imageLinks?.medium ||
        vi?.imageLinks?.small ||
        vi?.imageLinks?.smallThumbnail ||
        "";
      return {
        bookId,
        title: vi?.title || "Unknown",
        cover,
        author: vi?.authors?.[0] || "",
        currentPage: typeof entry.current_page === "number" ? entry.current_page : 0,
        totalPages: vi?.pageCount || 0,
        updatedAt: entry.updated_at || entry.started_at || entry.created_at || null,
      };
    }

    // Normalize currently-reading entries (status = 'reading')
    const crRaw = Array.isArray(crRes.data) ? (crRes.data as GoReadingEntry[]) : [];
    const fromReading = crRaw.map(normalizeEntry).filter(Boolean);

    // Also include TBR books with logged pages (user logged pages but book still in TBR status)
    const tbrRaw = Array.isArray(tbrRes.data) ? (tbrRes.data as GoReadingEntry[]) : [];
    const fromTBR = tbrRaw
      .map(normalizeEntry)
      .filter((b): b is NonNullable<typeof b> => b !== null && b.currentPage > 0);

    // Merge, dedupe by bookId (prefer reading-status entry over TBR)
    const seen = new Set<string>();
    const currentlyReading: typeof fromReading = [];
    for (const b of [...fromReading, ...fromTBR]) {
      if (!b || seen.has(b.bookId)) continue;
      seen.add(b.bookId);
      currentlyReading.push(b);
    }

    // Sort by most recently updated (last book logged first)
    currentlyReading.sort((a, b) => {
      if (!a!.updatedAt && !b!.updatedAt) return 0;
      if (!a!.updatedAt) return 1;
      if (!b!.updatedAt) return -1;
      return new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime();
    });

    const tbrCount = Array.isArray(tbrRes.data) ? tbrRes.data.length : 0;
    const finishedCount =
      (bsRes.data as { total_count?: number } | null)?.total_count ?? 0;

    // Normalize lists
    const listsRaw = Array.isArray(listsRes.data)
      ? (listsRes.data as GoList[])
      : [];
    const lists = listsRaw.slice(0, 6).map((l) => ({
      id: l.id || "",
      title: l.title || "",
      bookCount: l.book_count ?? 0,
    }));

    return NextResponse.json({
      currentlyReading,
      shelfCounts: {
        reading: currentlyReading.length,
        tbr: tbrCount,
        finished: finishedCount,
      },
      lists,
    });
  } catch (error) {
    console.error("Home stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
