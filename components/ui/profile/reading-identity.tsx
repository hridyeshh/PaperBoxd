"use client";

// The one-line answer to "who is this person as a reader?", built only from
// what the shelf actually contains. Every clause is dropped when the data
// behind it is missing, so a new profile says less rather than saying something
// invented.

import { cn } from "@/lib/utils";

export type IdentityBook = {
  categories?: string[];
  finishedOn?: string;
};

/**
 * Genres a reader actually reads, most-read first. Google's category strings
 * are hierarchical ("Fiction / Fantasy / Epic"); the leaf is the useful part,
 * and bare "Fiction" / "General" carry no taste signal so they only survive
 * when nothing better exists.
 */
export function topGenres(books: IdentityBook[], limit = 2): string[] {
  const counts = new Map<string, number>();
  for (const b of books) {
    for (const raw of b.categories ?? []) {
      const leaf = raw.split("/").pop()?.trim();
      if (!leaf) continue;
      if (/^(general|fiction|nonfiction|non-fiction)$/i.test(leaf)) continue;
      counts.set(leaf, (counts.get(leaf) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([genre]) => genre);
}

function finishedThisYear(books: IdentityBook[]): number {
  const year = new Date().getFullYear();
  return books.filter((b) => {
    if (!b.finishedOn) return false;
    const d = new Date(b.finishedOn);
    return !isNaN(d.getTime()) && d.getFullYear() === year;
  }).length;
}

function joinedLabel(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return `Here since ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

/**
 * Builds the clauses for the identity line. Exported so the shape can be
 * asserted without rendering.
 */
export function identityClauses({
  books,
  booksReadTotal,
  createdAt,
}: {
  books: IdentityBook[];
  booksReadTotal: number;
  createdAt?: string | null;
}): string[] {
  const clauses: string[] = [];

  const genres = topGenres(books);
  if (genres.length === 2) clauses.push(`Reads mostly ${genres[0]} and ${genres[1]}`);
  else if (genres.length === 1) clauses.push(`Reads mostly ${genres[0]}`);

  if (booksReadTotal > 0) {
    clauses.push(`${booksReadTotal} ${booksReadTotal === 1 ? "book" : "books"} finished`);
  }

  // Only worth saying once there is a year's worth of shelf to compare against,
  // and never when it just restates the total.
  const thisYear = finishedThisYear(books);
  if (thisYear > 0 && thisYear !== booksReadTotal) {
    clauses.push(`${thisYear} this year`);
  }

  if (clauses.length === 0) {
    const joined = joinedLabel(createdAt);
    if (joined) clauses.push(joined);
  }
  return clauses;
}

export function ReadingIdentity({
  books,
  booksReadTotal,
  createdAt,
  className,
}: {
  books: IdentityBook[];
  booksReadTotal: number;
  createdAt?: string | null;
  className?: string;
}) {
  const clauses = identityClauses({ books, booksReadTotal, createdAt });
  if (clauses.length === 0) return null;
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {clauses.join(" · ")}
    </p>
  );
}
