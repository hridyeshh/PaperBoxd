import { NextRequest, NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

// GET /api/users/me/follow-requests — people waiting on a private account.
export async function GET(request: NextRequest) {
  try {
    const page = request.nextUrl.searchParams.get("page") ?? "1";
    const { data, status } = await goFetchAuthed(
      `/api/v1/users/me/follow-requests?page=${encodeURIComponent(page)}`
    );
    if (status >= 400) {
      return NextResponse.json({ requests: [], total_count: 0 }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Follow requests error:", error);
    return NextResponse.json({ error: "Failed to fetch follow requests" }, { status: 500 });
  }
}
