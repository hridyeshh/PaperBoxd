import { NextRequest, NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

/**
 * GET /api/books/[id]/social
 *
 * Proxies the Go social-proof endpoint. Uses goFetchAuthed so a signed-in
 * reader also gets the `friends` block; signed-out visitors still get reader
 * stats and lists (Go treats auth as optional here).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Book ID is required" }, { status: 400 });

  try {
    const { data, status } = await goFetchAuthed(
      `/api/v1/books/${encodeURIComponent(id)}/social`,
    );
    if (status >= 400) {
      return NextResponse.json({ error: "Failed to fetch social proof" }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[book social] fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch social proof" }, { status: 500 });
  }
}
