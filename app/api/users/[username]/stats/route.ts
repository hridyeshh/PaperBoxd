import { NextRequest, NextResponse } from "next/server";
import { goFetch, goFetchAuthed } from "@/lib/api/endpoints";

interface LeaderboardEntry {
  username?: string;
  total_xp?: number;
  level?: number;
  level_name?: string;
  current_streak?: number;
  books_read?: number;
  diary_entries?: number;
  pages_read?: number;
  xp_rank?: number | null;
  books_rank?: number | null;
  pages_rank?: number | null;
  streak_rank?: number | null;
  diary_rank?: number | null;
}

function zeroStats(username: string): LeaderboardEntry {
  return {
    username,
    total_xp: 0,
    level: 1,
    level_name: "Beginner Reader",
    current_streak: 0,
    books_read: 0,
    diary_entries: 0,
    pages_read: 0,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const lower = username.toLowerCase();

  // 1. Try a dedicated per-user endpoint (may or may not exist on Go backend).
  const direct = await goFetchAuthed(
    `/api/v1/users/${encodeURIComponent(username)}/leaderboard-stats`
  );
  if (direct.status < 400 && direct.data) {
    return NextResponse.json(direct.data);
  }

  // 2. Fall back to searching the global leaderboard.
  const lb = await goFetch("/api/v1/leaderboard/global?limit=200");
  if (lb.status < 400) {
    const raw = lb.data as { leaderboard?: LeaderboardEntry[] } | LeaderboardEntry[];
    const list = Array.isArray(raw) ? raw : (raw?.leaderboard ?? []);
    const match = list.find((e) => e.username?.toLowerCase() === lower);
    if (match) return NextResponse.json(match);
  }

  // 3. User not in top 200 — they have minimal XP. Return zeros.
  return NextResponse.json(zeroStats(username));
}
