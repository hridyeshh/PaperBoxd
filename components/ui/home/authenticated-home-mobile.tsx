"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { createBookSlug } from "@/lib/utils/book-slug";

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
  openLibraryId?: string;
  isbndbId?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  categories?: string[];
  publisher?: string;
};

const BOOKS_PER_PAGE = 20; // 2 columns x 10 rows = 20 books per load

export function AuthenticatedHomeMobile() {
  const router = useRouter();
  const { data: session } = useSession();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const allBooksRef = React.useRef<Book[]>([]);

  // Fetch books (latest + personalized recommendations + friends' liked books)
  React.useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        
        // Fetch latest books (always fetch)
        const latestResponse = await fetch(
          `/api/books/latest?page=1&pageSize=200`
        );
        const latestData = latestResponse.ok ? await latestResponse.json() : { books: [] };

        // Combine and deduplicate books
        const bookMap = new Map<string, Book>();
        
        // Add latest books first (they get priority)
        (latestData.books || []).forEach((book: any) => {
          const bookId = book.id || book._id;
          if (bookId && !bookMap.has(bookId)) {
            bookMap.set(bookId, {
              id: bookId,
              _id: book._id || bookId,
              title: book.title || "Unknown Title",
              authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : ["Unknown Author"]),
              description: book.description || "",
              publishedDate: book.publishedDate || "",
              cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
              isbn: book.isbn,
              isbn13: book.isbn13,
              openLibraryId: book.openLibraryId,
              isbndbId: book.isbndbId,
              averageRating: book.averageRating,
              ratingsCount: book.ratingsCount,
              pageCount: book.pageCount,
              categories: book.categories,
              publisher: book.publisher,
            });
          }
        });

        // If authenticated, also fetch personalized recommendations, onboarding books, and friends' liked books
        if (session?.user?.id) {
          // Fetch all personalized sources in parallel
          const [recommendationsResponse, onboardingResponse, friendsResponse] = await Promise.all([
            fetch(`/api/books/personalized?type=recommended&limit=100`),
            fetch(`/api/books/personalized?type=onboarding&limit=100`),
            fetch(`/api/books/personalized?type=friends&limit=100`),
          ]);

          const recommendationsData = recommendationsResponse.ok ? await recommendationsResponse.json() : { books: [] };
          const onboardingData = onboardingResponse.ok ? await onboardingResponse.json() : { books: [] };
          const friendsData = friendsResponse.ok ? await friendsResponse.json() : { books: [] };

          // Add onboarding-based books first (they get priority as they match user's explicit preferences)
          (onboardingData.books || []).forEach((book: any) => {
            const bookId = book.id || book._id;
            if (bookId && !bookMap.has(bookId)) {
              bookMap.set(bookId, {
                id: bookId,
                _id: book._id || bookId,
                title: book.title || "Unknown Title",
                authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : (book.author ? [book.author] : ["Unknown Author"])),
                description: book.description || "",
                publishedDate: book.publishedDate || "",
                cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                isbn: book.isbn,
                isbn13: book.isbn13,
                openLibraryId: book.openLibraryId,
                isbndbId: book.isbndbId,
                averageRating: book.averageRating,
                ratingsCount: book.ratingsCount,
                pageCount: book.pageCount,
                categories: book.categories,
                publisher: book.publisher,
              });
            }
          });

          // Add recommended books (only if not already in map)
          (recommendationsData.books || []).forEach((book: any) => {
            const bookId = book.id || book._id;
            if (bookId && !bookMap.has(bookId)) {
              bookMap.set(bookId, {
                id: bookId,
                _id: book._id || bookId,
                title: book.title || "Unknown Title",
                authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : (book.author ? [book.author] : ["Unknown Author"])),
                description: book.description || "",
                publishedDate: book.publishedDate || "",
                cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                isbn: book.isbn,
                isbn13: book.isbn13,
                openLibraryId: book.openLibraryId,
                isbndbId: book.isbndbId,
                averageRating: book.averageRating,
                ratingsCount: book.ratingsCount,
                pageCount: book.pageCount,
                categories: book.categories,
                publisher: book.publisher,
              });
            }
          });

          // Add friends' liked books (only if not already in map)
          (friendsData.books || []).forEach((book: any) => {
            const bookId = book.id || book._id;
            if (bookId && !bookMap.has(bookId)) {
              bookMap.set(bookId, {
                id: bookId,
                _id: book._id || bookId,
                title: book.title || "Unknown Title",
                authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : (book.author ? [book.author] : ["Unknown Author"])),
                description: book.description || "",
                publishedDate: book.publishedDate || "",
                cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                isbn: book.isbn,
                isbn13: book.isbn13,
                openLibraryId: book.openLibraryId,
                isbndbId: book.isbndbId,
                averageRating: book.averageRating,
                ratingsCount: book.ratingsCount,
                pageCount: book.pageCount,
                categories: book.categories,
                publisher: book.publisher,
              });
            }
          });
        }

        const combinedBooks = Array.from(bookMap.values());
        allBooksRef.current = combinedBooks;
        
        // Load first page
        setBooks(combinedBooks.slice(0, BOOKS_PER_PAGE));
        setHasMore(combinedBooks.length > BOOKS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching books:", error);
        setBooks([]);
        allBooksRef.current = [];
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [session?.user?.id]);

  // Load more books when scrolling
  const loadMore = React.useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    const startIndex = nextPage * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    const nextBooks = allBooksRef.current.slice(startIndex, endIndex);

    if (nextBooks.length > 0) {
      setBooks((prev) => [...prev, ...nextBooks]);
      setPage(nextPage);
      setHasMore(endIndex < allBooksRef.current.length);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  }, [page, isLoadingMore, hasMore]);

  // Infinite scroll detection
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Handle card click to navigate to book detail page
  const handleCardClick = React.useCallback((book: Book) => {
    const bookId = book.isbn13 || book.isbn || book.openLibraryId || book.isbndbId || book._id || book.id;
    
    if (bookId && typeof bookId === 'string') {
      const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
      const isOpenLibraryId = bookId.startsWith("OL") || bookId.startsWith("/works/");
      const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
      const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");
      
      if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
        router.push(`/b/${bookId}`);
      } else {
        const slug = createBookSlug(book.title, book.isbn13 || book.isbn, bookId);
        router.push(`/b/${slug}`);
      }
    } else {
      const slug = createBookSlug(book.title);
      router.push(`/b/${slug}`);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center min-h-screen pb-8">
          <TetrisLoading size="md" speed="fast" loadingText="Loading your feed..." />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-24">
      {/* 2x2 Grid Feed */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {books.map((book) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="cursor-pointer group"
              onClick={() => handleCardClick(book)}
            >
              <div className="relative rounded-xl overflow-hidden bg-background border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300">
                {/* Book Cover Image */}
                <div className="relative w-full aspect-[2/3] overflow-hidden bg-muted">
                  <Image
                    src={book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
                    alt={book.title}
                    fill
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    sizes="50vw"
                    unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || book.cover?.includes('unsplash.com')}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>

                {/* Book Info */}
                <div className="p-3 space-y-1">
                  <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {book.authors?.join(", ") || "Unknown Author"}
                  </p>
                  {book.averageRating && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>★</span>
                      <span>{book.averageRating.toFixed(1)}</span>
                      {book.ratingsCount && (
                        <span className="text-muted-foreground/70">
                          ({book.ratingsCount})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-8">
            <TetrisLoading size="sm" speed="fast" loadingText="Loading more..." />
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && books.length > 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            You've reached the end of your feed
          </div>
        )}
      </div>
    </div>
  );
}

