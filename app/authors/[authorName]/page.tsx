"use client";

import Image from "next/image";
import * as React from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/ui/layout/header-with-search";
import TetrisLoading from "@/components/ui/tetris-loader";
import { NotFoundPage } from "@/components/ui/not-found-page";
import { createBookSlug } from "@/lib/utils/book-slug";

type AuthorBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
  isbndbId?: string;
  openLibraryId?: string;
};

export default function AuthorDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const authorName = typeof params.authorName === "string" ? decodeURIComponent(params.authorName) : null;
  const username = searchParams.get("user");

  const [books, setBooks] = React.useState<AuthorBook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authorName) {
      setError("Author name is required");
      setLoading(false);
      return;
    }

    const fetchAuthorBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch books by this author from the user's profile
        const response = await fetch(`/api/users/${encodeURIComponent(username || "")}?author=${encodeURIComponent(authorName)}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch author books");
        }

        const data = await response.json();
        
        // Get books from bookshelf and TBR that match this author
        const allBooks: AuthorBook[] = [];
        const seenIds = new Set<string>();

        // Add bookshelf books
        if (Array.isArray(data.user?.bookshelf)) {
          data.user.bookshelf.forEach((book: any) => {
            const authors = book.authors || book.volumeInfo?.authors || [];
            const authorMatch = Array.isArray(authors) 
              ? authors.some((a: string) => a.toLowerCase() === authorName.toLowerCase())
              : (authors || "").toLowerCase() === authorName.toLowerCase();
            
            if (authorMatch && book._id && !seenIds.has(book._id.toString())) {
              seenIds.add(book._id.toString());
              allBooks.push({
                id: book._id.toString(),
                title: book.title || book.volumeInfo?.title || "Unknown Title",
                author: Array.isArray(authors) ? authors[0] : (authors || authorName),
                cover: book.cover || book.volumeInfo?.imageLinks?.thumbnail || book.volumeInfo?.imageLinks?.smallThumbnail || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                isbndbId: book.isbndbId,
                openLibraryId: book.openLibraryId,
              });
            }
          });
        }

        // Add TBR books
        if (Array.isArray(data.user?.toBeRead)) {
          data.user.toBeRead.forEach((book: any) => {
            const authors = book.authors || book.volumeInfo?.authors || [];
            const authorMatch = Array.isArray(authors) 
              ? authors.some((a: string) => a.toLowerCase() === authorName.toLowerCase())
              : (authors || "").toLowerCase() === authorName.toLowerCase();
            
            if (authorMatch && book._id && !seenIds.has(book._id.toString())) {
              seenIds.add(book._id.toString());
              allBooks.push({
                id: book._id.toString(),
                title: book.title || book.volumeInfo?.title || "Unknown Title",
                author: Array.isArray(authors) ? authors[0] : (authors || authorName),
                cover: book.cover || book.volumeInfo?.imageLinks?.thumbnail || book.volumeInfo?.imageLinks?.smallThumbnail || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                isbndbId: book.isbndbId,
                openLibraryId: book.openLibraryId,
              });
            }
          });
        }

        // Take top 4 books
        setBooks(allBooks.slice(0, 4));
      } catch (err: any) {
        console.error("Error fetching author books:", err);
        setError(err.message || "Failed to load author books");
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorBooks();
  }, [authorName, username]);

  const handleBookClick = React.useCallback((book: AuthorBook) => {
    try {
      const bookId = book.isbndbId || book.openLibraryId || book.id;
      
      if (bookId) {
        const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
        const isOpenLibraryId = bookId.startsWith("OL") || bookId.startsWith("/works/");
        const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
        const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");
        
        if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
          router.push(`/b/${bookId}`);
        } else {
          const slug = createBookSlug(book.title, book.isbndbId, bookId);
          router.push(`/b/${slug}`);
        }
      } else {
        const slug = createBookSlug(book.title);
        router.push(`/b/${slug}`);
      }
    } catch (error) {
      console.error("Error in handleBookClick:", error);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <TetrisLoading />
        </div>
      </div>
    );
  }

  if (error || !authorName) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <NotFoundPage />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Author Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{authorName}</h1>
            <p className="text-muted-foreground">
              {books.length} {books.length === 1 ? "book" : "books"} in collection
            </p>
          </div>

          {/* Books Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-6 max-w-2xl">
            {books.map((book, index) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted shadow-sm">
                  <Image
                    src={book.cover}
                    alt={`${book.title} cover`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 25vw"
                    quality={100}
                    unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
                  />
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2">{book.title}</h3>
                </div>
              </div>
            ))}
            {/* Gray placeholders for remaining slots */}
            {Array.from({ length: Math.max(0, 4 - books.length) }).map((_, index) => (
              <div key={`placeholder-${index}`} className="group">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground/50">No book</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

