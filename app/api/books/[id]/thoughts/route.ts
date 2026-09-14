import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

/**
 * GET /api/books/[id]/thoughts
 *
 * Public thoughts written about this book. The Go endpoint already filters
 * private thoughts, thread follow-ups and blocked users.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Book ID is required" }, { status: 400 });

  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("pageSize") ?? "20")),
  );

  try {
    const { data, status } = await bookApi.getThoughts(id, 1, pageSize);
    if (status >= 400) {
      return NextResponse.json({ thoughts: [] }, { status: status === 404 ? 200 : status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[book thoughts] fetch error:", error);
    return NextResponse.json({ thoughts: [] });
  }
}
