import { NextRequest, NextResponse } from "next/server";
import { thoughtsApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";
import { toThought, type GoThought } from "@/lib/thoughts";

export const dynamic = "force-dynamic";

interface GoThoughtsResponse {
  thoughts: GoThought[];
  total_count: number;
  page?: number;
  page_size?: number;
}

/** GET /api/users/[username]/thoughts — the profile Thoughts tab (thoughts + reposts). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("limit") ?? "20");

    const { data, status } = await thoughtsApi.list(username, page, pageSize);
    if (status >= 400) {
      return NextResponse.json({ error: "Failed to fetch thoughts" }, { status });
    }

    const goData = (data ?? {}) as GoThoughtsResponse;
    const thoughts = (goData.thoughts ?? []).map(toThought);

    return NextResponse.json({
      thoughts,
      total_count: goData.total_count ?? thoughts.length,
      page: goData.page ?? page,
      page_size: goData.page_size ?? pageSize,
    });
  } catch (error) {
    console.error("Thoughts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch thoughts" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const thoughtId = body.thoughtId as string | undefined;

    if (!thoughtId) {
      return NextResponse.json({ error: "thoughtId is required" }, { status: 400 });
    }

    const { data, status } = await thoughtsApi.delete(username, thoughtId);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (status === 404) return NextResponse.json({ error: "Thought not found" }, { status: 404 });
    if (status >= 400) {
      return NextResponse.json({ error: extractGoError(data, "Failed to delete thought") }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Thoughts DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete thought" }, { status: 500 });
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
      // The general editor sends `subject`; the Go field is `title`.
      title: raw.title ?? raw.subject ?? null,
      is_private: raw.isPrivate ?? raw.is_private ?? false,
      rating: raw.rating ?? null,
    };

    // Continuing a thread: Go takes the book and privacy from the thread.
    const threadParentId = (raw.threadParentId ?? raw.thread_parent_id) as string | undefined;
    if (threadParentId) {
      goBody.thread_parent_id = threadParentId;
    } else if (rawBookId) {
      if (isPostgresUUID(rawBookId)) {
        goBody.book_id = rawBookId;
      } else if (isISBN(rawBookId)) {
        goBody.isbn = rawBookId.replace(/\D/g, "");
      } else {
        goBody.google_books_id = rawBookId;
      }
    }

    const { data, status } = await thoughtsApi.create(username, goBody);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { code?: string };
      console.error("Thoughts POST backend error:", { status, body: data });
      return NextResponse.json({ error: extractGoError(data, "Failed to post thought"), code: err?.code }, { status });
    }

    return NextResponse.json(toThought(data as GoThought), { status: 201 });
  } catch (error) {
    console.error("Thoughts POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to post thought" }, { status: 500 });
  }
}
