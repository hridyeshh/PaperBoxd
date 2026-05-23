import { NextResponse } from "next/server";
import { goFetchAuthed, bookshelfApi, diaryApi } from "@/lib/api/endpoints";
import { getSession } from "@/lib/auth/jwt-session";

export interface TodayLastBook {
  book_id: string;
  title: string;
  slug: string;
  author: string;
  cover: string;
  current_page: number;
  total_pages: number;
}

export interface WeekBar {
  date: string;
  pages: number;
  books: number;
}

export interface TodayProgressData {
  todayPages: number;
  todayBooks: number;
  lastBook: TodayLastBook | null;
  weekBars: number[];
  // Debug info — visible in browser dev tools when bars look wrong
  _debug?: {
    source: string;
    logBars: number[] | null;
    diaryBars: number[];
    activityBars: number[];
  };
}

// "YYYY-MM-DD" in UTC for date offset by `daysAgo`.
function utcDateStr(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Convert ISO timestamp → "YYYY-MM-DD" in UTC.
function dateKeyUTC(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.accessToken || !session.user?.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = session.user;

    // Fetch all sources in parallel. Use settled so one failure doesn't kill rest.
    const [progressRes, crRes, tbrRes, diaryRes] = await Promise.allSettled([
      goFetchAuthed<{
        today_pages: number;
        today_books: number;
        last_book?: TodayLastBook | null;
        week_bars: WeekBar[];
      }>(`/api/v1/users/${encodeURIComponent(username)}/reading/today`),
      bookshelfApi.getCurrentlyReading(username, 1, 100),
      bookshelfApi.getTBR(username, 1, 100),
      diaryApi.getEntries(username, 1, 100),
    ]);

    // ── Today stats from reading_log (Go endpoint) ────────────────────────────
    let todayPages = 0;
    let todayBooks = 0;
    let lastBook: TodayLastBook | null = null;
    let logBars: number[] | null = null;

    if (progressRes.status === "fulfilled" && progressRes.value.status < 400) {
      const raw = progressRes.value.data;
      todayPages = raw.today_pages ?? 0;
      todayBooks = raw.today_books ?? 0;
      lastBook = raw.last_book ?? null;

      if (Array.isArray(raw.week_bars)) {
        const barMap = new Map<string, number>();
        for (const wb of raw.week_bars) barMap.set(wb.date, wb.pages);
        const bars: number[] = [];
        for (let i = 6; i >= 0; i--) bars.push(barMap.get(utcDateStr(i)) ?? 0);
        if (bars.some((v) => v > 0)) logBars = bars;
      }
    } else {
      console.error("[progress] Go /reading/today failed:",
        progressRes.status === "fulfilled" ? progressRes.value.status : (progressRes as PromiseRejectedResult).reason);
    }

    // ── Diary entries as historical fallback (preserved created_at) ───────────
    // Each diary entry = 1 reading session. Count entries per day.
    const diaryByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) diaryByDay.set(utcDateStr(i), 0);

    type DiaryEntry = { createdAt?: string; created_at?: string };
    if (diaryRes.status === "fulfilled" && diaryRes.value.status < 400) {
      const data = diaryRes.value.data as { entries?: DiaryEntry[] } | null;
      const entries = data?.entries ?? [];
      for (const e of entries) {
        const ts = e.createdAt || e.created_at;
        if (!ts) continue;
        const ds = dateKeyUTC(ts);
        if (diaryByDay.has(ds)) diaryByDay.set(ds, (diaryByDay.get(ds) ?? 0) + 1);
      }
    }

    const diaryBars: number[] = [];
    for (let i = 6; i >= 0; i--) diaryBars.push(diaryByDay.get(utcDateStr(i)) ?? 0);

    // ── Bookshelf activity fallback (today only — updated_at is latest-wins) ──
    type BsEntry = { updated_at?: string; current_page?: number | null };
    const crBooks: BsEntry[] = crRes.status === "fulfilled" && Array.isArray(crRes.value.data)
      ? (crRes.value.data as BsEntry[])
      : [];
    const tbrBooks: BsEntry[] = tbrRes.status === "fulfilled" && Array.isArray(tbrRes.value.data)
      ? (tbrRes.value.data as BsEntry[]).filter((b) => (b.current_page ?? 0) > 0)
      : [];

    const activityByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) activityByDay.set(utcDateStr(i), 0);
    for (const book of [...crBooks, ...tbrBooks]) {
      if (!book.updated_at) continue;
      const ds = dateKeyUTC(book.updated_at);
      if (activityByDay.has(ds)) activityByDay.set(ds, (activityByDay.get(ds) ?? 0) + 1);
    }
    const activityBars: number[] = [];
    for (let i = 6; i >= 0; i--) activityBars.push(activityByDay.get(utcDateStr(i)) ?? 0);

    // ── Pick the source with the most non-zero days ───────────────────────────
    // reading_log (pages) preferred. Diary (sessions) next. Bookshelf (today) last.
    let weekBars: number[];
    let source: string;
    const countNonZero = (arr: number[]) => arr.filter((v) => v > 0).length;

    if (logBars && countNonZero(logBars) > 0) {
      weekBars = logBars;
      source = "reading_log";
    } else if (countNonZero(diaryBars) > 0) {
      weekBars = diaryBars;
      source = "diary";
    } else if (countNonZero(activityBars) > 0) {
      weekBars = activityBars;
      source = "bookshelf";
    } else {
      weekBars = [0, 0, 0, 0, 0, 0, 0];
      source = "none";
    }

    console.log(`[progress] user=${username} source=${source} bars=${JSON.stringify(weekBars)} todayPages=${todayPages}`);

    return NextResponse.json({
      todayPages,
      todayBooks,
      lastBook,
      weekBars,
      _debug: { source, logBars, diaryBars, activityBars },
    } satisfies TodayProgressData);
  } catch (error) {
    console.error("Home progress error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
