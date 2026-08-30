"use client";

// Shared book-cover data for the marketing pages (landing, 404, case studies).
// Real covers come from /api/books/landing; the gradient set below is the
// fallback used while they load or if the request fails.

import { createContext, useContext, useEffect, useState } from "react";

export const COVERS = [
  { g: "linear-gradient(155deg,#6b5b95 0%,#2f1f50 100%)", t: "The Left Hand\nof Darkness", a: "Le Guin" },
  { g: "linear-gradient(155deg,#c44536 0%,#6a1f1a 100%)", t: "Pachinko", a: "Min Jin Lee" },
  { g: "linear-gradient(155deg,#c49a6c 0%,#7a5230 100%)", t: "Norwegian\nWood", a: "Murakami" },
  { g: "linear-gradient(155deg,#2a4a3a 0%,#10201a 100%)", t: "Piranesi", a: "Clarke" },
  { g: "linear-gradient(155deg,#3a5a7a 0%,#15253a 100%)", t: "The Sea,\nthe Sea", a: "Murdoch" },
  { g: "linear-gradient(155deg,#8a3a5a 0%,#3d1528 100%)", t: "Beloved", a: "Morrison" },
  { g: "linear-gradient(155deg,#4a6a2a 0%,#1e2e10 100%)", t: "Circe", a: "Miller" },
  { g: "linear-gradient(155deg,#b85c38 0%,#5c2810 100%)", t: "Middlemarch", a: "Eliot" },
  { g: "linear-gradient(155deg,#2a3a5a 0%,#0e1525 100%)", t: "Master &\nMargarita", a: "Bulgakov" },
  { g: "linear-gradient(155deg,#8a7a2a 0%,#3d3510 100%)", t: "Anna\nKarenina", a: "Tolstoy" },
  { g: "linear-gradient(155deg,#5a2a6a 0%,#250e30 100%)", t: "Americanah", a: "Adichie" },
  { g: "linear-gradient(155deg,#1a5a4a 0%,#081f18 100%)", t: "Demon\nCopperhead", a: "Kingsolver" },
  { g: "linear-gradient(155deg,#6b4a2a 0%,#2d1a08 100%)", t: "Lonesome\nDove", a: "McMurtry" },
  { g: "linear-gradient(155deg,#3a2a6a 0%,#150e30 100%)", t: "Invisible\nMan", a: "Ellison" },
  { g: "linear-gradient(155deg,#5a4a1a 0%,#251e06 100%)", t: "Their Eyes\nWere Watching\nGod", a: "Hurston" },
  { g: "linear-gradient(155deg,#1a3a5a 0%,#081525 100%)", t: "Remains\nof the Day", a: "Ishiguro" },
  { g: "linear-gradient(155deg,#6a3a2a 0%,#2d1510 100%)", t: "Wide\nSargasso\nSea", a: "Rhys" },
  { g: "linear-gradient(155deg,#2a5a3a 0%,#0e2518 100%)", t: "Kindred", a: "Butler" },
  { g: "linear-gradient(155deg,#6b2a3a 0%,#2d1018 100%)", t: "Beautiful\nWorld", a: "Rooney" },
  { g: "linear-gradient(155deg,#3a4a2a 0%,#15200e 100%)", t: "Trust", a: "Diaz" },
  { g: "linear-gradient(155deg,#5a3a6a 0%,#251530 100%)", t: "Tomorrow,\nand Tomorrow", a: "Zevin" },
  { g: "linear-gradient(155deg,#2a6a5a 0%,#0e2820 100%)", t: "Klara &\nthe Sun", a: "Ishiguro" },
];

export type LandingBook = {
  id: string;
  src?: string;      // real cover image URL (undefined → render gradient + typography)
  title: string;     // single-line plain title
  author: string;
  g: string;         // gradient fallback
  t: string;         // multi-line typography for fallback rendering
};

export const FALLBACK_BOOKS: LandingBook[] = COVERS.map((c, i) => ({
  id: `f-${i}`,
  title: c.t.replace(/\n/g, " "),
  author: c.a,
  g: c.g,
  t: c.t,
}));

export const BooksContext = createContext<LandingBook[]>(FALLBACK_BOOKS);
export const useBooks = () => useContext(BooksContext);

type LandingApiBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

// Loads an image and resolves true only if it's a real cover (not a placeholder).
// Google Books "no image available" placeholders are typically ≤128px wide.
function validateCoverImage(url: string, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 128 && img.naturalHeight > 150);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

export function useLandingBooks(): { books: LandingBook[]; loading: boolean } {
  const [books, setBooks] = useState<LandingBook[]>(FALLBACK_BOOKS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/books/landing?limit=40")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data: { books?: LandingApiBook[] } | null) => {
        if (cancelled) return;
        if (data?.books?.length) {
          const candidates = data.books.filter(
            (b) => b.cover && b.cover.trim().startsWith("http")
          );
          // Validate all covers in parallel — strips placeholder "no image" images
          const results = await Promise.all(
            candidates.map((b) => validateCoverImage(b.cover))
          );
          if (cancelled) return;
          const real: LandingBook[] = candidates
            .filter((_, i) => results[i])
            .map((b, i) => {
              const fb = FALLBACK_BOOKS[i % FALLBACK_BOOKS.length];
              return {
                id: b.id || `r-${i}`,
                src: b.cover,
                title: b.title,
                author: b.author,
                g: fb.g,
                t: b.title,
              };
            });
          if (real.length > 0) setBooks(real);
        }
        if (!cancelled) setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { books, loading };
}

// CSS `background` shorthand: real cover image layered over the gradient fallback.
export function coverBg(book: LandingBook): string {
  return book.src
    ? `center / cover no-repeat url("${book.src}"), ${book.g}`
    : book.g;
}
