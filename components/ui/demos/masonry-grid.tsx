"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Calendar, BookOpen, Star } from "lucide-react";
import { format } from "date-fns";
import { stripHtmlTags } from "@/lib/utils";

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

interface MasonryGridProps {
  books: Book[];
  onCardClick?: (book: Book) => void;
}

export function MasonryGrid({ books, onCardClick }: MasonryGridProps) {
  const [selectedBook, setSelectedBook] = React.useState<Book | null>(null);
  const [cardHeights, setCardHeights] = React.useState<Record<string, number>>({});

  // Calculate card heights based on image aspect ratio
  // Book covers are typically 2:3 aspect ratio, but we'll vary heights for Pinterest effect
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

  const handleCardClick = (book: Book) => {
    if (onCardClick) {
      onCardClick(book);
    } else {
      setSelectedBook(book);
    }
  };

  const handleClose = () => {
    setSelectedBook(null);
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
      <div className="grid grid-cols-5 gap-4">
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
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
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

      {/* Expanded View Modal */}
      <AnimatePresence>
        {selectedBook && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={handleClose}
            >
              <div
                className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative aspect-[2/3] w-full max-w-xs mx-auto">
                  <Image
                    src={selectedBook.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
                    alt={selectedBook.title}
                    fill
                    className="object-cover rounded-t-2xl"
                    sizes="400px"
                    unoptimized={selectedBook.cover?.includes('isbndb.com') || selectedBook.cover?.includes('images.isbndb.com') || selectedBook.cover?.includes('covers.isbndb.com') || selectedBook.cover?.includes('unsplash.com')}
                  />
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {selectedBook.title}
                    </h2>
                    {selectedBook.authors && selectedBook.authors.length > 0 && (
                      <p className="text-muted-foreground">
                        by {selectedBook.authors.join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {selectedBook.publishedDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4" />
                        <span>{formatDate(selectedBook.publishedDate)}</span>
                      </div>
                    )}
                    {selectedBook.averageRating && selectedBook.ratingsCount && (
                      <div className="flex items-center gap-2">
                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                        <span>
                          {selectedBook.averageRating.toFixed(1)} ({selectedBook.ratingsCount.toLocaleString()} ratings)
                        </span>
                      </div>
                    )}
                    {selectedBook.pageCount && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4" />
                        <span>{selectedBook.pageCount} pages</span>
                      </div>
                    )}
                  </div>

                  {selectedBook.description && (
                    <div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                        {stripHtmlTags(selectedBook.description)}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (onCardClick) {
                        onCardClick(selectedBook);
                      }
                      handleClose();
                    }}
                    className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

