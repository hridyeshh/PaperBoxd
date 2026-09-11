import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

// ── CSV parser ────────────────────────────────────────────────────────────────

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

// Goodreads exports ISBNs as ="0451524935" — strip the wrapper
function cleanISBN(raw: string): string {
  return raw.replace(/[="]/g, "").trim();
}

function mapShelf(exclusive: string): "read" | "reading" | "tbr" {
  if (exclusive === "read") return "read";
  if (exclusive === "currently-reading") return "reading";
  return "tbr";
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: meData, status: meStatus } = await goFetchAuthed("/api/v1/users/me");
  if (meStatus >= 400) {
    return NextResponse.json({ error: "Failed to get current user" }, { status: meStatus });
  }
  const me = meData as { username: string };

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No books found in CSV" }, { status: 400 });
  }

  // Cap the import. Every row costs 1–3 backend calls, and the whole thing runs
  // inside one serverless request under a global rate limit — an uncapped
  // 2,000-row library used to 429 halfway through and report success.
  const MAX_ROWS = 500;
  const truncated = rows.length > MAX_ROWS;
  const rowsToImport = truncated ? rows.slice(0, MAX_ROWS) : rows;

  let imported = 0;
  // notFound: we could not find the book. failed: we found it and the write
  // broke (rate limit, backend error). They need different advice, so they are
  // counted apart rather than both being "skipped".
  let notFound = 0;
  let failed = 0;
  let rateLimited = false;
  const preview: Array<{ title: string; shelf: string; status: "imported" | "skipped" | "failed" }> = [];

  // Process in batches of 8 to avoid hammering the backend
  const BATCH = 8;
  for (let i = 0; i < rowsToImport.length; i += BATCH) {
    const batch = rowsToImport.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (row) => {
        const title = row["Title"] || "";
        const author = row["Author"] || row["Author l-f"] || "";
        const isbn13 = cleanISBN(row["ISBN13"] || "");
        const isbn = cleanISBN(row["ISBN"] || "");
        const shelf = mapShelf(row["Exclusive Shelf"] || "to-read");
        const rating = parseInt(row["My Rating"] || "0", 10);

        if (!title) return;

        // Search our backend — prefer ISBN, fall back to title + author
        let bookId: string | null = null;
        const query = isbn13 || isbn
          ? isbn13 || isbn
          : `${title} ${author}`.trim();

        let lookupFailed = false;
        try {
          const { data: searchData, status: searchStatus } = await goFetchAuthed(
            `/api/v1/books/search?q=${encodeURIComponent(query)}&limit=1`
          );
          if (searchStatus === 429) {
            rateLimited = true;
            lookupFailed = true;
          } else if (searchStatus >= 500) {
            lookupFailed = true;
          } else if (searchStatus < 400) {
            const sr = searchData as { items?: Array<{ id: string }> };
            if (sr.items?.[0]?.id) bookId = sr.items[0].id;
          }
        } catch {
          lookupFailed = true;
        }

        if (!bookId) {
          if (lookupFailed) {
            failed++;
            if (preview.length < 30) preview.push({ title, shelf, status: "failed" });
          } else {
            notFound++;
            if (preview.length < 30) preview.push({ title, shelf, status: "skipped" });
          }
          return;
        }

        try {
          const endpoint =
            shelf === "read"
              ? `/api/v1/users/${me.username}/bookshelf/${bookId}/finish`
              : shelf === "reading"
              ? `/api/v1/users/${me.username}/bookshelf/${bookId}/start`
              : `/api/v1/users/${me.username}/bookshelf/${bookId}/tbr`;

          const { status: addStatus } = await goFetchAuthed(endpoint, { method: "POST" });

          if (addStatus < 400 || addStatus === 409) {
            // Save rating for read books
            if (rating > 0 && shelf === "read") {
              await goFetchAuthed(
                `/api/v1/users/${me.username}/bookshelf/${bookId}/progress`,
                { method: "PUT", body: JSON.stringify({ rating }) }
              ).catch(() => {});
            }
            imported++;
            if (preview.length < 30) preview.push({ title, shelf, status: "imported" });
          } else {
            if (addStatus === 429) rateLimited = true;
            failed++;
            if (preview.length < 30) preview.push({ title, shelf, status: "failed" });
          }
        } catch {
          failed++;
          if (preview.length < 30) preview.push({ title, shelf, status: "failed" });
        }
      })
    );
  }

  return NextResponse.json({
    imported,
    // `skipped` is kept for older clients and now means "not found on
    // Paperboxd" only; `failed` is the half that is worth retrying.
    skipped: notFound,
    notFound,
    failed,
    rateLimited,
    truncated,
    processed: rowsToImport.length,
    total: rows.length,
    books: preview,
  });
}
