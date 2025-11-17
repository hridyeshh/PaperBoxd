"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Calendar, BookOpen, Users, Star, MapPin, Globe, FileText, Loader2, Heart, Library, Hand, Share2, PenTool } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import TetrisLoading from "@/components/ui/tetris-loader";
import { NotFoundPage } from "@/components/ui/not-found-page";
import { InteractiveHoverButton } from "@/components/ui/buttons/interactive-hover-button";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/layout/header-with-search";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { stripHtmlTags } from "@/lib/utils";
import { SignupPromptDialog } from "@/components/ui/signup-prompt-dialog";
import { BookCarousel, BookCarouselBook } from "@/components/ui/home/book-carousel";

interface BookDetails {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    language?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  saleInfo?: {
    country?: string;
    saleability?: string;
    isEbook?: boolean;
    buyLink?: string;
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
    retailPrice?: {
      amount: number;
      currencyCode: string;
    };
  };
  paperboxdStats?: {
    rating?: number;
    ratingsCount?: number;
    totalReads?: number;
    totalLikes?: number;
    totalTBR?: number;
  };
  _id?: string; // MongoDB _id
  bookId?: string; // MongoDB _id (alternative)
}

export default function BookDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  
  const [book, setBook] = React.useState<BookDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Track if book is in user's collections
  const [isLiked, setIsLiked] = React.useState(false);
  const [isInBookshelf, setIsInBookshelf] = React.useState(false);
  const [isInTBR, setIsInTBR] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  
  // Sign-up prompt dialog state
  const [showSignupPrompt, setShowSignupPrompt] = React.useState(false);
  const [signupAction, setSignupAction] = React.useState<"bookshelf" | "like" | "tbr" | "general">("general");
  
  // Carousel data
  const [similarBooks, setSimilarBooks] = React.useState<BookCarouselBook[]>([]);
  const [authorBooks, setAuthorBooks] = React.useState<BookCarouselBook[]>([]);
  const [loadingCarousels, setLoadingCarousels] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;

    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if slug is actually an ID (ISBN or Open Library ID)
        // ISBN format: 10 or 13 digits
        // Open Library ID: starts with "OL" or "/works/"
        const hasSpaces = slug.includes(" ");
        const hasPlus = slug.includes("+");
        const isISBN = /^(\d{10}|\d{13})$/.test(slug);
        const isOpenLibraryId = slug.startsWith("OL") || slug.startsWith("/works/");
        // If it doesn't have spaces or +, it could be another ID format
        const looksLikeId = !hasSpaces && !hasPlus && /^[a-zA-Z0-9_-]+$/.test(slug);
        
        // If it looks like an ID (not a slug with + or spaces), try the ID endpoint first
        // Otherwise, use the slug endpoint (which handles title+hex-id format)
        let endpoint = looksLikeId || isISBN || isOpenLibraryId
          ? `/api/books/${encodeURIComponent(slug)}`
          : `/api/books/by-slug/${encodeURIComponent(slug)}`;
        
        let response = await fetch(endpoint);
        
        // If ID endpoint returns 404, try slug endpoint as fallback
        // This handles cases where the ID format check might have been wrong
        if (!response.ok && response.status === 404 && (isISBN || isOpenLibraryId || looksLikeId) && !hasPlus) {
          console.log(`[Book Detail] ID endpoint failed, trying slug endpoint for: "${slug}"`);
          endpoint = `/api/books/by-slug/${encodeURIComponent(slug)}`;
          response = await fetch(endpoint);
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Book not found");
          } else {
            const errorData = await response.json().catch(() => ({}));
            setError(errorData.error || "Failed to load book");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setBook(data);
      } catch (err) {
        console.error("Error fetching book:", err);
        setError("Failed to load book");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [slug]);

  // Check if book is in user's collections
  React.useEffect(() => {
    if (!book || !isAuthenticated || !session?.user?.username) {
      setIsLiked(false);
      setIsInBookshelf(false);
      setIsInTBR(false);
      return;
    }

    const checkBookStatus = async () => {
      try {
        const username = session.user.username;
        
        // Check all collections in parallel
        const [likedRes, bookshelfRes, tbrRes] = await Promise.all([
          fetch(`/api/users/${encodeURIComponent(username)}/books?type=liked`),
          fetch(`/api/users/${encodeURIComponent(username)}/books?type=bookshelf`),
          fetch(`/api/users/${encodeURIComponent(username)}/books?type=tbr`),
        ]);

        if (likedRes.ok) {
          const likedData = await likedRes.json();
          const isInLiked = likedData.books?.some((b: any) => {
            const bookId = book._id || book.bookId;
            return (
              (bookId && (b.bookId?.toString() === bookId.toString() || b.bookId === bookId)) ||
              (book.id && (b.isbndbId === book.id || b.openLibraryId === book.id)) ||
              b.title?.toLowerCase() === book.volumeInfo.title?.toLowerCase()
            );
          });
          setIsLiked(isInLiked || false);
        }

        if (bookshelfRes.ok) {
          const bookshelfData = await bookshelfRes.json();
          const isInShelf = bookshelfData.books?.some((b: any) => {
            const bookId = book._id || book.bookId;
            return (
              (bookId && (b.bookId?.toString() === bookId.toString() || b.bookId === bookId)) ||
              (book.id && (b.isbndbId === book.id || b.openLibraryId === book.id)) ||
              b.title?.toLowerCase() === book.volumeInfo.title?.toLowerCase()
            );
          });
          setIsInBookshelf(isInShelf || false);
        }

        if (tbrRes.ok) {
          const tbrData = await tbrRes.json();
          const isInTbr = tbrData.books?.some((b: any) => {
            const bookId = book._id || book.bookId;
            return (
              (bookId && (b.bookId?.toString() === bookId.toString() || b.bookId === bookId)) ||
              (book.id && (b.isbndbId === book.id || b.openLibraryId === book.id)) ||
              b.title?.toLowerCase() === book.volumeInfo.title?.toLowerCase()
            );
          });
          setIsInTBR(isInTbr || false);
        }
      } catch (err) {
        console.error("Error checking book status:", err);
      }
    };

    checkBookStatus();
  }, [book, isAuthenticated, session?.user?.username]);

  // Fetch carousel data when book is loaded
  React.useEffect(() => {
    if (!book || (!book._id && !book.bookId)) return;

    const fetchCarousels = async () => {
      try {
        setLoadingCarousels(true);
        const bookId = book._id || book.bookId;
        const primaryAuthor = book.volumeInfo?.authors?.[0];

        // Fetch similar books and books by author in parallel
        const promises = [
          fetch(`/api/recommendations/similar/${bookId}?limit=20`)
            .then(res => res.ok ? res.json() : { books: [] })
            .then(data => setSimilarBooks(data.books || [])),
        ];

        // Only fetch author books if we have an author
        if (primaryAuthor) {
          promises.push(
            fetch(`/api/books/by-author?author=${encodeURIComponent(primaryAuthor)}&excludeBookId=${bookId}&limit=20`)
              .then(res => res.ok ? res.json() : { books: [] })
              .then(data => setAuthorBooks(data.books || []))
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.error("Error fetching carousels:", err);
      } finally {
        setLoadingCarousels(false);
      }
    };

    fetchCarousels();
  }, [book]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TetrisLoading />
      </div>
    );
  }

  if (error || !book) {
    return <NotFoundPage />;
  }

  const { volumeInfo, saleInfo, paperboxdStats } = book;
  // Prioritize larger images for detail page to ensure clarity
  // All book cover images should be displayed at maximum quality without optimization
  const coverImage = volumeInfo.imageLinks?.extraLarge ||
                     volumeInfo.imageLinks?.large ||
                     volumeInfo.imageLinks?.medium ||
                     volumeInfo.imageLinks?.thumbnail ||
                     volumeInfo.imageLinks?.smallThumbnail ||
                     "";

  // Format published date
  const formatPublishedDate = (dateStr?: string) => {
    if (!dateStr) return null;
    
    // Published dates can be in formats: "2023", "2023-01", "2023-01-15"
    try {
      const parts = dateStr.split("-");
      if (parts.length === 1) {
        return dateStr; // Just year
      } else if (parts.length === 2) {
        const date = new Date(`${dateStr}-01`);
        return format(date, "MMMM yyyy");
      } else {
        const date = new Date(dateStr);
        return format(date, "MMMM d, yyyy");
      }
    } catch {
      return dateStr;
    }
  };

  const publishedDate = formatPublishedDate(volumeInfo.publishedDate);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mt-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Left: Large Book Cover */}
          <div className="flex-shrink-0 w-full sm:w-64 lg:w-80">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-muted shadow-lg">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={volumeInfo.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 256px, 320px"
                  priority
                  quality={100}
                  unoptimized={true}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted">
                  <BookOpen className="size-24 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Action Buttons Below Cover */}
            <div className="flex flex-col gap-2 mt-4">
              <InteractiveHoverButton
                onClick={async () => {
                  if (!isAuthenticated) {
                    setSignupAction("bookshelf");
                    setShowSignupPrompt(true);
                    return;
                  }
                  if (isUpdating || !session?.user?.username || !book) return;
                  setIsUpdating(true);
                  try {
                    // Determine the correct ID type based on book.id format
                    const isISBN = book.id && /^(\d{10}|\d{13})$/.test(book.id);
                    const isOpenLibraryId = book.id?.startsWith("OL") || book.id?.startsWith("/works/");
                    
                    const response = await fetch(`/api/users/${encodeURIComponent(session.user.username)}/books`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "bookshelf",
                        bookId: book._id || book.bookId,
                        isbndbId: isISBN ? book.id : undefined,
                        openLibraryId: isOpenLibraryId ? book.id : undefined,
                        finishedOn: new Date().toISOString(),
                      }),
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      const wasRemoved = data.removed || false;
                      setIsInBookshelf(!wasRemoved);
                      toast.success(wasRemoved ? "Removed from bookshelf!" : "Added to bookshelf!");
                    } else {
                      const error = await response.json().catch(() => ({}));
                      toast.error(error.error || "Failed to update bookshelf");
                    }
                  } catch (err) {
                    toast.error("Failed to update bookshelf");
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                text={isAuthenticated && isInBookshelf ? "In Bookshelf" : "Add to Bookshelf!"}
                showIdleAccent={true}
                accentColor="bg-amber-700"
                invert={true}
                hideIcon={true}
                className="w-full"
                disabled={isUpdating}
              />
              
              <div className="flex gap-2">
              <InteractiveHoverButton
                onClick={async () => {
                  if (!isAuthenticated) {
                    setSignupAction("like");
                    setShowSignupPrompt(true);
                    return;
                  }
                  if (isUpdating || !session?.user?.username || !book) return;
                  setIsUpdating(true);
                  try {
                    // Determine the correct ID type based on book.id format
                    const isISBN = book.id && /^(\d{10}|\d{13})$/.test(book.id);
                    const isOpenLibraryId = book.id?.startsWith("OL") || book.id?.startsWith("/works/");
                    
                    const response = await fetch(`/api/users/${encodeURIComponent(session.user.username)}/books`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "liked",
                        bookId: book._id || book.bookId,
                        isbndbId: isISBN ? book.id : undefined,
                        openLibraryId: isOpenLibraryId ? book.id : undefined,
                      }),
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      const wasRemoved = data.removed || false;
                      setIsLiked(!wasRemoved);
                      toast.success(wasRemoved ? "Removed from likes!" : "Added to likes!");
                    } else {
                      const error = await response.json().catch(() => ({}));
                      toast.error(error.error || "Failed to update likes");
                    }
                  } catch (err) {
                    toast.error("Failed to update likes");
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                text={isAuthenticated && isLiked ? "Liked" : "Like"}
                showIdleAccent={true}
                invert={true}
                accentColor="#e31b23"
                hideIcon={true}
                className="flex-1"
                disabled={isUpdating}
              />
              
              <InteractiveHoverButton
                onClick={async () => {
                  if (!isAuthenticated) {
                    setSignupAction("tbr");
                    setShowSignupPrompt(true);
                    return;
                  }
                  if (isUpdating || !session?.user?.username || !book) return;
                  setIsUpdating(true);
                  try {
                    // Determine the correct ID type based on book.id format
                    const isISBN = book.id && /^(\d{10}|\d{13})$/.test(book.id);
                    const isOpenLibraryId = book.id?.startsWith("OL") || book.id?.startsWith("/works/");
                    
                    const response = await fetch(`/api/users/${encodeURIComponent(session.user.username)}/books`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "tbr",
                        bookId: book._id || book.bookId,
                        isbndbId: isISBN ? book.id : undefined,
                        openLibraryId: isOpenLibraryId ? book.id : undefined,
                      }),
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      const wasRemoved = data.removed || false;
                      setIsInTBR(!wasRemoved);
                      toast.success(wasRemoved ? "Removed from TBR!" : "Added to TBR!");
                    } else {
                      const error = await response.json().catch(() => ({}));
                      toast.error(error.error || "Failed to update TBR");
                    }
                  } catch (err) {
                    toast.error("Failed to update TBR");
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                text={isAuthenticated && isInTBR ? "In TBR" : "TBR"}
                showIdleAccent={true}
                accentColor="bg-green-700"
                invert={true}
                hideIcon={true}
                className="flex-1"
                disabled={isUpdating}
              />
              </div>
            </div>
            
            {/* Sign-up Prompt Dialog */}
            <SignupPromptDialog
              open={showSignupPrompt}
              onOpenChange={setShowSignupPrompt}
              action={signupAction}
            />
          </div>

          {/* Right: Book Details */}
          <div className="flex-1 space-y-6">
            {/* Title and Subtitle */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {volumeInfo.title}
              </h1>
              {volumeInfo.subtitle && (
                <p className="text-xl text-muted-foreground">
                  {volumeInfo.subtitle}
                </p>
              )}
            </div>

            {/* Authors */}
            {volumeInfo.authors && volumeInfo.authors.length > 0 && (
              <div className="flex items-center gap-2 text-lg text-foreground">
                <span className="text-muted-foreground">by</span>
                <span className="font-medium">
                  {volumeInfo.authors.join(", ")}
                </span>
              </div>
            )}

            {/* Published Date */}
            {publishedDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" />
                <span>{publishedDate}</span>
              </div>
            )}

            {/* PaperBoxd Rating */}
            {paperboxdStats?.rating !== undefined && paperboxdStats.ratingsCount !== undefined && paperboxdStats.ratingsCount > 0 && (
              <div className="flex items-center gap-2">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{paperboxdStats.rating.toFixed(1)}</span> ({paperboxdStats.ratingsCount} ratings)
                </span>
              </div>
            )}

            {/* Book Metadata */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {volumeInfo.publisher && (
                <div className="flex items-start gap-2">
                  <BookOpen className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Publisher</p>
                    <p className="text-sm font-medium">{volumeInfo.publisher}</p>
                  </div>
                </div>
              )}

              {volumeInfo.pageCount && (
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pages</p>
                    <p className="text-sm font-medium">{volumeInfo.pageCount}</p>
                  </div>
                </div>
              )}

              {volumeInfo.language && (
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Language</p>
                    <p className="text-sm font-medium uppercase">{volumeInfo.language}</p>
                  </div>
                </div>
              )}

              {volumeInfo.categories && volumeInfo.categories.length > 0 && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Categories</p>
                    <p className="text-sm font-medium">{volumeInfo.categories.join(", ")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Average Rating */}
            {volumeInfo.averageRating && volumeInfo.ratingsCount && (
              <div className="flex items-center gap-2">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{volumeInfo.averageRating.toFixed(1)}</span> 
                  {" "}from <span className="font-medium text-foreground">{volumeInfo.ratingsCount.toLocaleString()}</span> ratings
                </span>
              </div>
            )}

            {/* Description */}
            {volumeInfo.description && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Description</h2>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {stripHtmlTags(volumeInfo.description)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  // TODO: Implement write about it functionality
                  toast.info("Write about it feature coming soon!");
                }}
                variant="default"
              >
                <PenTool className="mr-2 size-4" />
                Write about it
              </Button>
              
              <Button
                onClick={() => {
                  // TODO: Implement share functionality
                  if (navigator.share) {
                    navigator.share({
                      title: volumeInfo.title,
                      text: `Check out "${volumeInfo.title}" on PaperBoxd`,
                      url: window.location.href,
                    }).catch(() => {
                      // Fallback: copy to clipboard
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied to clipboard!");
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied to clipboard!");
                  }
                }}
                variant="outline"
              >
                <Share2 className="mr-2 size-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
        
        {/* Carousels Section */}
        <div className="mt-12 space-y-12">
          {/* Similar Books Carousel */}
          {similarBooks.length > 0 && (
            <BookCarousel
              title={`Similar to ${volumeInfo.title}`}
              subtitle="Books you might also enjoy"
              books={similarBooks}
            />
          )}
          
          {/* Books by Same Author Carousel */}
          {authorBooks.length > 0 && volumeInfo.authors?.[0] && (
            <BookCarousel
              title={`More from ${volumeInfo.authors[0]}`}
              subtitle="Other books by this author"
              books={authorBooks}
            />
          )}
        </div>
      </div>
      </div>
    </main>
  );
}

