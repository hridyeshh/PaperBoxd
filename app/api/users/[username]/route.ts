import { NextRequest, NextResponse } from "next/server";
import { goFetch, bookshelfApi, favoritesApi, diaryApi, listsApi, activityApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";
import { cookies } from "next/headers";

export const revalidate = 30;

// ── Go backend response shapes ────────────────────────────────────────────────

interface GoVolumeInfo {
  title: string;
  authors?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string };
}

interface GoBookResponse {
  id: string;
  _id: string;
  volumeInfo: GoVolumeInfo;
  googleBooksId?: string;
  isbndbId?: string;
  openLibraryId?: string;
  slug?: string;
}

interface GoBookWithStatus extends GoBookResponse {
  status: string;
  rating?: number | null;
  finished_at?: string | null;
  added_at: string;
}

interface GoBookshelfResponse {
  books: GoBookWithStatus[];
  total_count: number;
  page: number;
  page_size: number;
}

interface GoFavoriteResponse {
  id: string;
  book_id: string;
  display_order: number;
  note?: string;
  book: GoBookResponse;
  created_at: string;
}

interface GoTBREntry {
  id: string;
  book_id: string;
  book: GoBookResponse;
  status: string;
  tbr_notes?: string;
  tbr_priority?: string;
  tbr_added_at?: string;
  created_at: string;
  // Optional — populated by Go only when the user has reading progress on a
  // book that is marked DNF. Drives the progress bar in the DNF tab.
  current_page?: number | null;
}

interface GoLikesResponse {
  books: (GoBookResponse & { liked_at: string })[];
  total_count: number;
}

interface GoListResponse {
  id: string;
  user_id: string;
  username: string;
  title: string;
  description?: string;
  is_private: boolean;
  book_count: number;
  save_count: number;
  is_saved: boolean;
  can_edit: boolean;
  can_view: boolean;
  cover_urls?: string[];
  created_at: string;
  updated_at: string;
}

interface GoUserListsResponse {
  own_lists: GoListResponse[];
  saved_lists: GoListResponse[];
}

interface GoDiaryEntry {
  id: string;
  user_id: string;
  username: string;
  book_id?: string;
  book?: GoBookResponse;
  title?: string;
  content: string;
  is_private: boolean;
  rating?: number;
  likes_count: number;
  is_liked: boolean;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
}

interface GoDiaryEntriesResponse {
  entries: GoDiaryEntry[];
  total_count: number;
}

interface GoActivityResponse {
  id: string;
  user_id: string;
  username: string;
  name: string;
  avatar_url?: string;
  activity_type: string;
  book_id?: string;
  book_title?: string;
  book_slug?: string;
  list_id?: string;
  list_title?: string;
  entry_id?: string;
  entry_title?: string;
  target_user_id?: string;
  target_username?: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_COVER = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";

function bookCover(vi?: GoVolumeInfo): string {
  return vi?.imageLinks?.thumbnail ?? vi?.imageLinks?.smallThumbnail ?? vi?.imageLinks?.medium ?? DEFAULT_COVER;
}

function bookAuthor(vi?: GoVolumeInfo): string {
  return vi?.authors?.[0] ?? "Unknown Author";
}

function flatBook(book: GoBookResponse, extra?: Record<string, unknown>) {
  return {
    bookId: book.id,
    _id: book._id ?? book.id,
    title: book.volumeInfo?.title ?? "Unknown Title",
    author: bookAuthor(book.volumeInfo),
    cover: bookCover(book.volumeInfo),
    isbndbId: book.isbndbId,
    openLibraryId: book.openLibraryId,
    googleBooksId: book.googleBooksId,
    slug: book.slug,
    ...extra,
  };
}

// ── GET /api/users/[username] ─────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const hasToken = !!cookieStore.get("pb_access_token")?.value;

    // Fetch all data in parallel
    const [
      userResult,
      bookshelfResult,
      favoritesResult,
      tbrResult,
      readingResult,
      likesResult,
      listsResult,
      diaryResult,
      activitiesResult,
    ] = await Promise.allSettled([
      goFetch(`/api/v1/users/${encodeURIComponent(username)}`),
      bookshelfApi.get(username, 1, 100),
      favoritesApi.get(username),
      bookshelfApi.getTBR(username, 1, 100),
      bookshelfApi.getCurrentlyReading(username, 1, 20),
      goFetch(`/api/v1/users/${encodeURIComponent(username)}/likes?page=1&page_size=100`),
      listsApi.getUserLists(username),
      diaryApi.getEntries(username, 1, 50),
      hasToken ? activityApi.getMyActivities(1, 20) : Promise.resolve({ data: null, status: 401 }),
    ]);

    // User must exist
    if (userResult.status === "rejected" || (userResult.status === "fulfilled" && userResult.value.status === 404)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (userResult.status === "fulfilled" && userResult.value.status >= 400) {
      const status = userResult.value.status === 429 ? 503 : userResult.value.status;
      const headers = userResult.value.status === 429 ? { "Retry-After": "10" } : undefined;
      return NextResponse.json({ error: "Failed to fetch user" }, { status, headers });
    }

    const goUser = userResult.status === "fulfilled" ? (userResult.value.data as Record<string, unknown>) : {};

    // ── Bookshelf ─────────────────────────────────────────────────────────────
    const bookshelf: unknown[] = [];
    if (bookshelfResult.status === "fulfilled" && bookshelfResult.value.status < 400) {
      const bs = bookshelfResult.value.data as GoBookshelfResponse;
      (bs?.books ?? [])
        .filter((b) => b.status === "read")
        .forEach((b) => {
          bookshelf.push(flatBook(b, {
            finishedOn: b.finished_at ?? b.added_at,
            rating: b.rating ?? undefined,
            status: b.status,
          }));
        });
    }

    // ── Favorites ─────────────────────────────────────────────────────────────
    const favoriteBooks: unknown[] = [];
    if (favoritesResult.status === "fulfilled" && favoritesResult.value.status < 400) {
      const favs = favoritesResult.value.data as GoFavoriteResponse[];
      (Array.isArray(favs) ? favs : []).forEach((fav) => {
        favoriteBooks.push(flatBook(fav.book, { note: fav.note, displayOrder: fav.display_order }));
      });
    }

    // ── TBR ───────────────────────────────────────────────────────────────────
    // Build a lookup of current_page by book_id from the bookshelf so we can
    // attach reading progress to DNF/TBR entries. The bookshelf endpoint is the
    // only place the Go backend exposes `current_page` today.
    const currentPageByBookId = new Map<string, number>();
    if (bookshelfResult.status === "fulfilled" && bookshelfResult.value.status < 400) {
      const bs = bookshelfResult.value.data as GoBookshelfResponse & {
        books: Array<GoBookWithStatus & { current_page?: number | null }>;
      };
      for (const b of bs?.books ?? []) {
        if (typeof b.current_page === "number" && b.current_page > 0) {
          currentPageByBookId.set(b.id, b.current_page);
        }
      }
    }

    const tbrBooks: unknown[] = [];
    if (tbrResult.status === "fulfilled" && tbrResult.value.status < 400) {
      const entries = tbrResult.value.data as GoTBREntry[];
      (Array.isArray(entries) ? entries : []).forEach((t) => {
        const pagesRead = t.current_page ?? currentPageByBookId.get(t.book.id) ?? 0;
        tbrBooks.push(flatBook(t.book, {
          addedOn: t.tbr_added_at ?? t.created_at,
          urgency: t.tbr_priority,
          whyNow: t.tbr_notes,
          pagesRead,
        }));
      });
    }

    // ── Currently reading ─────────────────────────────────────────────────────
    const currentlyReading: unknown[] = [];
    if (readingResult.status === "fulfilled" && readingResult.value.status < 400) {
      const entries = readingResult.value.data as Array<{ id: string; book: GoBookResponse; current_page?: number; progress_percentage: number; started_at?: string }>;
      (Array.isArray(entries) ? entries : []).forEach((r) => {
        currentlyReading.push(flatBook(r.book, {
          currentPage: r.current_page,
          progressPercentage: r.progress_percentage,
          startedAt: r.started_at,
        }));
      });
    }

    // Also include "reading" status books from bookshelf in currentlyReading if not already there
    if (bookshelfResult.status === "fulfilled" && bookshelfResult.value.status < 400) {
      const bs = bookshelfResult.value.data as GoBookshelfResponse;
      (bs?.books ?? [])
        .filter((b) => b.status === "reading")
        .forEach((b) => {
          currentlyReading.push(flatBook(b, { addedOn: b.added_at }));
        });
    }

    // ── Liked books ───────────────────────────────────────────────────────────
    const likedBooks: unknown[] = [];
    if (likesResult.status === "fulfilled" && likesResult.value.status < 400) {
      const lr = likesResult.value.data as GoLikesResponse;
      (lr?.books ?? []).forEach((b) => {
        likedBooks.push(flatBook(b, { likedOn: b.liked_at }));
      });
    }

    // ── Reading lists ─────────────────────────────────────────────────────────
    const readingLists: unknown[] = [];
    if (listsResult.status === "fulfilled" && listsResult.value.status < 400) {
      const lr = listsResult.value.data as GoUserListsResponse;
      [...(lr?.own_lists ?? []), ...(lr?.saved_lists ?? [])].forEach((list) => {
        // Go returns up to 3 cover URLs per list so the profile's list card can
        // render the first-three-covers preview without a second fetch.
        const books = (list.cover_urls ?? []).map((url, i) => ({
          _id: `cover-${i}`,
          cover: url,
          thumbnail: url,
        }));
        readingLists.push({
          _id: list.id,
          id: list.id,
          title: list.title,
          description: list.description,
          books,
          isPublic: !list.is_private,
          bookCount: list.book_count,
          updatedAt: list.updated_at,
          createdAt: list.created_at,
          isSaved: list.is_saved,
          canEdit: list.can_edit,
        });
      });
    }

    // ── Diary entries ─────────────────────────────────────────────────────────
    const diaryEntries: unknown[] = [];
    if (diaryResult.status === "fulfilled" && diaryResult.value.status < 400) {
      const dr = diaryResult.value.data as GoDiaryEntriesResponse;
      (dr?.entries ?? []).forEach((e) => {
        diaryEntries.push({
          _id: e.id,
          id: e.id,
          bookId: e.book_id ?? null,
          bookTitle: e.book?.volumeInfo?.title ?? null,
          bookAuthor: bookAuthor(e.book?.volumeInfo),
          bookCover: e.book ? bookCover(e.book.volumeInfo) : null,
          subject: e.title ?? null,
          content: e.content,
          isPrivate: e.is_private,
          rating: e.rating ?? null,
          likes: [],
          likesCount: e.likes_count,
          isLiked: e.is_liked,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        });
      });
    }

    // ── Activities ────────────────────────────────────────────────────────────
    const recentActivities: unknown[] = [];
    if (activitiesResult.status === "fulfilled" && activitiesResult.value.status < 400) {
      const ar = activitiesResult.value.data as { activities: GoActivityResponse[] };
      (ar?.activities ?? []).forEach((a) => {
        recentActivities.push({
          _id: a.id,
          type: a.activity_type,
          bookId: a.book_id ?? null,
          bookTitle: a.book_title ?? null,
          bookCover: null,
          listId: a.list_id ?? null,
          listName: a.list_title ?? null,
          entryId: a.entry_id ?? null,
          entryTitle: a.entry_title ?? null,
          targetUsername: a.target_username ?? null,
          timestamp: a.created_at,
          rating: null,
        });
      });
    }

    // ── TBR books from bookshelf (status "to-read") ───────────────────────────
    if (bookshelfResult.status === "fulfilled" && bookshelfResult.value.status < 400) {
      const bs = bookshelfResult.value.data as GoBookshelfResponse;
      (bs?.books ?? [])
        .filter((b) => b.status === "to-read")
        .forEach((b) => {
          // Only add if not already in tbrBooks (from dedicated TBR endpoint)
          const alreadyIn = (tbrBooks as Array<{ bookId: string }>).some((t) => t.bookId === b.id);
          if (!alreadyIn) {
            tbrBooks.push(flatBook(b, {
              addedOn: b.added_at,
              pagesRead: currentPageByBookId.get(b.id) ?? 0,
            }));
          }
        });
    }

    // ── Compose response ──────────────────────────────────────────────────────
    const user = {
      // Identity
      id: goUser.id,
      _id: goUser._id ?? goUser.id,
      username: goUser.username,
      email: goUser.email,
      name: goUser.name,
      // Profile fields — Go uses snake_case for some
      avatar: (goUser.avatar_url as string | null) ?? undefined,
      bio: goUser.bio,
      birthday: goUser.birthday,
      gender: goUser.gender,
      pronouns: Array.isArray(goUser.pronouns) ? goUser.pronouns : [],
      links: Array.isArray(goUser.links) ? goUser.links : [],
      isPublic: goUser.is_public ?? true,
      // Private profiles come back redacted from Go: canView is false and the
      // collections below arrive empty because the gate 403s them.
      canView: goUser.can_view ?? true,
      hasRequested: goUser.has_requested ?? false,

      // Stats
      totalBooksRead: goUser.books_read_count ?? bookshelf.length,
      totalPagesRead: goUser.total_pages_read ?? 0,
      followersCount: goUser.followers_count ?? 0,
      followingCount: goUser.following_count ?? 0,
      listsCount: goUser.lists_count ?? 0,
      favoritesCount: goUser.favorites_count ?? 0,
      diaryEntriesCount: goUser.diary_entries_count ?? 0,

      // XP / gamification — passed through if Go returns them
      totalXp: goUser.total_xp ?? 0,
      level: goUser.level ?? 1,
      levelName: goUser.level_name ?? null,
      currentStreak: goUser.current_streak ?? 0,

      // Collections
      bookshelf,
      favoriteBooks,
      topBooks: favoriteBooks, // topBooks maps to favorites in the new schema
      likedBooks,
      tbrBooks,
      currentlyReading,
      readingLists,
      diaryEntries,
      recentActivities,

      // Metadata
      createdAt: goUser.created_at,
    };

    const res = NextResponse.json({ user });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res;
  } catch (error) {
    console.error("User fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/users/[username] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const body = await request.json();

    // Map frontend field names → Go backend field names
    const goBody: Record<string, unknown> = {};
    if (body.name !== undefined) goBody.name = body.name;
    if (body.bio !== undefined) goBody.bio = body.bio;
    if (body.pronouns !== undefined) goBody.pronouns = body.pronouns;
    if (body.links !== undefined) goBody.links = body.links;
    if (body.birthday !== undefined) goBody.birthday = body.birthday;
    if (body.gender !== undefined) goBody.gender = body.gender;
    if (body.avatar !== undefined) goBody.avatar_url = body.avatar;
    if (body.username !== undefined) goBody.username = body.username;

    const { data, status } = await (await import("@/lib/api/endpoints")).userApi.update(username, goBody);

    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json(
        { error: extractGoError(err, "Failed to update profile") },
        { status }
      );
    }

    return NextResponse.json({ message: "Profile updated successfully", user: data });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
