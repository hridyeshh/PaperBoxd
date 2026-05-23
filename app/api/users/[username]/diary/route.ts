import { NextRequest, NextResponse } from "next/server";
import { diaryApi } from "@/lib/api/endpoints";

export const dynamic = "force-dynamic";

// Default cover + helper — must match the transform in app/api/users/[username]/route.ts
// so the profile load and the diary-tab reload produce identical entry shapes.
const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";

interface GoVolumeInfo {
  title?: string;
  authors?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string };
}

interface GoBookResponse {
  id: string;
  _id?: string;
  volumeInfo?: GoVolumeInfo;
  slug?: string;
}

interface GoDiaryEntry {
  id: string;
  book_id?: string | null;
  book?: GoBookResponse | null;
  title?: string | null;
  content: string;
  is_private: boolean;
  rating?: number | null;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

interface GoDiaryEntriesResponse {
  entries: GoDiaryEntry[];
  total_count: number;
  page?: number;
  page_size?: number;
}

function bookCover(vi?: GoVolumeInfo): string {
  return (
    vi?.imageLinks?.thumbnail ??
    vi?.imageLinks?.smallThumbnail ??
    vi?.imageLinks?.medium ??
    DEFAULT_COVER
  );
}

function bookAuthor(vi?: GoVolumeInfo): string {
  return vi?.authors?.[0] ?? "Unknown Author";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("limit") ?? "20");

    const { data, status } = await diaryApi.getEntries(username, page, pageSize);
    if (status >= 400) {
      return NextResponse.json({ error: "Failed to fetch diary entries" }, { status });
    }

    const goData = (data ?? {}) as GoDiaryEntriesResponse;
    const entries = (goData.entries ?? []).map((e) => ({
      _id: e.id,
      id: e.id,
      bookId: e.book_id ?? null,
      bookTitle: e.book?.volumeInfo?.title ?? null,
      bookAuthor: e.book ? bookAuthor(e.book.volumeInfo) : null,
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
    }));

    return NextResponse.json({
      entries,
      total_count: goData.total_count ?? entries.length,
      page: goData.page ?? page,
      page_size: goData.page_size ?? pageSize,
    });
  } catch (error) {
    console.error("Diary GET error:", error);
    return NextResponse.json({ error: "Failed to fetch diary entries" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const entryId = body.entryId as string | undefined;

    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }

    const { data, status } = await diaryApi.deleteEntry(username, entryId);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (status === 404) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: err?.error?.message ?? "Failed to delete diary entry" }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Diary DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete diary entry" }, { status: 500 });
  }
}

function isPostgresUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

function isISBN(s: string): boolean {
  const d = s.replace(/\D/g, "");
  return d.length === 10 || d.length === 13;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const raw = await request.json() as Record<string, unknown>;

    // Normalize camelCase frontend fields → snake_case Go fields
    const rawBookId = ((raw.bookId ?? raw.book_id) as string | undefined)?.trim();
    const goBody: Record<string, unknown> = {
      content: raw.content,
      title: raw.title ?? null,
      is_private: raw.isPrivate ?? raw.is_private ?? false,
      rating: raw.rating ?? null,
    };

    if (rawBookId) {
      if (isPostgresUUID(rawBookId)) {
        goBody.book_id = rawBookId;
      } else if (isISBN(rawBookId)) {
        goBody.isbn = rawBookId.replace(/\D/g, "");
      } else {
        goBody.google_books_id = rawBookId;
      }
    }

    const { data, status } = await diaryApi.createEntry(username, goBody);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: err?.error?.message ?? "Failed to create diary entry" }, { status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Diary POST error:", error);
    return NextResponse.json({ error: "Failed to create diary entry" }, { status: 500 });
  }
}
