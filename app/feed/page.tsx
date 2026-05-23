"use client";

import React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { HomeLayoutHeader } from "@/components/ui/layout/home-layout-header";
import { HomeSidebar } from "@/components/ui/layout/home-sidebar";
import { PinterestGrid } from "@/components/ui/home/pinterest-grid";
import BookLoader from "@/components/ui/features/book-loader";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });

type BookItem = {
  id: string;
  _id?: string;
  title: string;
  authors: string[];
  description: string;
  publishedDate: string;
  cover: string;
  isbn?: string;
  isbn13?: string;
  openLibraryId?: string;
  isbndbId?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  author?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBook(b: any): BookItem | null {
  const id = b?.id || b?._id;
  if (!id) return null;
  return {
    id,
    _id: b._id || id,
    title: b.title || "Unknown Title",
    authors: Array.isArray(b.authors) ? b.authors : b.authors ? [b.authors] : b.author ? [b.author] : ["Unknown Author"],
    description: b.description || "",
    publishedDate: b.publishedDate || "",
    cover: b.cover || "",
    isbn: b.isbn,
    isbn13: b.isbn13,
    openLibraryId: b.openLibraryId,
    isbndbId: b.isbndbId,
    averageRating: b.averageRating,
    ratingsCount: b.ratingsCount,
    pageCount: b.pageCount,
  };
}

const CAROUSEL_TYPES = ["recommended", "friends", "favorites", "authors", "genres"] as const;

export default function FeedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [books, setBooks] = React.useState<BookItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  const isbndbPageRef = React.useRef(Math.floor(Math.random() * 50));
  const isbndbEmptyRef = React.useRef(0);
  const hasLoadedRef = React.useRef(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/");
  }, [isLoading, isAuthenticated, router]);

  // Initial load
  React.useEffect(() => {
    if (!isAuthenticated || hasLoadedRef.current) return;

    const load = async () => {
      setLoading(true);
      const seen = new Set<string>();
      const pool: BookItem[] = [];

      await Promise.all(
        CAROUSEL_TYPES.map(async (type) => {
          try {
            const res = await fetch(`/api/books/personalized?type=${type}&limit=20`);
            if (res.ok) {
              const json = await res.json();
              (json.books || []).forEach((b: BookItem) => {
                const mapped = mapBook(b);
                if (mapped && mapped.cover && !seen.has(mapped.id)) {
                  seen.add(mapped.id);
                  pool.push(mapped);
                }
              });
            }
          } catch { /* silent */ }
        }),
      );

      // Shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      setBooks(pool);
      setLoading(false);
      hasLoadedRef.current = true;
    };

    load();
  }, [isAuthenticated]);

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const existing = new Set(books.map((b) => b.id));
      const next = isbndbPageRef.current + 1;
      const res = await fetch(`/api/books/from-isbndb?page=${next}&limit=20`);
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = await res.json() as { books?: any[] };
        const fresh = (json.books || [])
          .map(mapBook)
          .filter((b): b is BookItem => !!b && !!b.cover && !existing.has(b.id));
        if (fresh.length > 0) {
          setBooks((prev) => [...prev, ...fresh]);
          isbndbPageRef.current = next;
          isbndbEmptyRef.current = 0;
        } else {
          isbndbPageRef.current = next;
          isbndbEmptyRef.current += 1;
          if (isbndbEmptyRef.current >= 5) setHasMore(false);
        }
      } else {
        isbndbEmptyRef.current += 1;
        if (isbndbEmptyRef.current >= 5) setHasMore(false);
      }
    } catch { setHasMore(false); }
    finally { setIsLoadingMore(false); }
  }, [books, isLoadingMore, hasMore]);

  if (isLoading || (!isAuthenticated && !isLoading)) return null;

  return (
    <div className="min-h-screen bg-background">
      <HomeLayoutHeader />
      <HomeSidebar />

      <main
        className={cn("pt-16 pl-[220px]")}
        style={{ minHeight: "100vh" }}
      >
        <div className="px-8 pb-16 pt-8">
          {/* Section header */}
          <div className="mb-6 pb-4 border-b border-border">
            <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground">
              Discover
            </div>
            <h1 className={cn(playfair.className, "text-[28px] font-semibold text-foreground mt-1")}>
              Books from around the world.
            </h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <BookLoader size="md" speed="fast" loadingText="Loading your feed…" />
            </div>
          ) : (
            <PinterestGrid
              books={books.map((b) => ({
                id: b.id,
                title: b.title,
                authors: b.authors,
                description: b.description,
                publishedDate: b.publishedDate,
                cover: b.cover,
                isbn: b.isbn,
                isbn13: b.isbn13,
                averageRating: b.averageRating,
                ratingsCount: b.ratingsCount,
                pageCount: b.pageCount,
              }))}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              isLoading={isLoadingMore}
            />
          )}
        </div>
      </main>
    </div>
  );
}
