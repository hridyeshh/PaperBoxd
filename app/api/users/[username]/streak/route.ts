import { NextRequest, NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

/**
 * GET /api/users/[username]/streak
 *
 * Proxies Go, which owns the streak: any UTC day the reader earns XP on any
 * platform — opening the web or either app, logging pages, rating, a diary
 * entry — advances `users.current_streak`.
 *
 * This used to serve a per-browser httpOnly cookie (`pb_streak_<id>`) that the
 * web maintained by itself. That made a third streak: it could not see a day
 * the reader spent in the apps, it reset when they cleared cookies or opened
 * another browser, and it shadowed the server value under the same route name.
 * Same `{ streak }` shape as before, so callers are unchanged.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const { data, status } = await goFetchAuthed(
    `/api/v1/users/${encodeURIComponent(username)}/streak`
  );
  if (status >= 400) return NextResponse.json({ streak: 0 }, { status });
  return NextResponse.json(data);
}
