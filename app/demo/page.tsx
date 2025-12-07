"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { stripHtmlTags } from "@/lib/utils";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { BookShareButton } from "@/components/ui/features/book-share-button";

interface Book {
  id: string;
  _id?: string;
  title: string;
  authors?: string[];
  description?: string;
  cover?: string;
  volumeInfo?: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      extraLarge?: string;
      large?: string;
      medium?: string;
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

export default function DemoPage() {
  const [book, setBook] = React.useState<Book | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch multiple books to find one with a cover image
        const response = await fetch("/api/books/latest?pageSize=10");
        
        if (!response.ok) {
          throw new Error("Failed to fetch book");
        }

        const data = await response.json();
        const books = data.books || [];

        if (books.length === 0) {
          throw new Error("No books found in database");
        }

        // Find the first book with a cover image
        let fetchedBook = books.find((b: { cover?: string }) => 
          b.cover && 
          b.cover !== "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80" &&
          b.cover.trim() !== ""
        );

        // If no book with cover found, use the first book
        if (!fetchedBook) {
          fetchedBook = books[0];
        }

        console.log("Fetched book:", {
          title: fetchedBook.title,
          cover: fetchedBook.cover,
          hasCover: !!fetchedBook.cover
        });
        
        // Transform to match our Book interface
        const bookData: Book = {
          id: fetchedBook.id || fetchedBook._id || "",
          _id: fetchedBook._id,
          title: fetchedBook.title || "Untitled",
          authors: fetchedBook.authors || [],
          description: fetchedBook.description || "",
          cover: fetchedBook.cover || "",
          volumeInfo: {
            title: fetchedBook.title || "Untitled",
            authors: fetchedBook.authors || [],
            description: fetchedBook.description || "",
            imageLinks: {
              extraLarge: fetchedBook.cover,
              large: fetchedBook.cover,
              medium: fetchedBook.cover,
              thumbnail: fetchedBook.cover,
              smallThumbnail: fetchedBook.cover,
            },
          },
        };

        setBook(bookData);
      } catch (err) {
        console.error("Error fetching book:", err);
        setError(err instanceof Error ? err.message : "Failed to load book");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, []);

  // Get the best cover image
  const coverImage = book?.volumeInfo?.imageLinks?.extraLarge ||
                     book?.volumeInfo?.imageLinks?.large ||
                     book?.volumeInfo?.imageLinks?.medium ||
                     book?.volumeInfo?.imageLinks?.thumbnail ||
                     book?.volumeInfo?.imageLinks?.smallThumbnail ||
                     book?.cover ||
                     "";

  const description = book?.volumeInfo?.description || book?.description || "";

  // Debug: Log cover image
  React.useEffect(() => {
    if (book) {
      console.log("Book cover image:", {
        cover: book.cover,
        volumeInfoImageLinks: book.volumeInfo?.imageLinks,
        finalCoverImage: coverImage,
        hasCover: !!coverImage && coverImage.trim() !== ""
      });
    }
  }, [book, coverImage]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TetrisLoading />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground">{error || "Book not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Left: Book Cover */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <div className="relative aspect-[2/3] w-full max-w-[300px] mx-auto lg:mx-0 overflow-hidden rounded-2xl shadow-2xl bg-muted">
              {coverImage && coverImage.trim() !== "" ? (
                <Image
                  src={coverImage}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 300px"
                  quality={100}
                  unoptimized={coverImage?.includes('isbndb.com') || coverImage?.includes('images.isbndb.com') || coverImage?.includes('covers.isbndb.com') || true}
                  priority
                  onError={(e) => {
                    console.error("Image failed to load:", coverImage);
                    const target = e.target as HTMLImageElement;
                    if (target && target.parentElement) {
                      target.style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">No cover available</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Book Details */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Book Title - Big Size */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                {book.title}
              </h1>
              {book.authors && book.authors.length > 0 && (
                <p className="text-xl sm:text-2xl text-muted-foreground mt-3">
                  by {book.authors.join(", ")}
                </p>
              )}
            </div>

            {/* Share Button */}
            <div className="pt-2">
              <BookShareButton
                title={book.title}
                author={book.authors?.join(", ")}
                coverUrl={coverImage}
                pageCount={undefined}
                buttonVariant="outline"
                size="lg"
              />
            </div>

            {/* Summary Card - Same style as book page */}
            {description && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Description</h2>
                {/* Card with gradient behind - same style as timeline */}
                <div className="relative rounded-lg p-6 md:p-8">
                  {/* Gradient background element */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 -z-10" />
                  {/* Card content */}
                  <div className="relative bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 p-6 md:p-8 -m-6 md:-m-8">
                    <p 
                      className="text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap"
                      style={{ fontFamily: '"Helvetica", sans-serif' }}
                    >
                      {stripHtmlTags(description)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

