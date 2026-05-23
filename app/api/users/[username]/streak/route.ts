import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt-session";
import { readStreak, recordActivity, STREAK_COOKIE_OPTIONS } from "@/lib/streak";

/** GET /api/users/[username]/streak — return current streak for the authenticated user. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ streak: 0, lastReadDate: null, updatedToday: false });
  }
  const result = await readStreak(userId);
  return NextResponse.json(result);
}

/** POST /api/users/[username]/streak — record a reading activity and update streak. */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { result, cookieName, cookieValue } = await recordActivity(userId);
  const res = NextResponse.json(result);
  res.cookies.set(cookieName, cookieValue, STREAK_COOKIE_OPTIONS);
  return res;
}
