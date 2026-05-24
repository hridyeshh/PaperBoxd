"use client";

import Image from "next/image";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { Header } from "@/components/ui/layout/header-with-search";
import { HomeLayoutHeader } from "@/components/ui/layout/home-layout-header";
import { useIsMobile } from "@/hooks/use-media-query";
import { NotFoundPage } from "@/components/ui/pages/not-found-page";
import { createBookSlug } from "@/lib/utils/book-slug";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700", "800"],
  style: ["normal", "italic"],
});

type AuthorBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

type AuthorInfo = {
  found: boolean;
  name: string;
  description?: string;
  extract: string;
  photo_url: string;
  wikipedia_url: string;
};

const EXTRACT_LIMIT = 420;

function authorGradient(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradients = [
    "linear-gradient(160deg,#5a8050 0%,#2a4a2a 100%)",
    "linear-gradient(160deg,#b85c38 0%,#6e2f1f 100%)",
    "linear-gradient(160deg,#3a7bd5 0%,#1a1a5e 100%)",
    "linear-gradient(160deg,#a8893f 0%,#5a4520 100%)",
    "linear-gradient(160deg,#8a5a8a 0%,#3e2845 100%)",
  ];
  return gradients[hash % gradients.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className
      )}
    />
  );
}

function AuthorPageSkeleton({ nav }: { nav: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {nav}
      <main className="flex-1 mt-16">
        {/* Hero skeleton */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
            <Skeleton className="h-4 w-16 mb-8" />
            <div className="flex flex-col sm:flex-row gap-8 sm:gap-12">
              <Skeleton className="w-full sm:w-[160px] aspect-[2/3] rounded-xl flex-shrink-0 max-w-[160px]" />
              <div className="flex-1 pt-1 space-y-3">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <div className="pt-2 space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-5/6" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
                <Skeleton className="h-3 w-20 mt-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Books skeleton */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-8" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuthorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authorName =
    typeof params.authorName === "string"
      ? decodeURIComponent(params.authorName)
      : null;

  const isMobile = useIsMobile();

  const [books, setBooks] = React.useState<AuthorBook[]>([]);
  const [info, setInfo] = React.useState<AuthorInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [extractExpanded, setExtractExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!authorName) {
      setError("Author name is required");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const encoded = encodeURIComponent(authorName);

    const load = async () => {
      setLoading(true);
      setError(null);

      const [infoRes, booksRes] = await Promise.allSettled([
        fetch(`/api/authors/info?name=${encoded}`),
        fetch(`/api/books/by-author?author=${encoded}&limit=20`),
      ]);

      if (cancelled) return;

      if (infoRes.status === "fulfilled" && infoRes.value.ok) {
        try {
          const data = (await infoRes.value.json()) as AuthorInfo;
          setInfo(data);
        } catch {
          setInfo(null);
        }
      } else {
        setInfo(null);
      }

      if (booksRes.status === "fulfilled" && booksRes.value.ok) {
        try {
          const data = (await booksRes.value.json()) as { books?: AuthorBook[] };
          setBooks(Array.isArray(data.books) ? data.books : []);
        } catch {
          setBooks([]);
        }
      } else {
        setBooks([]);
      }

      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [authorName]);

  const handleBookClick = React.useCallback(
    (book: AuthorBook) => {
      const id = book.id;
      if (!id) { router.push(`/b/${createBookSlug(book.title)}`); return; }
      const isISBN = /^(\d{10}|\d{13})$/.test(id);
      const isOL = id.startsWith("OL") || id.startsWith("/works/");
      const isMongo = /^[0-9a-fA-F]{24}$/.test(id);
      const safe = /^[a-zA-Z0-9_-]+$/.test(id) && !id.includes(" ") && !id.includes("+");
      if (isISBN || isOL || isMongo || safe) {
        router.push(`/b/${id}`);
      } else {
        router.push(`/b/${createBookSlug(book.title, undefined, id)}`);
      }
    },
    [router]
  );

  const nav = isMobile ? <Header minimalMobile /> : <HomeLayoutHeader />;

  if (loading) return <AuthorPageSkeleton nav={nav} />;

  if (error || !authorName) {
    return (
      <div className="flex min-h-screen flex-col">
        {nav}
        <NotFoundPage />
      </div>
    );
  }

  const hasInfo = info?.found && (info.extract || info.photo_url);
  const hasBooks = books.length > 0;
  const displayName = info?.found && info.name ? info.name : authorName;
  const extract = info?.extract ?? "";
  const canToggleExtract = extract.length > EXTRACT_LIMIT;
  const extractShown = extractExpanded || !canToggleExtract
    ? extract
    : extract.slice(0, EXTRACT_LIMIT).trimEnd() + "…";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {nav}

      <main className="flex-1 mt-16">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">

            {/* Back */}
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 items-start">

              {/* Portrait */}
              <div className="flex-shrink-0 w-full sm:w-auto flex sm:block justify-center">
                {hasInfo && info.photo_url ? (
                  <div className="relative w-[140px] sm:w-[160px] aspect-[2/3] rounded-xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                    <Image
                      src={info.photo_url}
                      alt={displayName}
                      fill
                      sizes="160px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className="w-[140px] sm:w-[160px] aspect-[2/3] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.18)] flex items-center justify-center"
                    style={{ background: authorGradient(displayName) }}
                  >
                    <span className="text-white text-4xl font-bold select-none">
                      {getInitials(displayName)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 sm:pt-2">
                {/* Label */}
                <p className="text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2">
                  Author
                </p>

                {/* Name */}
                <h1
                  className={cn(
                    playfair.className,
                    "text-[2rem] sm:text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-foreground mb-3"
                  )}
                >
                  {displayName}
                </h1>

                {/* Description + book count row */}
                <div className="flex items-center gap-3 flex-wrap mb-5">
                  {info?.description && (
                    <span className="text-sm text-muted-foreground">
                      {info.description}
                    </span>
                  )}
                  {info?.description && hasBooks && (
                    <span className="text-muted-foreground/30 text-xs">·</span>
                  )}
                  {hasBooks && (
                    <span className="text-sm text-muted-foreground">
                      {books.length} {books.length === 1 ? "book" : "books"} in PaperBoxd
                    </span>
                  )}
                </div>

                {/* Extract */}
                {extract && (
                  <p className="text-[0.9375rem] text-foreground/85 leading-[1.7] max-w-[65ch]">
                    {extractShown}
                    {canToggleExtract && (
                      <button
                        type="button"
                        onClick={() => setExtractExpanded((v) => !v)}
                        className="ml-2 text-[#b85c38] font-semibold hover:underline underline-offset-2 text-sm"
                      >
                        {extractExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </p>
                )}

                {!hasInfo && !hasBooks && (
                  <p className="text-[0.9375rem] text-muted-foreground leading-relaxed">
                    We don&apos;t have much on {displayName} yet.
                  </p>
                )}

                {/* Wikipedia link */}
                {info?.wikipedia_url && (
                  <a
                    href={info.wikipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Wikipedia
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── BOOKS ────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 pb-24 md:pb-12">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Books in PaperBoxd
            </h2>
            {hasBooks && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {books.length}
              </span>
            )}
          </div>

          {hasBooks ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7 sm:gap-x-5">
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => handleBookClick(book)}
                  className="group text-left"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-border/40 transition-shadow duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
                    <Image
                      src={book.cover}
                      alt={`${book.title} cover`}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 18vw"
                      unoptimized
                    />
                  </div>
                  <h3 className="mt-2.5 text-[0.8125rem] font-semibold text-foreground line-clamp-2 leading-snug">
                    {book.title}
                  </h3>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className={cn(playfair.className, "text-lg text-muted-foreground")} style={{ fontStyle: "italic" }}>
                No books by this author in PaperBoxd yet.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
