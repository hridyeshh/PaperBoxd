"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import { createBookSlug } from "@/lib/utils/book-slug";
import { useRouter } from "next/navigation";
import { MorphingSquare } from "@/components/ui/morphing-square";

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
};

interface PinterestGridProps {
  books: Book[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function PinterestGrid({ books, onLoadMore, hasMore = false, isLoading = false }: PinterestGridProps) {
  const router = useRouter();
  const [hoveredCardId, setHoveredCardId] = React.useState<string | null>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Calculate scale variations for visual interest (vary scale, not crop)
  // This creates visual variety while respecting the book cover's aspect ratio
  const getScaleVariation = React.useCallback((index: number) => {
    // Pattern: 1.0, 1.05, 0.95, 1.08, 0.92, 1.03, 0.97, 1.06, 0.94, 1.02
    const scalePattern = [1.0, 1.05, 0.95, 1.08, 0.92, 1.03, 0.97, 1.06, 0.94, 1.02];
    return scalePattern[index % scalePattern.length];
  }, []);

  // Infinite scroll with Intersection Observer
  React.useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const currentRef = loadMoreRef.current;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  const handleCardClick = (book: Book) => {
    // Priority: ISBN-13 > ISBN-10 > MongoDB ObjectId > Title slug
    const bookId = book.isbn13 || book.isbn || book._id || book.id;
    
    if (bookId) {
      // Check if it's an ISBN
      const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
      // Check if it's a MongoDB ObjectId (24 hex characters)
      const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
      // Check if it's a valid ID format (alphanumeric, no spaces, no +)
      const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");
      
      // Use ID directly if it's a recognized format
      if (isISBN || isMongoObjectId || isValidId) {
        router.push(`/b/${bookId}`);
      } else {
        // Create slug from title for unrecognized formats
        const slug = createBookSlug(book.title, book.isbn13 || book.isbn, bookId);
        router.push(`/b/${slug}`);
      }
    } else {
      // Fallback to slug if no ID available
      const slug = createBookSlug(book.title);
      router.push(`/b/${slug}`);
    }
  };

  // Format published date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      if (dateStr.length === 4) {
        return dateStr;
      } else if (dateStr.length === 7) {
        const [year, month] = dateStr.split("-");
        return format(new Date(parseInt(year), parseInt(month) - 1), "MMM yyyy");
      } else {
        return format(new Date(dateStr), "MMM d, yyyy");
      }
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="w-full masonry-grid">
        {books.map((book, index) => {
          const formattedDate = formatDate(book.publishedDate);
          const isHovered = hoveredCardId === book.id;
          const isDimmed = hoveredCardId !== null && hoveredCardId !== book.id;
          const baseScale = getScaleVariation(index);

          return (
            <motion.div
              key={book.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: isDimmed ? 0.4 : 1,
                scale: isHovered ? 1.02 : 1,
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="cursor-pointer group"
              onClick={() => handleCardClick(book)}
              onMouseEnter={() => setHoveredCardId(book.id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              <div className="relative rounded-2xl overflow-hidden bg-background border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                {/* Book Cover Image - Respects intrinsic 2:3 aspect ratio */}
                <div className="relative w-full aspect-[2/3] overflow-hidden bg-muted">
                  <Image
                    src={book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
                    alt={book.title}
                    fill
                    className="object-cover object-center transition-transform duration-500"
                    style={{
                      transform: isHovered 
                        ? `scale(${baseScale * 1.1})` 
                        : `scale(${baseScale})`,
                    }}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 200px"
                    unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || book.cover?.includes('unsplash.com')}
                    priority={false}
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>

                {/* Book Info */}
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

      {/* Load more trigger */}
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

