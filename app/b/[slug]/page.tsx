"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Calendar, BookOpen, Users, Star, MapPin, Globe, FileText, Loader2, Heart, Library, Hand, Share2, PenTool, NotebookPen, Link2, Search, Send, BookMarked } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { NotFoundPage } from "@/components/ui/pages/not-found-page";
import { InteractiveHoverButton } from "@/components/ui/buttons/interactive-hover-button";
import { Button } from "@/components/ui/primitives/button";
import { Header } from "@/components/ui/layout/header-with-search";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { stripHtmlTags, cn, DEFAULT_AVATAR } from "@/lib/utils";
import { SignupPromptDialog } from "@/components/ui/dialogs/signup-prompt-dialog";
import { BookCarousel, BookCarouselBook } from "@/components/ui/home/book-carousel";
import { DiaryEditorDialog } from "@/components/ui/dialogs/diary-editor-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { Input } from "@/components/ui/primitives/input";

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
  
  // Diary editor dialog state
  const [showDiaryEditor, setShowDiaryEditor] = React.useState(false);
  const [existingDiaryContent, setExistingDiaryContent] = React.useState<string>("");
  
  // Share dialog state
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [following, setFollowing] = React.useState<any[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = React.useState(false);
  const [shareSearchQuery, setShareSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = React.useState(false);
  
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

  // Check if book is in user's collections and if there's a diary entry
  React.useEffect(() => {
    if (!book || !isAuthenticated || !session?.user?.username) {
      setIsLiked(false);
      setIsInBookshelf(false);
      setIsInTBR(false);
      setExistingDiaryContent("");
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

    checkBookStatus().catch((error) => {
      console.error("Unhandled error in checkBookStatus:", error);
    });
  }, [book, isAuthenticated, session?.user?.username]);

  // Fetch following list when share modal opens
  React.useEffect(() => {
    if (isShareOpen && session?.user?.username) {
      let isMounted = true;
      
      setIsLoadingFollowing(true);
      fetch(`/api/users/${encodeURIComponent(session.user.username)}/following`)
        .then((res) => {
          if (!isMounted) return null;
          if (!res.ok) {
            throw new Error(`Failed to fetch following: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (!isMounted || !data) return;
          setFollowing(Array.isArray(data.following) ? data.following : []);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Error fetching following:", err);
          setFollowing([]);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingFollowing(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else if (!isShareOpen) {
      // Reset when modal closes
      setFollowing([]);
      setShareSearchQuery("");
      setSearchResults([]);
    }
  }, [isShareOpen, session?.user?.username]);

  // Search users as they type
  React.useEffect(() => {
    if (!shareSearchQuery.trim()) {
      setSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(shareSearchQuery)}&limit=20`
        );
        
        if (response.ok) {
          const data = await response.json();
          setSearchResults(Array.isArray(data.users) ? data.users : []);
        } else {
          console.error("Failed to search users:", response.status);
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Error searching users:", err);
        setSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [shareSearchQuery]);

  // Determine which users to display
  const usersToDisplay = React.useMemo(() => {
    if (shareSearchQuery.trim()) {
      return searchResults;
    }
    return following;
  }, [shareSearchQuery, searchResults, following]);

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error copying link:", err);
      toast.error("Failed to copy link");
    }
  };

  const handleShareToSocial = (platform: string) => {
    try {
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(book?.volumeInfo?.title || "Check out this book");
      let shareUrl = "";

      switch (platform) {
        case "whatsapp":
          shareUrl = `https://wa.me/?text=${title}%20${url}`;
          break;
        case "messenger":
          shareUrl = `https://www.facebook.com/dialog/send?link=${url}&app_id=YOUR_APP_ID`;
          break;
        case "facebook":
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
          break;
        case "x":
          shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
          break;
      }

      if (shareUrl) {
        const opened = window.open(shareUrl, "_blank", "width=600,height=400");
        if (!opened) {
          toast.error("Popup blocked. Please allow popups for this site.");
        }
      }
    } catch (err) {
      console.error("Error sharing to social:", err);
      toast.error("Failed to share");
    }
  };

  const handleSendToUser = async (targetUsername: string) => {
    if (!book || !session?.user?.username) return;

    try {
      const bookId = book._id || book.bookId || book.id;
      if (!bookId) {
        toast.error("Book ID not found");
        return;
      }

      const url = `/api/books/${encodeURIComponent(bookId as string)}/share`;
      console.log("Sharing book to user:", { bookId, targetUsername, url });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: targetUsername,
        }),
      });

      if (response.ok) {
        toast.success(`Book shared with @${targetUsername}!`);
      } else {
        let error: any = {};
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const text = await response.text();
            error = text ? JSON.parse(text) : {};
          } else {
            // Handle HTML responses (404 pages, etc.)
            error = { error: `Failed to share book (${response.status})` };
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
          error = { error: `Failed to share book (${response.status})` };
        }
        console.error("Share book error response:", error, "Status:", response.status);
        toast.error(error.error || error.details || `Failed to share book (${response.status})`);
      }
    } catch (err) {
      console.error("Error sharing book:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to share book";
      toast.error(errorMessage);
    }
  };

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
            .then(data => setSimilarBooks(data.books || []))
            .catch((err) => {
              console.error("Error fetching similar books:", err);
              setSimilarBooks([]);
            }),
        ];

        // Only fetch author books if we have an author
        if (primaryAuthor) {
          promises.push(
            fetch(`/api/books/by-author?author=${encodeURIComponent(primaryAuthor)}&excludeBookId=${bookId}&limit=20`)
              .then(res => res.ok ? res.json() : { books: [] })
              .then(data => setAuthorBooks(data.books || []))
              .catch((err) => {
                console.error("Error fetching author books:", err);
                setAuthorBooks([]);
              })
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.error("Error fetching carousels:", err);
      } finally {
        setLoadingCarousels(false);
      }
    };

    fetchCarousels().catch((error) => {
      console.error("Unhandled error in fetchCarousels:", error);
      setLoadingCarousels(false);
    });
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mt-16 pb-24 md:pb-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Left: Large Book Cover */}
          <div className="flex-shrink-0 w-full sm:w-48 lg:w-56">
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
            <div className="flex flex-col gap-3 mt-4">
              {/* Icon Buttons Row */}
              <div className="flex gap-2">
                {/* Like Icon Button */}
                <Button
                  variant="outline"
                  size="icon"
                onClick={async () => {
                  if (!isAuthenticated) {
                      setSignupAction("like");
                    setShowSignupPrompt(true);
                    return;
                  }
                  if (isUpdating || !session?.user?.username || !book) return;
                  setIsUpdating(true);
                  try {
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
                    }
                  } catch (err) {
                      // Silent fail - no toast
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                  className={cn(
                    "flex-1 h-10",
                    isAuthenticated && isLiked && "bg-red-500 text-white hover:bg-red-600"
                  )}
                >
                  <Heart className={cn("h-5 w-5", isAuthenticated && isLiked && "fill-current")} />
                </Button>
                
                {/* Bookshelf Icon Button */}
                <Button
                  variant="outline"
                  size="icon"
                onClick={async () => {
                  if (!isAuthenticated) {
                      setSignupAction("bookshelf");
                    setShowSignupPrompt(true);
                    return;
                  }
                  if (isUpdating || !session?.user?.username || !book) return;
                  setIsUpdating(true);
                  try {
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
                    }
                  } catch (err) {
                      // Silent fail - no toast
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                  className={cn(
                    "flex-1 h-10",
                    isAuthenticated && isInBookshelf && "bg-amber-500 text-white hover:bg-amber-600"
                  )}
                >
                  <BookMarked className={cn("h-5 w-5", isAuthenticated && isInBookshelf && "fill-current")} />
                </Button>
              </div>
              
              {/* TBR Button */}
              <Button
                variant={isAuthenticated && isInTBR ? "default" : "outline"}
                onClick={async () => {
                  if (!isAuthenticated) {
                    setSignupAction("tbr");
                    setShowSignupPrompt(true);
                    return;
                  }
                  if (isUpdating || !session?.user?.username || !book) return;
                  setIsUpdating(true);
                  try {
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
                    }
                  } catch (err) {
                    // Silent fail - no toast
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                className={cn(
                  "w-full h-10",
                  isAuthenticated && isInTBR && "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                {isAuthenticated && isInTBR ? "In TBR" : "Add to TBR"}
              </Button>
            </div>
            
            {/* Sign-up Prompt Dialog */}
            <SignupPromptDialog
              open={showSignupPrompt}
              onOpenChange={setShowSignupPrompt}
              action={signupAction}
            />
            {book && session?.user?.username && (
              <DiaryEditorDialog
                open={showDiaryEditor}
                onOpenChange={setShowDiaryEditor}
                bookId={(book._id || book.bookId || book.id) as string}
                bookTitle={book.volumeInfo.title}
                bookAuthor={book.volumeInfo.authors?.[0] || "Unknown Author"}
                bookCover={
                  book.volumeInfo.imageLinks?.thumbnail ||
                  book.volumeInfo.imageLinks?.smallThumbnail ||
                  book.volumeInfo.imageLinks?.medium
                }
                initialContent={existingDiaryContent}
                username={session.user.username}
                onSave={() => {
                  // Refresh diary content after save
                  if (session?.user?.username) {
                    fetch(`/api/users/${encodeURIComponent(session.user.username)}/diary`)
                      .then((res) => res.json())
                      .then((data) => {
                        const bookId = book._id || book.bookId || book.id;
                        const existingEntry = data.entries?.find((entry: any) => {
                          return (
                            entry.bookId?.toString() === bookId?.toString() ||
                            (book.id && entry.bookId === book.id)
                          );
                        });
                        if (existingEntry) {
                          setExistingDiaryContent(existingEntry.content || "");
                        }
                      })
                      .catch((err) => console.error("Error refreshing diary:", err));
                  }
                }}
              />
            )}
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
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Description</h2>
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
                  {stripHtmlTags(volumeInfo.description)}
                </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    setSignupAction("general");
                    setShowSignupPrompt(true);
                    return;
                  }
                  setShowDiaryEditor(true);
                }}
                variant="default"
              >
                <NotebookPen className="mr-2 size-4" />
                {existingDiaryContent ? "Edit your notes" : "Write about it"}
              </Button>
              
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    setSignupAction("general");
                    setShowSignupPrompt(true);
                    return;
                  }
                  setIsShareOpen(true);
                }}
                variant="outline"
              >
                <Share2 className="mr-2 size-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
        </div>
        
        {/* Carousels Section - Full Width */}
        <div className="mt-12 space-y-12 w-full px-8 md:px-12 lg:px-16 xl:px-20 pb-16">
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

        {/* Share Dialog */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent className="max-w-md max-h-[80vh] p-0 flex flex-col">
            <div className="p-6 flex flex-col min-w-0 flex-1 overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Share</DialogTitle>
              </DialogHeader>

              {/* Quick Share Options */}
              <div className="flex gap-4 mt-6 mb-6 justify-center">
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Link2 className="h-6 w-6 text-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">Copy link</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("whatsapp")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("messenger")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0084FF] to-[#006AFF] flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.97 9.272c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.87 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">Messenger</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("facebook")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">Facebook</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("x")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-black dark:bg-white flex items-center justify-center">
                    <svg className="h-6 w-6 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">X</span>
                </button>
              </div>

              <div className="border-t border-border my-4"></div>

              {/* Search Bar */}
              <div className="flex-shrink-0 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    placeholder="Search by username or name"
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    className="w-full !pl-10 pr-4 focus-visible:border-foreground dark:focus-visible:border-white"
                  />
                </div>
              </div>

              {/* User List */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {(isLoadingFollowing && !shareSearchQuery.trim()) || (isSearchingUsers && shareSearchQuery.trim()) ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : usersToDisplay.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">
                      {shareSearchQuery.trim() ? "No users found" : "No people to share with"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {usersToDisplay.map((user) => {
                      const avatar = user.avatar || DEFAULT_AVATAR;
                      const initials = user.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || user.username?.[0]?.toUpperCase() || "?";

                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                            {user.avatar ? (
                              <Image
                                src={avatar}
                                alt={user.name || user.username}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-sm font-medium text-foreground">
                                {initials}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {user.name || user.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendToUser(user.username)}
                            className="flex-shrink-0"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

