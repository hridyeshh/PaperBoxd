import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed, goFetch } from "@/lib/api/endpoints";

// ── CSV parser (shared logic with /api/import/goodreads) ──────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const values = parseCSVLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = (values[i] || "").trim();
      });
      return obj;
    })
    .filter((row) => row["Title"]);
}

// Extract top authors weighted by how highly the user rated them
function extractTopAuthors(rows: Record<string, string>[]): string[] {
  const stats: Record<string, { totalRating: number; count: number; rated: number }> = {};
  for (const row of rows) {
    const author = (row["Author"] || row["Author l-f"] || "").trim();
    if (!author) continue;
    const rating = parseInt(row["My Rating"] || "0", 10);
    if (!stats[author]) stats[author] = { totalRating: 0, count: 0, rated: 0 };
    stats[author].count++;
    if (rating > 0) {
      stats[author].totalRating += rating;
      stats[author].rated++;
    }
  }

  return Object.entries(stats)
    .map(([author, s]) => ({
      author,
      // Weighted score: avg rating × log-count (rewards prolific favourites)
      score: (s.rated > 0 ? s.totalRating / s.rated : 3) * Math.log(s.count + 1),
      avgRating: s.rated > 0 ? s.totalRating / s.rated : 3,
    }))
    .filter((e) => e.avgRating >= 3.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((e) => e.author);
}

// Titles already in the user's Goodreads library (normalised for dedup)
function extractReadTitles(rows: Record<string, string>[]): Set<string> {
  return new Set(rows.map((r) => (r["Title"] || "").toLowerCase().trim()));
}

// ── Genre → search query mapping ──────────────────────────────────────────────

const GENRE_QUERIES: Record<string, string> = {
  fiction: "literary fiction bestseller",
  mystery: "mystery detective bestseller",
  thriller: "thriller suspense bestseller",
  romance: "romance love story bestseller",
  "science-fiction": "science fiction bestseller",
  fantasy: "epic fantasy bestseller",
  horror: "horror bestseller",
  historical: "historical fiction bestseller",
  biography: "biography memoir bestseller",
  "self-help": "self help personal development bestseller",
  business: "business leadership bestseller",
  "non-fiction": "nonfiction narrative bestseller",
  "young-adult": "young adult fiction bestseller",
  classics: "classic literature",
  poetry: "poetry collection",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type AhaBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
  reason: string;
};

type GoRec = {
  id: string;
  title?: string;
  authors?: string[];
  cover_url?: string;
  reason?: string;
  [key: string]: unknown;
};

type GoSearchItem = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: Record<string, string | undefined>;
  };
};

// ── Cover helpers ─────────────────────────────────────────────────────────────

const BAD_COVER = ["no_cover", "nocover", "placeholder", "default_cover", "missing"];

function isValidCover(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  const l = url.toLowerCase();
  return l.startsWith("http") && !BAD_COVER.some((p) => l.includes(p));
}

function pickCover(imageLinks: Record<string, string | undefined> = {}): string {
  const order = ["large", "medium", "thumbnail", "smallThumbnail", "extraLarge"];
  return order.map((k) => imageLinks[k]).find((u) => isValidCover(u)) ?? "";
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/onboarding/aha
 *
 * Accepts multipart/form-data:
 *   genres  — JSON-serialised string[] of genre IDs selected during onboarding
 *   file    — (optional) Goodreads CSV export
 *
 * Returns { books: AhaBook[], top: AhaBook | null }
 * where `books` has up to 5 candidates (for "show another") and `top` is the best.
 *
 * Resolution order:
 *   1. Go recommendation engine (personalised, genre-aware)
 *   2. Augment with author-based searches derived from Goodreads history
 *   3. Genre keyword search as final fallback
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse request ─────────────────────────────────────────────────────────

  let genres: string[] = [];
  let topAuthors: string[] = [];
  let readTitles: Set<string> = new Set();

  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    let fd: FormData;
    try {
      fd = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    try {
      genres = JSON.parse((fd.get("genres") as string) ?? "[]");
    } catch {
      genres = [];
    }

    const file = fd.get("file") as File | null;
    if (file) {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length > 0) {
        topAuthors = extractTopAuthors(rows);
        readTitles = extractReadTitles(rows);
      }
    }
  } else {
    try {
      const body = await request.json();
      genres = Array.isArray(body.genres) ? body.genres : [];
    } catch {
      genres = [];
    }
  }

  const books: AhaBook[] = [];
  const seenIds = new Set<string>();

  function push(book: AhaBook) {
    if (seenIds.has(book.id)) return;
    if (!isValidCover(book.cover)) return;
    if (readTitles.has(book.title.toLowerCase())) return;
    seenIds.add(book.id);
    books.push(book);
  }

  // ── 1. Go recommendation engine ───────────────────────────────────────────

  try {
    const { data, status } = await goFetchAuthed("/api/v1/recommendations/home");
    if (status < 400) {
      const recs: GoRec[] = (data as { recommendations?: GoRec[] }).recommendations ?? [];
      for (const rec of recs) {
        if (books.length >= 5) break;
        if (!rec.id || !rec.title || !isValidCover(rec.cover_url)) continue;
        push({
          id: rec.id,
          title: rec.title,
          author: rec.authors?.[0] ?? "",
          cover: rec.cover_url ?? "",
          reason: rec.reason ?? "Picked for you",
        });
      }
    }
  } catch { /* continue to fallbacks */ }

  // ── 2. Author-based augmentation (from Goodreads history) ────────────────

  if (books.length < 3 && topAuthors.length > 0) {
    await Promise.all(
      topAuthors.slice(0, 3).map(async (author) => {
        try {
          const { data, status } = await goFetch<{ items?: GoSearchItem[] }>(
            `/api/v1/books/search?q=${encodeURIComponent(author)}&page_size=5`
          );
          if (status >= 400) return;
          for (const item of data.items ?? []) {
            if (books.length >= 5) break;
            const title = item.volumeInfo?.title ?? "";
            const cover = pickCover(item.volumeInfo?.imageLinks);
            if (!item.id || !title || !cover) continue;
            push({
              id: item.id,
              title,
              author: item.volumeInfo?.authors?.[0] ?? "",
              cover,
              reason: `More by ${author}`,
            });
          }
        } catch { /* skip this author */ }
      })
    );
  }

  // ── 3. Genre keyword fallback ─────────────────────────────────────────────

  if (books.length < 3 && genres.length > 0) {
    for (const genre of genres.slice(0, 3)) {
      if (books.length >= 5) break;
      const query = GENRE_QUERIES[genre] ?? genre;
      try {
        const { data, status } = await goFetch<{ items?: GoSearchItem[] }>(
          `/api/v1/books/search?q=${encodeURIComponent(query)}&page_size=10`
        );
        if (status >= 400) continue;
        for (const item of data.items ?? []) {
          if (books.length >= 5) break;
          const title = item.volumeInfo?.title ?? "";
          const cover = pickCover(item.volumeInfo?.imageLinks);
          if (!item.id || !title || !cover) continue;
          push({
            id: item.id,
            title,
            author: item.volumeInfo?.authors?.[0] ?? "",
            cover,
            reason: `Top ${genre.replace("-", " ")} pick`,
          });
        }
      } catch { /* skip this genre */ }
    }
  }

  return NextResponse.json({ books, top: books[0] ?? null });
}
