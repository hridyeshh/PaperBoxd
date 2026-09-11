import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

/** The modular home feed. Empty modules when logged out or on any failure. */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) {
    return NextResponse.json({ modules: [], source: "no-auth" });
  }
  try {
    const tz = request.nextUrl.searchParams.get("tz") ?? "";
    const { data, status } = await goFetchAuthed(
      `/api/v1/recommendations/feed${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`,
    );
    if (status === 401) {
      return NextResponse.json({ modules: [], source: "unauthorized" }, { status: 401 });
    }
    if (status >= 400) {
      return NextResponse.json({ modules: [], source: "backend-error" });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[feed] fetch failed:", err);
    return NextResponse.json({ modules: [], source: "fetch-error" });
  }
}
