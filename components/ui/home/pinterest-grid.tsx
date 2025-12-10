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
  const [cardHeights, setCardHeights] = React.useState<Record<string, number>>({});
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Calculate card heights for Pinterest effect
  React.useEffect(() => {
    const heights: Record<string, number> = {};
    books.forEach((book, index) => {
      // Create varying heights: short (280px), medium (340px), tall (400px)
      // Pattern: short, medium, tall, medium, short, tall, medium, short, tall, medium
      const heightPattern = [280, 340, 400, 340, 280, 400, 340, 280, 400, 340];
      heights[book.id] = heightPattern[index % heightPattern.length];
    });
    setCardHeights(heights);
  }, [books]);

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
        {books.map((book) => {
          const height = cardHeights[book.id] || 320;
          const formattedDate = formatDate(book.publishedDate);

          return (
            <motion.div
              key={book.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="cursor-pointer group"
              onClick={() => handleCardClick(book)}
            >
              <div className="relative rounded-2xl overflow-hidden bg-background border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Book Cover Image */}
                <div 
                  className="relative w-full overflow-hidden bg-muted"
                  style={{ height: `${height}px` }}
                >
                  <Image
                    src={book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
                    alt={book.title}
                    fill
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 200px"
                    unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || book.cover?.includes('unsplash.com')}
                    priority={false}
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
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

