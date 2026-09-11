import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

/** The reader's taste dashboard: axis bars, recent shifts, insights. Own profile only. */
export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { data, status } = await goFetchAuthed("/api/v1/users/me/taste");
    return NextResponse.json(data, { status });
  } catch (err) {
    console.error("[taste] fetch failed:", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  }
}
