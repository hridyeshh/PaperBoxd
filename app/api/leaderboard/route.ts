import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/api/endpoints";

const VALID_DIMENSIONS = new Set(["books", "pages", "diary", "genres", "xp", "streak"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? "global";

  let path: string;
  if (tab === "global") {
    path = "/api/v1/leaderboard/global?limit=100";
  } else if (VALID_DIMENSIONS.has(tab)) {
    path = `/api/v1/leaderboard/dimension/${tab}?limit=100`;
  } else {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  const { data, status } = await goFetch(path);
  if (status >= 400) return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status });
  return NextResponse.json(data);
}
