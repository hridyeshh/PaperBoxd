"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";

import { Header } from "@/components/ui/layout/header-with-search";
import TetrisLoading from "@/components/ui/tetris-loader";
import { MasonryGrid } from "@/components/ui/masonry-grid";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  categories?: string[];
  publisher?: string;
};

const BOOKS_PAGE_SIZE = 35; // 5x7 grid = 35 books per page

export default function BooksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [allBooks, setAllBooks] = React.useState<Book[]>([]); // Store all books for pagination

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
        if (isAuthenticated && session?.user?.id) {
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
        setAllBooks(combinedBooks);
        
        // Calculate pagination
        const total = combinedBooks.length;
        const calculatedTotalPages = Math.ceil(total / BOOKS_PAGE_SIZE);
        setTotalPages(calculatedTotalPages);
      } catch (error) {
        console.error("Error fetching books:", error);
        setBooks([]);
        setAllBooks([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [isAuthenticated, session?.user?.id]);

  // Update displayed books when page changes
  React.useEffect(() => {
    if (allBooks.length > 0) {
      const startIndex = (currentPage - 1) * BOOKS_PAGE_SIZE;
      const endIndex = startIndex + BOOKS_PAGE_SIZE;
      setBooks(allBooks.slice(startIndex, endIndex));
    }
  }, [currentPage, allBooks]);


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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <TetrisLoading size="md" speed="fast" loadingText="Loading your feed..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 mt-16">
        <div className="space-y-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Feed
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Latest releases, personalized recommendations, and books your friends are loving.
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
                      // When on page 5, show pages 3, 4, 5, 6, 7
                      // When on page 1, show pages 1, 2, 3, 4, 5, 6 (first 5 + 1)
                      // When on page 2, show pages 1, 2, 3, 4, 5, 6, 7 (first 5 + 2)
                      
                      let startPage: number;
                      let endPage: number;
                      
                      if (currentPage <= 3) {
                        // For early pages, show from page 1
                        startPage = 1;
                        endPage = Math.min(5 + currentPage, totalPages);
                      } else {
                        // For later pages, center around current page
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

