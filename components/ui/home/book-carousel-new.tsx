"use client";

import * as React from "react";
import { motion, useAnimation } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";

// TypeScript interface for each book in the carousel
export interface BookCarouselBook {
  id: string;
  title: string;
  author: string;
  cover: string;
}

// Props for the main BookCarousel component
export interface BookCarouselProps {
  title: string;
  subtitle: string;
  books: BookCarouselBook[];
  className?: string;
}

// Sub-component for individual book cards in the carousel
const BookCard = ({ book }: { book: BookCarouselBook }) => {
  const router = useRouter();

  return (
    <motion.div
      className="group w-[140px] flex-shrink-0 cursor-pointer"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={() => {
        try {
          router.push(`/b/${book.id}`);
        } catch (error) {
          console.error("Navigation error:", error);
        }
      }}
    >
      <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="relative aspect-[2/3] overflow-hidden">
          <Image
            src={book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
            alt={`${book.title} cover`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="140px"
            quality={100}
            unoptimized={
              book.cover?.includes('isbndb.com') ||
              book.cover?.includes('images.isbndb.com') ||
              book.cover?.includes('covers.isbndb.com') ||
              true
            }
          />
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">{book.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground truncate">{book.author}</p>
        </div>
      </div>
    </motion.div>
  );
};

// View All Books Dialog Component
const ViewAllBooksDialog = ({ 
  open, 
  onOpenChange, 
  title, 
  books 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  title: string;
  books: BookCarouselBook[];
}) => {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm">
            Browse all {books.length} books
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3 sm:p-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="group flex flex-col gap-2 cursor-pointer"
                onClick={() => {
                  try {
                  router.push(`/b/${book.id}`);
                  onOpenChange(false);
                  } catch (error) {
                    console.error("Navigation error:", error);
                  }
                }}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted shadow-sm">
                  <Image
                    src={book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
                    alt={`${book.title} cover`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    quality={100}
                    unoptimized={
                      book.cover?.includes('isbndb.com') ||
                      book.cover?.includes('images.isbndb.com') ||
                      book.cover?.includes('covers.isbndb.com') ||
                      true
                    }
                  />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{book.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main BookCarousel component
export const BookCarousel = React.forwardRef<HTMLDivElement, BookCarouselProps>(
  ({ title, subtitle, books, className }, ref) => {
    const carouselRef = React.useRef<HTMLDivElement>(null);
    const controls = useAnimation();
    const [isAtStart, setIsAtStart] = React.useState(true);
    const [isAtEnd, setIsAtEnd] = React.useState(false);
    const [viewAllOpen, setViewAllOpen] = React.useState(false);

    // Function to scroll the carousel
    const scroll = (direction: "left" | "right") => {
      if (carouselRef.current) {
        const scrollAmount = carouselRef.current.clientWidth * 0.8;
        const newScrollLeft =
          carouselRef.current.scrollLeft + (direction === "right" ? scrollAmount : -scrollAmount);

        controls.start({
          x: -newScrollLeft,
          transition: { type: "spring", stiffness: 300, damping: 30 },
        });

        carouselRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
      }
    };

    // Check scroll position to enable/disable navigation buttons
    const checkScrollPosition = React.useCallback(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        setIsAtStart(scrollLeft < 10);
        setIsAtEnd(scrollWidth - scrollLeft - clientWidth < 10);
      }
    }, []);

    React.useEffect(() => {
      const currentCarousel = carouselRef.current;
      if (currentCarousel) {
        currentCarousel.addEventListener("scroll", checkScrollPosition);
        checkScrollPosition(); // Initial check
      }

      return () => {
        if (currentCarousel) {
          currentCarousel.removeEventListener("scroll", checkScrollPosition);
        }
      };
    }, [checkScrollPosition, books]);

    if (books.length === 0) {
      return null;
    }

    return (
      <>
        <div
          ref={ref}
          className={cn("w-full rounded-2xl border bg-card p-3 shadow-sm md:p-4", className)}
        >
          <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
            {/* Left: Title Section */}
            <div className="flex flex-col items-center text-center lg:col-span-3 lg:items-start lg:text-left">
              <h2 className="mt-2 text-lg font-bold text-primary">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              <Button 
                variant="outline" 
                className="mt-6 w-full max-w-xs lg:w-auto" 
                onClick={() => setViewAllOpen(true)}
              >
                View all books
              </Button>
            </div>

            {/* Right: Carousel Section */}
            <div className="relative lg:col-span-9">
              <div ref={carouselRef} className="overflow-x-auto scrollbar-hide">
                <motion.div
                  className="flex gap-4 px-1 py-2"
                  animate={controls}
                >
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </motion.div>
              </div>

              {/* Navigation Buttons */}
              {!isAtStart && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-9 w-9 shadow-md z-10 hidden md:flex"
                  onClick={() => scroll("left")}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              {!isAtEnd && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full h-9 w-9 shadow-md z-10 hidden md:flex"
                  onClick={() => scroll("right")}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* View All Books Dialog */}
        <ViewAllBooksDialog
          open={viewAllOpen}
          onOpenChange={setViewAllOpen}
          title={title}
          books={books}
        />
      </>
    );
  }
);

BookCarousel.displayName = "BookCarousel";

