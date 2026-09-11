import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) {
    return NextResponse.json({ twins: [] }, { status: 401 });
  }
  const limit = req.nextUrl.searchParams.get("limit") ?? "10";
  try {
    const { data, status } = await goFetchAuthed(
      `/api/v1/recommendations/twins?limit=${encodeURIComponent(limit)}`,
    );
    if (status >= 400) return NextResponse.json({ twins: [] }, { status });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[twins] fetch failed:", err);
    return NextResponse.json({ twins: [] });
  }
}
