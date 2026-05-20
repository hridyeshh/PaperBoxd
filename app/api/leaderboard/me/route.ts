import { NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

export async function GET() {
  const { data, status } = await goFetchAuthed("/api/v1/users/me/leaderboard-stats");
  if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (status >= 400) return NextResponse.json({ error: "Failed to fetch stats" }, { status });
  return NextResponse.json(data);
}
