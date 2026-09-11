import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mode = req.nextUrl.searchParams.get("mode") ?? "";
  try {
    const { data, status } = await goFetchAuthed(
      `/api/v1/recommendations/surprise${mode ? `?mode=${encodeURIComponent(mode)}` : ""}`,
    );
    return NextResponse.json(data, { status });
  } catch (err) {
    console.error("[surprise] fetch failed:", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  }
}
