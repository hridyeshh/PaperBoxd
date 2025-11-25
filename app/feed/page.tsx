"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";

import { Header } from "@/components/ui/layout/header-with-search";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { MasonryGrid } from "@/components/ui/demos/masonry-grid";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/primitives/pagination";
import { createBookSlug } from "@/lib/utils/book-slug";
import { useIsMobile } from "@/hooks/use-media-query";

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

const BOOKS_PAGE_SIZE = 35; // 5x7 grid = 35 books per page
const MOBILE_BOOKS_PER_PAGE = 20; // 2 columns x 10 rows = 20 books per load

export default function BooksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isMobile = useIsMobile();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [allBooks, setAllBooks] = React.useState<Book[]>([]); // Store all books for pagination
  const [checkingOnboarding, setCheckingOnboarding] = React.useState(false);
  
  // Mobile infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [mobilePage, setMobilePage] = React.useState(1);
  const allBooksRef = React.useRef<Book[]>([]);

  // Check onboarding status ONLY for new users (not existing users)
  React.useEffect(() => {
    if (status === "loading" || !isAuthenticated || !session?.user) {
      return;
    }

    if (status === "authenticated" && session?.user) {
      const checkOnboarding = async () => {
        try {
          setCheckingOnboarding(true);
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            
            // Only check onboarding for new users
            // Existing users should go directly to feed (no redirect)
            if (data.isNewUser) {
              // If no username, redirect to choose username
              if (!data.hasUsername) {
                router.replace("/choose-username");
                return;
              }
              
              // If onboarding not completed, redirect to onboarding
              if (!data.completed) {
                router.replace("/onboarding");
                return;
              }
            }
            // Existing users (not new) - no redirect, show feed
          }
        } catch (error) {
          console.error("Failed to check onboarding status:", error);
        } finally {
          setCheckingOnboarding(false);
        }
      };

      checkOnboarding();
    }
  }, [status, isAuthenticated, session?.user, router]);

  // Fetch all recommendation types
  React.useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);

        // Combine and deduplicate books
        const bookMap = new Map<string, Book>();
        
        type BookFromAPI = {
          id?: string;
          _id?: string;
          title?: string;
          authors?: string | string[];
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

        // If authenticated, fetch all recommendation types
        if (isAuthenticated && session?.user?.id) {
          // Fetch all recommendation types in parallel
          const [recommendedResponse, friendsResponse, favoritesResponse, authorsResponse, genresResponse] = await Promise.all([
            fetch(`/api/books/personalized?type=recommended&limit=100`),
            fetch(`/api/books/personalized?type=friends&limit=100`),
            fetch(`/api/books/personalized?type=favorites&limit=100`),
            fetch(`/api/books/personalized?type=authors&limit=100`),
            fetch(`/api/books/personalized?type=genres&limit=100`),
          ]);

          const recommendedData = recommendedResponse.ok ? await recommendedResponse.json() : { books: [] };
          const friendsData = friendsResponse.ok ? await friendsResponse.json() : { books: [] };
          const favoritesData = favoritesResponse.ok ? await favoritesResponse.json() : { books: [] };
          const authorsData = authorsResponse.ok ? await authorsResponse.json() : { books: [] };
          const genresData = genresResponse.ok ? await genresResponse.json() : { books: [] };

          // Combine all books from all recommendation types
          const allBooksData = [
            ...(recommendedData.books || []),
            ...(friendsData.books || []),
            ...(favoritesData.books || []),
            ...(authorsData.books || []),
            ...(genresData.books || []),
          ];

          // Add all books, removing duplicates
          allBooksData.forEach((book: BookFromAPI) => {
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
        setAllBooks(combinedBooks);
        allBooksRef.current = combinedBooks;
        
        // For mobile: load first page with infinite scroll
        if (isMobile) {
          setBooks(combinedBooks.slice(0, MOBILE_BOOKS_PER_PAGE));
          setHasMore(combinedBooks.length > MOBILE_BOOKS_PER_PAGE);
        } else {
          // For desktop: calculate pagination
        const total = combinedBooks.length;
        const calculatedTotalPages = Math.ceil(total / BOOKS_PAGE_SIZE);
        setTotalPages(calculatedTotalPages);
          // Load first page
          const startIndex = (currentPage - 1) * BOOKS_PAGE_SIZE;
          const endIndex = startIndex + BOOKS_PAGE_SIZE;
          setBooks(combinedBooks.slice(startIndex, endIndex));
        }
      } catch (error) {
        console.error("Error fetching books:", error);
        setBooks([]);
        setAllBooks([]);
        allBooksRef.current = [];
        setTotalPages(1);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [isAuthenticated, session?.user?.id, isMobile, currentPage]);

  // Update displayed books when page changes (desktop only)
  React.useEffect(() => {
    if (!isMobile && allBooks.length > 0) {
      const startIndex = (currentPage - 1) * BOOKS_PAGE_SIZE;
      const endIndex = startIndex + BOOKS_PAGE_SIZE;
      setBooks(allBooks.slice(startIndex, endIndex));
    }
  }, [currentPage, allBooks, isMobile]);

  // Load more books when scrolling (mobile only)
  const loadMore = React.useCallback(() => {
    if (isLoadingMore || !hasMore || !isMobile) return;

    setIsLoadingMore(true);
    const nextPage = mobilePage + 1;
    const startIndex = nextPage * MOBILE_BOOKS_PER_PAGE;
    const endIndex = startIndex + MOBILE_BOOKS_PER_PAGE;
    const nextBooks = allBooksRef.current.slice(startIndex, endIndex);

    if (nextBooks.length > 0) {
      setBooks((prev) => [...prev, ...nextBooks]);
      setMobilePage(nextPage);
      setHasMore(endIndex < allBooksRef.current.length);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  }, [mobilePage, isLoadingMore, hasMore, isMobile]);

  // Infinite scroll detection (mobile only)
  React.useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, isMobile]);


  // Handle card click to navigate to book detail page
  const handleCardClick = React.useCallback((book: Book) => {
    // Priority: ISBN-13 > ISBN-10 > Open Library ID > MongoDB ObjectId > Title slug
    // Prefer ISBN/Open Library IDs as they're more reliable for API lookups
    const bookId = book.isbn13 || book.isbn || book.openLibraryId || book.isbndbId || book._id || book.id;
    
    if (bookId) {
      // Check if it's an ISBN
      const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
      // Check if it's an Open Library ID
      const isOpenLibraryId = bookId.startsWith("OL") || bookId.startsWith("/works/");
      // Check if it's a MongoDB ObjectId (24 hex characters)
      const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
      // Check if it's a valid ID format (alphanumeric, no spaces, no +)
      const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");
      
      // Use ID directly if it's a recognized format
      if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
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
  }, [router]);

  if (isLoading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <TetrisLoading size="md" speed="fast" loadingText={checkingOnboarding ? "Checking..." : "Loading your feed..."} />
          </div>
        </div>
      </div>
    );
  }

  // Mobile view: 2x2 endless grid
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 mt-16">
          <div className="px-4 py-6">
            {books.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center min-h-[400px]">
                <BookOpen className="size-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-foreground">No books found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back later for new releases and recommendations.
                </p>
              </div>
            ) : (
              <>
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
                    You&apos;ve reached the end of your feed
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Desktop view: Masonry grid with pagination
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 mt-16 pb-24 md:pb-8">
        <div className="space-y-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Recommendations
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Personalized picks based on your reading taste, books your friends are enjoying, and more.
            </p>
          </div>

          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center min-h-[400px]">
              <BookOpen className="size-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground">No books found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back later for new releases and recommendations.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full">
                <MasonryGrid 
                  books={books} 
                  onCardClick={handleCardClick}
                />
              </div>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {(() => {
                      // Show a sliding window of 5 pages centered around current page
                      let startPage: number;
                      let endPage: number;
                      
                      if (currentPage <= 3) {
                        startPage = 1;
                        endPage = Math.min(5 + currentPage, totalPages);
                      } else {
                        startPage = Math.max(1, currentPage - 2);
                        endPage = Math.min(currentPage + 2, totalPages);
                      }
                      
                      const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                      
                      return visiblePages.map((pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      ));
                    })()}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

