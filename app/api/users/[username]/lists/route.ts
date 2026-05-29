import { NextRequest, NextResponse } from "next/server";
import { goFetchAuthed, listsApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";

// Shape returned by Go for a single list in a list-summary response.
type GoListSummary = {
  id?: string;
  title?: string;
  description?: string | null;
  is_private?: boolean;
  book_count?: number;
  save_count?: number;
  is_saved?: boolean;
  can_edit?: boolean;
  can_view?: boolean;
  cover_urls?: string[];
  created_at?: string;
  updated_at?: string;
};

// Normalize a Go list summary into the camelCase shape the frontend expects.
function normalizeList(list: GoListSummary) {
  // Build the books array from cover_urls so the frontend card can render covers.
  const books = (list.cover_urls ?? []).map((url, i) => ({
    id: `cover-${i}`,
    cover: url,
    thumbnail: url,
  }));

  return {
    id: list.id ?? "",
    title: list.title ?? "",
    description: list.description ?? undefined,
    booksCount: list.book_count ?? 0,
    books,
    isPublic: !(list.is_private ?? false),
    isSaved: list.is_saved ?? false,
    canEdit: list.can_edit ?? false,
    createdAt: list.created_at ?? "",
    updatedAt: list.updated_at ?? "",
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    // Forward session cookie so Go can run OptionalAuthenticate and resolve private/saved lists.
    const { data, status } = await goFetchAuthed(
      `/api/v1/users/${encodeURIComponent(username)}/lists`
    );
    if (status >= 400) {
      return NextResponse.json(
        { error: extractGoError(data, "Failed to fetch lists"), details: data },
        { status }
      );
    }

    const raw = data as { own_lists?: GoListSummary[]; saved_lists?: GoListSummary[] };
    const ownLists = (raw.own_lists || []).map(normalizeList);
    const savedLists = (raw.saved_lists || []).map(normalizeList);

    return NextResponse.json({
      // Legacy field name used throughout the frontend
      lists: [...ownLists, ...savedLists],
      ownLists,
      savedLists,
    });
  } catch (error) {
    console.error("Lists GET error:", error);
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();

    const goBody: Record<string, unknown> = {
      title: body.title,
      description: body.description ?? "",
      is_private: !(body.isPublic ?? true),
    };

    const { data, status } = await listsApi.createList(username, goBody);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: extractGoError(err, "Failed to create list") }, { status });
    }

    return NextResponse.json(normalizeList(data as GoListSummary), { status: 201 });
  } catch (error) {
    console.error("Lists POST error:", error);
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }
}
