"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

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

const BOOKS_PAGE_SIZE = 20; // More books for masonry layout

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Fetch books
  React.useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/books/latest?page=${currentPage}&pageSize=${BOOKS_PAGE_SIZE}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch books");
        }

        const data = await response.json();
        console.log("Fetched books data:", data);
        setBooks(data.books || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching books:", error);
        setBooks([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [currentPage]);


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
            <TetrisLoading size="md" speed="fast" loadingText="Loading books..." />
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
              Latest Books
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Discover the newest releases and trending titles.
            </p>
          </div>

          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center min-h-[400px]">
              <BookOpen className="size-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground">No books found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back later for new releases.
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
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
                    ))}
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

