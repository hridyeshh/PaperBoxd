import { NextRequest, NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

/** GET /api/onboarding/suggested-readers?limit=8 → Go /users/suggested */
export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get("limit") ?? "8";
  const { data, status } = await goFetchAuthed(
    `/api/v1/users/suggested?limit=${encodeURIComponent(limit)}`
  );
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to load suggested readers" }, { status });
  }
  return NextResponse.json(data);
}
