"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { motion } from "framer-motion";
import Image from "next/image";
import BookLoader from "@/components/ui/features/book-loader";
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

type BookFromAPI = {
  id?: string;
  _id?: string;
  title?: string;
  authors?: string[] | string;
  author?: string;
  description?: string;
  publishedDate?: string;
  cover?: string;
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
  const { user } = useAuth();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const allBooksRef = React.useRef<Book[]>([]);
  const serverPageRef = React.useRef(1); // tracks which onboarding server page we last fetched
  // Fallback state: once the DB-backed onboarding feed runs dry we flip to the
  // ISBNdb worldwide endpoint and stay there for the rest of the session.
  const useIsbndbRef = React.useRef(false);
  const isbndbPageRef = React.useRef(0);
  const onboardingEmptyStreakRef = React.useRef(0);
  const isbndbEmptyStreakRef = React.useRef(0);

  // Fetch books (latest + personalized recommendations + friends' liked books)
  React.useEffect(() => {
    // Background fetch function (doesn't show loading state)
    const fetchBooksInBackground = async () => {
      try {
        const latestResponse = await fetch(`/api/books/latest?page=1&pageSize=200`);
        const latestData = latestResponse.ok ? await latestResponse.json() : { books: [] };

        const bookMap = new Map<string, Book>();
        
        (latestData.books || []).forEach((book: BookFromAPI) => {
          const bookId = book.id || book._id;
          if (bookId && book.cover && !bookMap.has(bookId)) {
            bookMap.set(bookId, {
              id: bookId,
              _id: book._id || bookId,
              title: book.title || "Unknown Title",
              authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : ["Unknown Author"]),
              description: book.description || "",
              publishedDate: book.publishedDate || "",
              cover: book.cover,
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

        if (user?.id) {
          const [recommendationsResponse, onboardingResponse, friendsResponse] = await Promise.all([
            fetch(`/api/books/personalized?type=recommended&limit=100`),
            fetch(`/api/books/personalized?type=onboarding&limit=100`),
            fetch(`/api/books/personalized?type=friends&limit=100`),
          ]);

          const recommendationsData = recommendationsResponse.ok ? await recommendationsResponse.json() : { books: [] };
          const onboardingData = onboardingResponse.ok ? await onboardingResponse.json() : { books: [] };
          const friendsData = friendsResponse.ok ? await friendsResponse.json() : { books: [] };

          [onboardingData.books || [], recommendationsData.books || [], friendsData.books || []].forEach((bookList: BookFromAPI[]) => {
            bookList.forEach((book: BookFromAPI) => {
              const bookId = book.id || book._id;
              if (bookId && !bookMap.has(bookId)) {
                bookMap.set(bookId, {
                  id: bookId,
                  _id: book._id || bookId,
                  title: book.title || "Unknown Title",
                  authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : (book.author ? [book.author] : ["Unknown Author"])),
                  description: book.description || "",
                  publishedDate: book.publishedDate || "",
                  cover: book.cover || "",
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
          });
        }

        const combinedBooks = Array.from(bookMap.values());
        
        if (typeof window !== 'undefined' && combinedBooks.length > 0) {
          localStorage.setItem('home_mobile_books_data', JSON.stringify(combinedBooks));
          localStorage.setItem('home_mobile_books_timestamp', Date.now().toString());
          allBooksRef.current = combinedBooks;
          setBooks(combinedBooks.slice(0, BOOKS_PER_PAGE));
          setHasMore(combinedBooks.length > BOOKS_PER_PAGE);
        }
      } catch (error) {
        console.error("Error in background fetch:", error);
      }
    };

    // Check if this is an explicit page refresh
    const isExplicitRefresh = typeof window !== 'undefined' && 
      (performance.navigation?.type === 1 || 
       (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload');

    // Check if we have cached data in localStorage
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem('home_mobile_books_data') : null;
    const cachedTimestamp = typeof window !== 'undefined' ? localStorage.getItem('home_mobile_books_timestamp') : null;
    
    // Use cached data if it exists and not an explicit refresh (or cache is fresh)
    if (cachedData && cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp);
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
      
      if (!isExplicitRefresh || age < CACHE_DURATION) {
        try {
          const parsed = JSON.parse(cachedData);
          allBooksRef.current = parsed;
          setBooks(parsed.slice(0, BOOKS_PER_PAGE));
          setHasMore(parsed.length > BOOKS_PER_PAGE);
          setIsLoading(false);
          
          // If cache is old but we're using it, refresh in background
          if (age >= CACHE_DURATION) {
            fetchBooksInBackground();
          }
          return;
        } catch {
          // If parsing fails, continue to fetch
        }
      }
    }

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
        (latestData.books || []).forEach((book: BookFromAPI) => {
          const bookId = book.id || book._id;
          if (bookId && book.cover && !bookMap.has(bookId)) {
            bookMap.set(bookId, {
              id: bookId,
              _id: book._id || bookId,
              title: book.title || "Unknown Title",
              authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : ["Unknown Author"]),
              description: book.description || "",
              publishedDate: book.publishedDate || "",
              cover: book.cover,
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
        if (user?.id) {
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
          (onboardingData.books || []).forEach((book: BookFromAPI) => {
            const bookId = book.id || book._id;
            if (bookId && book.cover && !bookMap.has(bookId)) {
              bookMap.set(bookId, {
                id: bookId,
                _id: book._id || bookId,
                title: book.title || "Unknown Title",
                authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : (book.author ? [book.author] : ["Unknown Author"])),
                description: book.description || "",
                publishedDate: book.publishedDate || "",
                cover: book.cover,
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
          (recommendationsData.books || []).forEach((book: BookFromAPI) => {
            const bookId = book.id || book._id;
            if (bookId && book.cover && !bookMap.has(bookId)) {
              bookMap.set(bookId, {
                id: bookId,
                _id: book._id || bookId,
                title: book.title || "Unknown Title",
                authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : (book.author ? [book.author] : ["Unknown Author"])),
                description: book.description || "",
                publishedDate: book.publishedDate || "",
                cover: book.cover,
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
          (friendsData.books || []).forEach((book: BookFromAPI) => {
            const bookId = book.id || book._id;
            if (bookId && book.cover && !bookMap.has(bookId)) {
              bookMap.set(bookId, {
                id: bookId,
                _id: book._id || bookId,
                title: book.title || "Unknown Title",
                authors: Array.isArray(book.authors) ? book.authors : (book.authors ? [book.authors] : (book.author ? [book.author] : ["Unknown Author"])),
                description: book.description || "",
                publishedDate: book.publishedDate || "",
                cover: book.cover,
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
        
        // Cache data in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('home_mobile_books_data', JSON.stringify(combinedBooks));
          localStorage.setItem('home_mobile_books_timestamp', Date.now().toString());
        }
        
        // Load first page
        setBooks(combinedBooks.slice(0, BOOKS_PER_PAGE));
        setHasMore(combinedBooks.length > BOOKS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching books:", error);
        // Don't clear books if we already have cached data showing
        if (allBooksRef.current.length === 0) {
          setBooks([]);
          setHasMore(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [user?.id]);

  // Transform a raw API book shape into the local Book type.
  const mapApiBook = React.useCallback((b: BookFromAPI): Book | null => {
    const id = b.id || b._id;
    if (!id || !b.cover) return null;
    return {
      id,
      _id: b._id || id,
      title: b.title || "Unknown Title",
      authors: Array.isArray(b.authors)
        ? b.authors
        : b.authors
        ? [b.authors]
        : b.author
        ? [b.author]
        : ["Unknown Author"],
      description: b.description || "",
      publishedDate: b.publishedDate || "",
      cover: b.cover,
      isbn: b.isbn,
      isbn13: b.isbn13,
      openLibraryId: b.openLibraryId,
      isbndbId: b.isbndbId,
      averageRating: b.averageRating,
      ratingsCount: b.ratingsCount,
      pageCount: b.pageCount,
      categories: b.categories,
      publisher: b.publisher,
    };
  }, []);

  // Load more books when scrolling.
  // Strategy:
  //  1. Drain the in-memory pool (filled from initial fetches + prior loadMore calls).
  //  2. Top up the pool from the onboarding endless-feed endpoint.
  //  3. After 2 empty onboarding pages in a row, flip to the ISBNdb worldwide
  //     fallback so scrolling keeps working even when our DB is exhausted.
  const loadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const startIndex = (nextPage - 1) * BOOKS_PER_PAGE;
      const endIndex = startIndex + BOOKS_PER_PAGE;

      // Top up the pool if the next slice isn't fully covered yet.
      if (endIndex > allBooksRef.current.length) {
        const existingIds = new Set(allBooksRef.current.map((b) => b.id));
        let addedThisRound = 0;

        if (!useIsbndbRef.current) {
          const nextServerPage = serverPageRef.current + 1;
          const resp = await fetch(
            `/api/books/personalized?type=onboarding&page=${nextServerPage}&limit=60`
          );
          if (resp.ok) {
            const data = await resp.json() as { books?: BookFromAPI[] };
            const newBooks: Book[] = (data.books || [])
              .map(mapApiBook)
              .filter((b): b is Book => !!b && !existingIds.has(b.id));

            if (newBooks.length > 0) {
              allBooksRef.current = [...allBooksRef.current, ...newBooks];
              serverPageRef.current = nextServerPage;
              onboardingEmptyStreakRef.current = 0;
              addedThisRound = newBooks.length;
            } else {
              serverPageRef.current = nextServerPage;
              onboardingEmptyStreakRef.current += 1;
              if (onboardingEmptyStreakRef.current >= 2) {
                useIsbndbRef.current = true;
              }
            }
          } else {
            // HTTP error → flip to the fallback immediately.
            useIsbndbRef.current = true;
          }
        }

        // Only hit ISBNdb if we still don't have enough books. This way a successful
        // onboarding page won't trigger an extra (unused) ISBNdb request.
        if (useIsbndbRef.current && endIndex > allBooksRef.current.length) {
          const nextIsbndbPage = isbndbPageRef.current + 1;
          const isbndbResp = await fetch(
            `/api/books/from-isbndb?page=${nextIsbndbPage}&limit=20`
          );
          if (isbndbResp.ok) {
            const data = await isbndbResp.json() as { books?: BookFromAPI[] };
            const existingIdsNow = new Set(allBooksRef.current.map((b) => b.id));
            const newBooks: Book[] = (data.books || [])
              .map(mapApiBook)
              .filter((b): b is Book => !!b && !existingIdsNow.has(b.id));

            if (newBooks.length > 0) {
              allBooksRef.current = [...allBooksRef.current, ...newBooks];
              isbndbPageRef.current = nextIsbndbPage;
              isbndbEmptyStreakRef.current = 0;
              addedThisRound += newBooks.length;
            } else {
              isbndbPageRef.current = nextIsbndbPage;
              isbndbEmptyStreakRef.current += 1;
            }
          } else {
            isbndbPageRef.current = nextIsbndbPage;
            isbndbEmptyStreakRef.current += 1;
          }
        }

        // If both sources are exhausted and nothing new came in, stop infinite scroll.
        if (addedThisRound === 0 && isbndbEmptyStreakRef.current >= 5) {
          setHasMore(false);
          return;
        }
      }

      const nextBooks = allBooksRef.current.slice(startIndex, endIndex);
      if (nextBooks.length > 0) {
        setBooks((prev) => [...prev, ...nextBooks]);
        setPage(nextPage);
        setHasMore(true);
      } else if (isbndbEmptyStreakRef.current >= 5) {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, isLoadingMore, hasMore, mapApiBook]);

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
          <BookLoader size="md" speed="fast" loadingText="Loading your feed..." />
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
                    src={book.cover}
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
            <BookLoader size="sm" speed="fast" loadingText="Loading more..." />
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && books.length > 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            You&apos;ve reached the end of your feed
          </div>
        )}
      </div>
    </div>
  );
}

