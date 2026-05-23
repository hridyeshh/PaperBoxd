"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import { createBookSlug } from "@/lib/utils/book-slug";
import { useRouter } from "next/navigation";
import { MorphingSquare } from "@/components/ui/morphing-square";
import { cn } from "@/lib/utils";

type Book = {
  id: string;
  _id?: string;
  title: string;
  authors: string[];
  description: string;
  publishedDate: string;
  cover: string;
  isbn?: string;
  isbn13?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  categories?: string[];
  publisher?: string;
  reason?: string;
};

interface PinterestGridProps {
  books: Book[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const HEIGHT_PATTERN = [280, 340, 400, 340, 280, 400, 340, 280, 400, 340];

function getColumnCount(width: number): number {
  if (width >= 1536) return 6;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  return 2;
}

export function PinterestGrid({ books, onLoadMore, hasMore = false, isLoading = false }: PinterestGridProps) {
  const router = useRouter();
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const [numColumns, setNumColumns] = React.useState(2);

  React.useEffect(() => {
    const update = () => setNumColumns(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const columns = React.useMemo<Book[][]>(() => {
    const cols: Book[][] = Array.from({ length: numColumns }, () => []);
    books.filter((b) => b.cover).forEach((book, i) => cols[i % numColumns].push(book));
    return cols;
  }, [books, numColumns]);

  React.useEffect(() => {
    if (!books || books.length === 0) return;
    const fire = () => {
      fetch("/api/recommendations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_ids: books.map((b) => b.id).filter(Boolean),
          event_type: "impression",
        }),
        keepalive: true,
      }).catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(fire, { timeout: 2000 });
    } else {
      setTimeout(fire, 500);
    }
  }, [books]);

  // Infinite scroll — only fire after the user has actually scrolled down,
  // which prevents the observer from triggering immediately on mount.
  React.useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const currentRef = loadMoreRef.current;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && window.scrollY > 100) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (currentRef) observerRef.current.observe(currentRef);

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  const handleCardClick = (book: Book) => {
    fetch("/api/recommendations/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: book.id, event_type: "click" }),
      keepalive: true,
    }).catch(() => {});

    const bookId = book.isbn13 || book.isbn || book._id || book.id;
    if (bookId) {
      const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
      const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
      const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");
      if (isISBN || isMongoObjectId || isValidId) {
        router.push(`/b/${bookId}`);
      } else {
        router.push(`/b/${createBookSlug(book.title, book.isbn13 || book.isbn, bookId)}`);
      }
    } else {
      router.push(`/b/${createBookSlug(book.title)}`);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      if (dateStr.length === 4) return dateStr;
      if (dateStr.length === 7) {
        const [year, month] = dateStr.split("-");
        return format(new Date(parseInt(year), parseInt(month) - 1), "MMM yyyy");
      }
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Explicit columns — new books always go to the bottom, never reshuffle */}
      <div className="flex w-full items-start" style={{ gap: "1rem" }}>
        {columns.map((colBooks, colIndex) => (
          <div key={colIndex} className="flex-1 flex flex-col" style={{ gap: "1rem" }}>
            {colBooks.map((book, bookIndex) => {
              const height = HEIGHT_PATTERN[(colIndex + bookIndex * numColumns) % HEIGHT_PATTERN.length];
              const formattedDate = formatDate(book.publishedDate);

              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="cursor-pointer group break-inside-avoid"
                  onClick={() => handleCardClick(book)}
                >
                  <div className="relative rounded-2xl overflow-hidden bg-background border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div
                      className="relative w-full overflow-hidden bg-muted"
                      style={{ height: `${height}px` }}
                    >
                      <Image
                        src={book.cover}
                        alt={book.title}
                        fill
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 200px"
                        unoptimized={
                          book.cover?.includes("isbndb.com") ||
                          book.cover?.includes("images.isbndb.com") ||
                          book.cover?.includes("covers.isbndb.com") ||
                          book.cover?.includes("unsplash.com")
                        }
                        priority={false}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      {book.reason && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm",
                            book.reason.includes("read this")
                              ? "bg-indigo-500/90 text-white"
                              : book.reason === "Popular right now"
                              ? "bg-amber-500/90 text-white"
                              : "bg-black/60 text-white/90"
                          )}>
                            {book.reason.includes("read this") ? "👤" : book.reason === "Popular right now" ? "🔥" : "✦"}
                            {" "}{book.reason}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
                        {book.title}
                      </h3>
                      {book.authors && book.authors.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {book.authors.join(", ")}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {formattedDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            <span>{formattedDate}</span>
                          </div>
                        )}
                        {book.averageRating && book.ratingsCount && (
                          <div className="flex items-center gap-1">
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                            <span>{book.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sentinel — positioned at the bottom; observer only fires after scrollY > 100 */}
      {hasMore && (
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-8">
          {isLoading && (
            <MorphingSquare className="mt-8 text-sm text-muted-foreground" message="Loading books..." />
          )}
        </div>
      )}
    </>
  );
}
