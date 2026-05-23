/**
 * lib/streak.ts
 *
 * Server-side streak tracking using httpOnly cookies.
 * A "streak day" is counted when the user logs ≥1 page of any book on a given UTC calendar day.
 * Streak resets to 0 if the user misses any calendar day (no pages logged).
 */

import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const STREAK_COOKIE_PREFIX = "pb_streak_";
const MAX_AGE = 60 * 60 * 24 * 400; // 400 days

export interface StreakData {
  lastDate: string; // "YYYY-MM-DD" UTC
  streak: number;
}

export interface StreakResult {
  streak: number;
  lastReadDate: string | null;
  updatedToday: boolean;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function cookieKey(userId: string): string {
  // Sanitize userId to only alphanumeric chars for cookie name safety
  return STREAK_COOKIE_PREFIX + userId.replace(/[^a-zA-Z0-9]/g, "");
}

function decode(raw: string): StreakData | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
    if (
      typeof parsed.lastDate === "string" &&
      typeof parsed.streak === "number" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastDate)
    ) {
      return parsed as StreakData;
    }
  } catch { /* ignore */ }
  return null;
}

function encode(data: StreakData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

/** Read the current streak for a user from their httpOnly cookie (no side effects). */
export async function readStreak(userId: string): Promise<StreakResult> {
  const cookieStore = await cookies();
  return readStreakFromStore(cookieStore, userId);
}

export function readStreakFromStore(
  cookieStore: ReadonlyRequestCookies,
  userId: string
): StreakResult {
  const raw = cookieStore.get(cookieKey(userId))?.value;
  const data = raw ? decode(raw) : null;

  if (!data) {
    return { streak: 0, lastReadDate: null, updatedToday: false };
  }

  const today = todayUTC();
  const yesterday = yesterdayUTC();

  // Streak expired if last read was before yesterday
  if (data.lastDate !== today && data.lastDate !== yesterday) {
    return { streak: 0, lastReadDate: data.lastDate, updatedToday: false };
  }

  return {
    streak: data.streak,
    lastReadDate: data.lastDate,
    updatedToday: data.lastDate === today,
  };
}

/**
 * Record a reading activity for a user. Returns the updated streak and
 * a SetCookie value to attach to the response.
 *
 * Does NOT write the cookie itself — caller must set `pb_streak_<id>` on the response.
 */
export async function recordActivity(
  userId: string
): Promise<{ result: StreakResult; cookieName: string; cookieValue: string }> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(cookieKey(userId))?.value;
  const data = raw ? decode(raw) : null;

  const today = todayUTC();
  const yesterday = yesterdayUTC();

  let newStreak: number;

  if (!data || (data.lastDate !== today && data.lastDate !== yesterday)) {
    // No history or missed one or more days — start fresh
    newStreak = 1;
  } else if (data.lastDate === today) {
    // Already logged today — no change
    newStreak = data.streak;
  } else {
    // Last read was yesterday — increment
    newStreak = data.streak + 1;
  }

  const newData: StreakData = { lastDate: today, streak: newStreak };

  return {
    result: { streak: newStreak, lastReadDate: today, updatedToday: true },
    cookieName: cookieKey(userId),
    cookieValue: encode(newData),
  };
}

/** Cookie options to attach to any response that sets a streak cookie. */
export const STREAK_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  path: "/",
};
