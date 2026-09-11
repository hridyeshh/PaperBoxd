import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

/**
 * GET /api/books/[id]/fit — "Why you'll like this".
 *
 * Proxies the Go endpoint that runs the home feed's reason engine on one
 * book for the signed-in reader. Go answers 204 when it has nothing personal
 * to say; that is passed through as `null` so the page draws nothing rather
 * than a generic line. Signed-out visitors never hit Go.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json(null);
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) return NextResponse.json(null);

  try {
    const { data, status } = await goFetchAuthed(`/api/v1/books/${encodeURIComponent(id)}/fit`);
    if (status !== 200 || !data) return NextResponse.json(null);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[book fit] fetch error:", error);
    return NextResponse.json(null);
  }
}
