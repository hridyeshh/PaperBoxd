"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { PinterestGrid } from "@/components/ui/home/pinterest-grid";
import { Header } from "@/components/ui/layout/header-with-search";
import { HomeLayoutHeader } from "@/components/ui/layout/home-layout-header";
import BookLoader from "@/components/ui/features/book-loader";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";
import { Playfair_Display } from "next/font/google";
import { Sparkles } from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
});

const carouselTypes = [
  "recommended",
  "friends",
  "favorites",
  "authors",
  "genres",
  "continue-reading",
] as const;

type APIBook = {
  id: string;
  _id?: string;
  title: string;
  author: string;
  authors?: string[];
  cover: string;
  isbn?: string;
  isbn13?: string;
  description?: string;
  publishedDate?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  categories?: string[];
  publisher?: string;
  reason?: string;
};

export default function RecommendationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [allBooks, setAllBooks] = useState<APIBook[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push("/auth"); return; }
    if (hasLoadedRef.current) { setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          carouselTypes.map((type) =>
            fetch(`/api/books/personalized?type=${type}&limit=20`)
              .then((r) => r.ok ? r.json() : { recommendations: [] })
              .then((d) => {
                const recs = (d.books || d.recommendations || []) as (APIBook & {
                  cover_url?: string;
                  authors?: string[];
                })[];
                return recs.map((book) => ({
                  ...book,
                  author: book.author || book.authors?.[0] || "",
                  cover: book.cover || book.cover_url || "",
                })) as APIBook[];
              })
              .catch(() => [] as APIBook[])
          )
        );

        // Merge and deduplicate by id
        const seen = new Set<string>();
        const merged: APIBook[] = [];
        for (const books of results) {
          for (const book of books) {
            const key = book.id || book._id || book.title;
            if (key && !seen.has(key)) {
              seen.add(key);
              merged.push(book);
            }
          }
        }
        setAllBooks(merged);
        hasLoadedRef.current = true;
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex min-h-screen flex-col">
          {isMobile ? <Header minimalMobile={isMobile} /> : <HomeLayoutHeader />}
          <div className="flex flex-1 items-center justify-center mt-16">
            <BookLoader size="md" speed="fast" loadingText="Finding your next read…" />
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        {isMobile ? <Header minimalMobile={isMobile} /> : <HomeLayoutHeader />}

        <div className="flex-1 mt-16">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8 md:pb-8">

            {/* Heading */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-[#b85c38]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#b85c38]">
                  Personalized
                </span>
              </div>
              <h1 className={cn("text-4xl font-bold tracking-tight text-foreground md:text-5xl", playfair.className)}>
                Find a New Book
              </h1>
              <p
                className={cn("mt-1.5 text-base text-muted-foreground", playfair.className)}
                style={{ fontStyle: "italic" }}
              >
                curated picks waiting to be discovered
              </p>
            </div>

            {allBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-16 text-center">
                <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className={cn("text-lg font-semibold", playfair.className)}>No recommendations yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add some books to your library and we&apos;ll start personalizing your picks.
                </p>
              </div>
            ) : (
              <PinterestGrid
                books={allBooks.map((book) => ({
                  id: book.id || book._id || "",
                  _id: book._id,
                  title: book.title || "Unknown Title",
                  authors: book.authors?.length ? book.authors : book.author ? [book.author] : [],
                  description: book.description || "",
                  publishedDate: book.publishedDate || "",
                  cover: book.cover || "",
                  isbn: book.isbn,
                  isbn13: book.isbn13,
                  averageRating: book.averageRating,
                  ratingsCount: book.ratingsCount,
                  pageCount: book.pageCount,
                  categories: book.categories,
                  publisher: book.publisher,
                  reason: book.reason,
                }))}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
