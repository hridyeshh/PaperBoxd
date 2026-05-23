import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/api/endpoints";

type GoBook = {
  id: string;
  _id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      large?: string;
      medium?: string;
      thumbnail?: string;
      smallThumbnail?: string;
      extraLarge?: string;
    };
  };
};

type GoBookList = {
  items?: GoBook[];
};

type LandingCover = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

const PLACEHOLDER_PATTERNS = [
  "no_cover",
  "nocover",
  "placeholder",
  "default_cover",
  "missing",
];

function isValidCover(url: string): boolean {
  if (!url || !url.trim()) return false;
  const lower = url.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some((p) => lower.includes(p))) return false;
  if (!lower.startsWith("http")) return false;
  return true;
}

function pickCover(b: GoBook): string | undefined {
  const il = b.volumeInfo?.imageLinks ?? {};
  const candidates = [il.large, il.medium, il.thumbnail, il.smallThumbnail, il.extraLarge];
  return candidates.find((c) => c && isValidCover(c));
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GET /api/books/landing
 * Returns ~30–40 deduped, shuffled book covers for the unauthenticated landing page.
 * Pulls multiple pages of latest in parallel to maximise variety.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(60, Math.max(10, parseInt(searchParams.get("limit") || "40")));

  try {
    const pages = await Promise.all(
      [1, 2, 3, 4].map((p) =>
        goFetch<GoBookList>(`/api/v1/books/latest?page=${p}&page_size=50`)
          .then((r) => (r.status >= 400 ? null : r.data))
          .catch(() => null)
      )
    );

    const seen = new Set<string>();
    const merged: LandingCover[] = [];
    for (const page of pages) {
      for (const b of page?.items ?? []) {
        const id = b.id || b._id;
        if (!id || seen.has(id)) continue;
        const cover = pickCover(b);
        if (!cover) continue;
        seen.add(id);
        merged.push({
          id,
          title: b.volumeInfo?.title || "Untitled",
          author: b.volumeInfo?.authors?.[0] || "Unknown",
          cover,
        });
      }
    }

    if (merged.length === 0) {
      return NextResponse.json({ books: [], count: 0 });
    }

    const books = shuffle(merged, Date.now() % 100000).slice(0, limit);
    return NextResponse.json({ books, count: books.length });
  } catch (error) {
    console.error("[landing] fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch landing covers" }, { status: 500 });
  }
}
