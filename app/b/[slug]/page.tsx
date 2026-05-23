"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { BookOpen, Star, Heart, Share2, NotebookPen, Link2, Search, Send, BookMarked, BookmarkPlus } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { format } from "date-fns";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { NotFoundPage } from "@/components/ui/pages/not-found-page";
import { Button } from "@/components/ui/primitives/button";
import { Header } from "@/components/ui/layout/header-with-search";
import { DesktopSidebar } from "@/components/ui/layout/desktop-sidebar";
import { MinimalDesktopHeader } from "@/components/ui/layout/minimal-desktop-header";
import { useIsMobile } from "@/hooks/use-media-query";
import { stripHtmlTags, cn, DEFAULT_AVATAR } from "@/lib/utils";
import { SignupPromptDialog } from "@/components/ui/dialogs/signup-prompt-dialog";
import { BookCarousel, BookCarouselBook } from "@/components/ui/home/book-carousel";
import { DiaryEditorDialog } from "@/components/ui/dialogs/diary-editor-dialog";
import { AddToListDialog } from "@/components/ui/dialogs/add-to-list-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { Input } from "@/components/ui/primitives/input";
import { BookShareButton } from "@/components/ui/features/book-share-button";
import { ReadingProgress } from "@/components/ui/features/reading-progress";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700", "800"],
  style: ["normal", "italic"],
});

interface IndustryIdentifier {
  type?: string;
  identifier?: string;
}

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
    industryIdentifiers?: IndustryIdentifier[];
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
  _id?: string;
  bookId?: string;
}

type CollectionEntry = {
  bookId?: string;
  book_id?: string;
  id?: string;
  _id?: string;
  isbndbId?: string;
  openLibraryId?: string;
  googleBooksId?: string;
  title?: string;
  volumeInfo?: {
    title?: string;
    industryIdentifiers?: IndustryIdentifier[];
  };
  book?: {
    id?: string;
    _id?: string;
    bookId?: string;
    book_id?: string;
    isbndbId?: string;
    openLibraryId?: string;
    googleBooksId?: string;
    volumeInfo?: {
      title?: string;
      industryIdentifiers?: IndustryIdentifier[];
    };
  };
};

/** Collect every identifier-ish string a book object exposes (root + nested `.book`). */
function collectBookIdentifiers(b: BookDetails | CollectionEntry): Set<string> {
  const ids = new Set<string>();
  const add = (v?: string | null) => {
    if (!v) return;
    const s = String(v).trim();
    if (!s) return;
    ids.add(s);
    const digits = s.replace(/\D/g, "");
    if (digits && (digits.length === 10 || digits.length === 13) && digits !== s) {
      ids.add(digits);
    }
  };

  const r = b as Record<string, unknown>;
  add(r.id as string | undefined);
  add(r._id as string | undefined);
  add(r.bookId as string | undefined);
  add(r.book_id as string | undefined);
  add(r.isbndbId as string | undefined);
  add(r.openLibraryId as string | undefined);
  add(r.googleBooksId as string | undefined);

  const nested = (b as CollectionEntry).book;
  if (nested) {
    add(nested.id);
    add(nested._id);
    add(nested.bookId);
    add(nested.book_id);
    add(nested.isbndbId);
    add(nested.openLibraryId);
    add(nested.googleBooksId);
  }

  const volumeInfos = [
    (b as BookDetails).volumeInfo,
    (b as CollectionEntry).volumeInfo,
    nested?.volumeInfo,
  ];
  for (const vi of volumeInfos) {
    if (!vi?.industryIdentifiers) continue;
    for (const x of vi.industryIdentifiers) {
      add(x.identifier);
    }
  }
  return ids;
}

/** Match a list entry from /api/users/.../books to the loaded book. */
function collectionEntryMatchesBook(book: BookDetails, b: CollectionEntry): boolean {
  const pageIds = collectBookIdentifiers(book);
  const entryIds = collectBookIdentifiers(b);
  for (const x of pageIds) {
    if (entryIds.has(x)) return true;
  }
  const t1 = book.volumeInfo?.title?.toLowerCase();
  if (t1) {
    if (b.title?.toLowerCase() === t1) return true;
    if (b.volumeInfo?.title?.toLowerCase() === t1) return true;
    if (b.book?.volumeInfo?.title?.toLowerCase() === t1) return true;
  }
  return false;
}

/** 10- or 13-digit ISBN for Postgres resolve (ISBNdb / Go expect digits only). */
function extractIsbnDigitsForResolve(book: BookDetails): string | undefined {
  const ids = book.volumeInfo?.industryIdentifiers;
  if (Array.isArray(ids)) {
    for (const pref of ["ISBN_13", "ISBN_10", "ISBN"]) {
      const hit = ids.find((x) => x.type === pref && x.identifier?.trim());
      if (hit?.identifier) {
        const d = hit.identifier.replace(/\D/g, "");
        if (d.length === 13 || d.length === 10) return d;
      }
    }
    for (const x of ids) {
      if (!x.identifier) continue;
      const d = x.identifier.replace(/\D/g, "");
      if (d.length === 13 || d.length === 10) return d;
    }
  }
  if (book.id) {
    const d = book.id.replace(/\D/g, "");
    if (d.length === 13 || d.length === 10) return d;
  }
  return undefined;
}

/** Google Books volume id when `id` is not UUID / Mongo / ISBN / Open Library key. */
function extractGoogleVolumeIdForResolve(book: BookDetails): string | undefined {
  const id = book.id?.trim();
  if (!id) return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return undefined;
  }
  if (/^[0-9a-f]{24}$/i.test(id)) return undefined;
  if (id.startsWith("OL") || id.startsWith("/works/")) return undefined;
  const digitsOnly = id.replace(/\D/g, "");
  if (digitsOnly.length === 10 || digitsOnly.length === 13) return undefined;
  if (/^[A-Za-z0-9_-]+$/.test(id) && id.length >= 6) return id;
  return undefined;
}

/** Generate initials-based gradient color for author avatar */
function authorGradient(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradients = [
    "linear-gradient(135deg,#5a8050,#2a4a2a)",
    "linear-gradient(135deg,#b85c38,#6e2f1f)",
    "linear-gradient(135deg,#3a7bd5,#1a1a5e)",
    "linear-gradient(135deg,#a8893f,#5a4520)",
    "linear-gradient(135deg,#8a5a8a,#3e2845)",
  ];
  return gradients[hash % gradients.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// A "canonical" ID is a 24-char hex MongoDB ObjectId or a UUID (with hyphens).
// Anything else (text slug, title-based slug, etc.) should be normalised away.
const MONGO_ID_RE = /^[0-9a-f]{24}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isCanonicalId(s: string) {
  return MONGO_ID_RE.test(s) || UUID_RE.test(s);
}

export default function BookDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  const [book, setBook] = React.useState<BookDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Track if book is in user's collections
  const [isLiked, setIsLiked] = React.useState(false);
  const [isInBookshelf, setIsInBookshelf] = React.useState(false);
  const [isInTBR, setIsInTBR] = React.useState(false);

  // Reading progress
  const [pagesRead, setPagesRead] = React.useState(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = React.useState(false);

  // Sign-up prompt dialog state
  const [showSignupPrompt, setShowSignupPrompt] = React.useState(false);
  const [signupAction, setSignupAction] = React.useState<"bookshelf" | "like" | "tbr" | "general">("general");

  // Diary editor dialog state
  const [showDiaryEditor, setShowDiaryEditor] = React.useState(false);

  // Description dialog state (mobile only)
  const [showDescriptionDialog, setShowDescriptionDialog] = React.useState(false);
  const [existingDiaryContent, setExistingDiaryContent] = React.useState<string>("");

  // Add to list dialog state
  const [showAddToList, setShowAddToList] = React.useState(false);

  // Share dialog state
  type UserForShare = {
    id: string;
    username: string;
    name?: string;
    avatar?: string;
  };
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [following, setFollowing] = React.useState<UserForShare[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = React.useState(false);
  const [shareSearchQuery, setShareSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<UserForShare[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = React.useState(false);

  // Carousel data
  const [similarBooks, setSimilarBooks] = React.useState<BookCarouselBook[]>([]);
  const [authorBooks, setAuthorBooks] = React.useState<BookCarouselBook[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = React.useState("description");

  // Description expanded state
  const [descExpanded, setDescExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;

    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);

        const hasSpaces = slug.includes(" ");
        const hasPlus = slug.includes("+");
        const isISBN = /^(\d{10}|\d{13})$/.test(slug);
        const isOpenLibraryId = slug.startsWith("OL") || slug.startsWith("/works/");
        const looksLikeId = !hasSpaces && !hasPlus && /^[a-zA-Z0-9_-]+$/.test(slug);

        let endpoint = looksLikeId || isISBN || isOpenLibraryId
          ? `/api/books/${encodeURIComponent(slug)}`
          : `/api/books/by-slug/${encodeURIComponent(slug)}`;

        let response = await fetch(endpoint);

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

  // Canonical URL redirect — only normalise title-format slugs (contain "+").
  // ISBNs, Google Books IDs, and other plain ID slugs are kept as-is.
  React.useEffect(() => {
    if (!book) return;
    if (isCanonicalId(slug)) return;
    if (!slug.includes("+")) return; // already a clean ID — don't redirect
    const canonicalId = String(book._id || book.bookId || book.id || "").trim();
    if (canonicalId && isCanonicalId(canonicalId) && canonicalId !== slug) {
      router.replace(`/b/${canonicalId}`);
    }
  }, [book, slug, router]);

  // Check if book is in user's collections and if there's a diary entry
  React.useEffect(() => {
    if (!book || !isAuthenticated || !user?.username) {
      setIsLiked(false);
      setIsInBookshelf(false);
      setIsInTBR(false);
      setExistingDiaryContent("");
      setPagesRead(0);
      return;
    }

    const checkBookStatus = async () => {
      try {
        const username = user?.username;
        const bookId = book.id || book._id || book.bookId;

        const [likedRes, bookshelfRes, tbrRes, progressRes] = await Promise.all([
          fetch(`/api/users/${encodeURIComponent(username)}/books?type=liked`),
          fetch(`/api/users/${encodeURIComponent(username)}/books?type=bookshelf`),
          fetch(`/api/users/${encodeURIComponent(username)}/books?type=tbr`),
          bookId ? fetch(`/api/users/${encodeURIComponent(username)}/reading-progress?bookId=${encodeURIComponent(bookId as string)}`) : null,
        ]);

        if (likedRes.ok) {
          const likedData = await likedRes.json();
          const isInLiked = Array.isArray(likedData.books)
            ? likedData.books.some((b: unknown) => collectionEntryMatchesBook(book, b as Parameters<typeof collectionEntryMatchesBook>[1]))
            : false;
          setIsLiked(isInLiked);
        }

        if (bookshelfRes.ok) {
          const bookshelfData = await bookshelfRes.json();
          const isInShelf = Array.isArray(bookshelfData.books)
            ? bookshelfData.books.some((b: unknown) => collectionEntryMatchesBook(book, b as Parameters<typeof collectionEntryMatchesBook>[1]))
            : false;
          setIsInBookshelf(isInShelf);
        }

        let tbrData: { books?: unknown[] } = { books: [] };
        if (tbrRes.ok) {
          tbrData = await tbrRes.json();
          const isInTbr = Array.isArray(tbrData.books)
            ? tbrData.books.some((b: unknown) => collectionEntryMatchesBook(book, b as Parameters<typeof collectionEntryMatchesBook>[1]))
            : false;
          setIsInTBR(isInTbr);
        }

        if (progressRes && progressRes.ok) {
          const progressData = await progressRes.json();
          const fetchedPagesRead =
            typeof progressData.pagesRead === "number" ? progressData.pagesRead : 0;
          setPagesRead(fetchedPagesRead);
          if (fetchedPagesRead > 0) {
            const stillTbr = Array.isArray(tbrData.books)
              ? tbrData.books.some((b: unknown) =>
                  collectionEntryMatchesBook(book, b as Parameters<typeof collectionEntryMatchesBook>[1])
                )
              : false;
            setIsInTBR(stillTbr);
          } else {
            setIsInTBR(false);
          }
        }
      } catch (err) {
        console.error("Error checking book status:", err);
      }
    };

    checkBookStatus().catch((error) => {
      console.error("Unhandled error in checkBookStatus:", error);
    });
  }, [book, isAuthenticated, user?.username]);

  // Fetch following list when share modal opens
  React.useEffect(() => {
    if (isShareOpen && user?.username) {
      let isMounted = true;

      setIsLoadingFollowing(true);
      fetch(`/api/users/${encodeURIComponent(user?.username)}/following`)
        .then((res) => {
          if (!isMounted) return null;
          if (!res.ok) {
            throw new Error(`Failed to fetch following: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (!isMounted || !data) return;
          const raw = Array.isArray(data.users)
            ? data.users
            : Array.isArray(data.following)
              ? data.following
              : [];
          setFollowing(
            raw.map((u: { id?: string; username?: string; name?: string; avatar_url?: string; avatar?: string }) => ({
              id: u.id ?? "",
              username: u.username ?? "",
              name: u.name,
              avatar: u.avatar_url ?? u.avatar,
            }))
          );
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
      setFollowing([]);
      setShareSearchQuery("");
      setSearchResults([]);
    }
  }, [isShareOpen, user?.username]);

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
    }, 300);

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
    if (!book || !user?.username) return;

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
        type ErrorResponse = {
          error?: string;
          details?: string;
        };
        let error: ErrorResponse = {};
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const text = await response.text();
            error = text ? JSON.parse(text) as ErrorResponse : {};
          } else {
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
        const bookId = book._id || book.bookId;
        const primaryAuthor = book.volumeInfo?.authors?.[0];

        const promises = [
          fetch(`/api/recommendations/similar/${bookId}?limit=20`)
            .then(res => res.ok ? res.json() : { books: [] })
            .then(data => setSimilarBooks(data.books || []))
            .catch(() => {
              setSimilarBooks([]);
            }),
        ];

        if (primaryAuthor) {
          promises.push(
            fetch(`/api/books/by-author?author=${encodeURIComponent(primaryAuthor)}&excludeBookId=${bookId}&limit=20`)
              .then(res => res.ok ? res.json() : { books: [] })
              .then(data => setAuthorBooks(data.books || []))
              .catch(() => {
                setAuthorBooks([]);
              })
          );
        }

        await Promise.all(promises);
      } catch {
        // Error already logged in individual catch blocks
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

  const { volumeInfo } = book;
  const coverImage =
    volumeInfo.imageLinks?.extraLarge ||
    volumeInfo.imageLinks?.large ||
    volumeInfo.imageLinks?.medium ||
    volumeInfo.imageLinks?.thumbnail ||
    volumeInfo.imageLinks?.smallThumbnail ||
    "";

  const formatPublishedDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split("-");
      if (parts.length === 1) {
        return dateStr;
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

  const structuredData = book
    ? {
        "@context": "https://schema.org",
        "@type": "Book",
        name: book.volumeInfo.title,
        author:
          book.volumeInfo.authors?.map((author: string) => ({
            "@type": "Person",
            name: author,
          })) || [],
        publisher: book.volumeInfo.publisher
          ? {
              "@type": "Organization",
              name: book.volumeInfo.publisher,
            }
          : undefined,
        datePublished: book.volumeInfo.publishedDate,
        description: book.volumeInfo.description
          ? stripHtmlTags(book.volumeInfo.description).substring(0, 500)
          : undefined,
        image:
          book.volumeInfo.imageLinks?.large ||
          book.volumeInfo.imageLinks?.medium ||
          book.volumeInfo.imageLinks?.thumbnail,
        numberOfPages: book.volumeInfo.pageCount,
        inLanguage: book.volumeInfo.language,
        genre: book.volumeInfo.categories,
        isbn:
          book.id && /^(\d{10}|\d{13})$/.test(book.id) ? book.id : undefined,
        aggregateRating:
          book.volumeInfo.averageRating && book.volumeInfo.ratingsCount
            ? {
                "@type": "AggregateRating",
                ratingValue: book.volumeInfo.averageRating,
                reviewCount: book.volumeInfo.ratingsCount,
                bestRating: 5,
                worstRating: 1,
              }
            : undefined,
        url: `https://paperboxd.in/b/${slug}`,
      }
    : null;

  // ── Extracted handlers ────────────────────────────────────────────────────

  function handleLike() {
    if (!isAuthenticated) {
      setSignupAction("like");
      setShowSignupPrompt(true);
      return;
    }
    if (!user?.username || !book) return;

    const isOpenLibraryId = book.id?.startsWith("OL") || book.id?.startsWith("/works/");
    const canonicalId = String(book.id || book._id || book.bookId || "");
    const isbnDigits = extractIsbnDigitsForResolve(book);
    const googleVol = extractGoogleVolumeIdForResolve(book);
    const likeBody: Record<string, unknown> = { type: "liked", bookId: canonicalId };
    if (isbnDigits) likeBody.isbndbId = isbnDigits;
    if (isOpenLibraryId && book.id) likeBody.openLibraryId = book.id;
    if (googleVol && !isbnDigits) likeBody.googleBooksId = googleVol;
    if (!canonicalId && !likeBody.isbndbId && !likeBody.openLibraryId && !likeBody.googleBooksId) {
      toast.error("Missing book identifiers — cannot update likes.");
      return;
    }

    const prev = isLiked;
    const next = !prev;
    setIsLiked(next);

    const url = `/api/users/${encodeURIComponent(user.username)}/books`;
    void (async () => {
      try {
        const response = await fetch(url, {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(likeBody),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          toast.error(typeof err?.error === "string" ? err.error : "Could not update like");
          setIsLiked(prev);
        }
      } catch {
        toast.error("Could not update like");
        setIsLiked(prev);
      }
    })();
  }

  function handleBookshelf() {
    if (!isAuthenticated) {
      setSignupAction("bookshelf");
      setShowSignupPrompt(true);
      return;
    }
    if (!user?.username || !book) return;

    const isOpenLibraryId = book.id?.startsWith("OL") || book.id?.startsWith("/works/");
    const canonicalId = String(book.id || book._id || book.bookId || "");
    const isbnDigits = extractIsbnDigitsForResolve(book);
    const googleVol = extractGoogleVolumeIdForResolve(book);

    const prev = isInBookshelf;
    const next = !prev;
    setIsInBookshelf(next);

    const url = `/api/users/${encodeURIComponent(user.username)}/books`;
    const body: Record<string, unknown> = { type: "bookshelf", bookId: canonicalId };
    if (isbnDigits) body.isbndbId = isbnDigits;
    if (isOpenLibraryId && book.id) body.openLibraryId = book.id;
    if (googleVol && !isbnDigits) body.googleBooksId = googleVol;
    if (next) body.finishedOn = new Date().toISOString();

    void (async () => {
      try {
        const response = await fetch(url, {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          toast.error(typeof err?.error === "string" ? err.error : "Could not update bookshelf");
          setIsInBookshelf(prev);
        }
      } catch {
        toast.error("Could not update bookshelf");
        setIsInBookshelf(prev);
      }
    })();
  }

  function handleTBR() {
    if (!isAuthenticated) {
      setSignupAction("tbr");
      setShowSignupPrompt(true);
      return;
    }
    if (!user?.username || !book) return;

    const isOpenLibraryId = book.id?.startsWith("OL") || book.id?.startsWith("/works/");
    const canonicalId = String(book.id || book._id || book.bookId || "");
    const isbnDigits = extractIsbnDigitsForResolve(book);
    const googleVol = extractGoogleVolumeIdForResolve(book);

    const prev = isInTBR;
    const next = !prev;
    setIsInTBR(next);

    const url = `/api/users/${encodeURIComponent(user.username)}/books`;
    const body: Record<string, unknown> = { type: "tbr", bookId: canonicalId };
    if (isbnDigits) body.isbndbId = isbnDigits;
    if (isOpenLibraryId && book.id) body.openLibraryId = book.id;
    if (googleVol && !isbnDigits) body.googleBooksId = googleVol;

    void (async () => {
      try {
        const response = await fetch(url, {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          toast.error(typeof err?.error === "string" ? err.error : "Could not update TBR");
          setIsInTBR(prev);
        }
      } catch {
        toast.error("Could not update TBR");
        setIsInTBR(prev);
      }
    })();
  }

  async function handleProgressChange(newPagesRead: number) {
    if (!user?.username || !book || isUpdatingProgress) return;

    const prevPagesRead = pagesRead;
    setPagesRead(newPagesRead);
    if (newPagesRead > 0) setIsInTBR(true);
    else setIsInTBR(false);

    setIsUpdatingProgress(true);
    try {
      const bookId = book.id || book._id || book.bookId;
      if (!bookId) return;

      const response = await fetch(
        `/api/users/${encodeURIComponent(user?.username)}/reading-progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: bookId,
            pagesRead: newPagesRead,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.isComplete) toast.success("Book completed!");
      } else {
        setPagesRead(prevPagesRead);
        setIsInTBR(prevPagesRead > 0);
        toast.error("Failed to update reading progress");
      }
    } catch (err) {
      console.error("Error updating reading progress:", err);
      setPagesRead(prevPagesRead);
      setIsInTBR(prevPagesRead > 0);
      toast.error("Failed to update reading progress");
    } finally {
      setIsUpdatingProgress(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const primaryAuthor = volumeInfo.authors?.[0] ?? "";
  const pageCount = volumeInfo.pageCount ?? 0;
  const readTimeMin = pageCount > 0 ? Math.round((pageCount / 40) * 60) : 0;
  const readTimeH = Math.floor(readTimeMin / 60);
  const readTimeM = readTimeMin % 60;
  const readTimeStr = readTimeH > 0 ? `${readTimeH}h ${readTimeM}m` : `${readTimeM}m`;

  const descriptionRaw = volumeInfo.description ? stripHtmlTags(volumeInfo.description) : "";
  const DESC_LIMIT = 600;
  const descTruncated =
    descriptionRaw.length > DESC_LIMIT ? descriptionRaw.slice(0, DESC_LIMIT) + "…" : descriptionRaw;
  const descShown = descExpanded ? descriptionRaw : descTruncated;

  // Pull quote: first sentence/phrase from description if long enough
  const pullQuote =
    descriptionRaw.length > 200
      ? descriptionRaw.split(/[.!?]/)[0]?.trim().slice(0, 120)
      : null;

  // Friends chip (decorative)
  const friendColors = [
    "linear-gradient(135deg,#3a7bd5,#1a1a5e)",
    "linear-gradient(135deg,#b85c38,#6e2f1f)",
    "linear-gradient(135deg,#a8893f,#5a4520)",
  ];
  const friendInitials = ["M", "T", "S"];

  // Primary action button label
  const primaryActionLabel = isInBookshelf
    ? "✓ Finished"
    : pagesRead > 0
    ? "Currently Reading"
    : "+ Mark as Finished";

  // Active states for segmented buttons
  const wantActive = isInTBR && !isInBookshelf && pagesRead === 0;
  const readActive = isInBookshelf;

  const activeSegBtnCls =
    "bg-[#b85c38]/10 border-[#b85c38] text-[#b85c38]";
  const inactiveSegBtnCls =
    "bg-card border border-border text-muted-foreground hover:border-border/80 hover:text-foreground";

  const TABS = [
    { id: "description", label: "Description" },
    { id: "author", label: "Author" },
    { id: "reviews", label: "Reviews" },
    { id: "highlights", label: "Highlights" },
    { id: "lists", label: "Lists" },
  ];

  return (

    <main className="min-h-screen bg-background">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      {/* Navigation */}
      {isMobile ? (
        <Header minimalMobile={isMobile} />
      ) : (
        <>
          <DesktopSidebar />
          <MinimalDesktopHeader />
        </>
      )}

      <div className="mt-16">

        {/* ══════════════════════════════════════════════════════════════
            DESKTOP HERO  (hidden on mobile)
        ══════════════════════════════════════════════════════════════ */}
        <div className="hidden md:block">
          {/* Gradient halo behind hero */}
          <div className="absolute inset-x-0 top-16 h-[420px] bg-gradient-to-b from-[#b85c38]/8 via-[#a8893f]/5 to-transparent pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            <div
              className="grid gap-9 py-9 items-start"
              style={{ gridTemplateColumns: "220px 1fr 240px" }}
            >
              {/* Col 1 — Cover */}
              <div className="relative w-[220px] flex-shrink-0">
                <div className="aspect-[2/3] w-full rounded-lg overflow-hidden shadow-[0_24px_56px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:rotate-[-0.5deg] transition-transform duration-300">
                  {coverImage ? (
                    <Image
                      src={coverImage}
                      alt={volumeInfo.title}
                      fill
                      className="object-cover"
                      priority
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      <BookOpen className="size-16 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Friends chip */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                  <div className="flex">
                    {friendInitials.map((ini, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[0.5rem] border-[1.5px] border-card"
                        style={{
                          background: friendColors[i],
                          marginLeft: i === 0 ? 0 : -6,
                        }}
                      >
                        {ini}
                      </div>
                    ))}
                  </div>
                  <span>Reading now</span>
                </div>
              </div>

              {/* Col 2 — Metadata */}
              <div className="pt-1 min-w-0">
                {/* Breadcrumbs */}
                {volumeInfo.categories && volumeInfo.categories.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                    {volumeInfo.categories.slice(0, 3).map((cat, i) => (
                      <React.Fragment key={cat}>
                        {i > 0 && <span className="text-muted-foreground/50">·</span>}
                        <span>{cat}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h1
                  className={cn(
                    playfair.className,
                    "mt-3 mb-2 leading-[1.02] tracking-[-0.025em] font-extrabold"
                  )}
                  style={{ fontSize: "3rem", fontWeight: 800 }}
                >
                  {volumeInfo.title}
                </h1>

                {/* Subtitle */}
                {volumeInfo.subtitle && (
                  <p
                    className={cn(
                      playfair.className,
                      "text-xl text-muted-foreground mb-4 max-w-xl"
                    )}
                    style={{ fontStyle: "italic" }}
                  >
                    {volumeInfo.subtitle}
                  </p>
                )}

                {/* Author row */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                    Written by
                  </span>
                  {(volumeInfo.authors ?? [primaryAuthor]).filter(Boolean).map((author) => (
                    <span
                      key={author}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-full text-sm font-semibold"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[0.625rem] font-bold flex-shrink-0"
                        style={{ background: authorGradient(author) }}
                      >
                        {getInitials(author)}
                      </div>
                      {author}
                    </span>
                  ))}
                </div>

                {/* Pub row */}
                <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                  {volumeInfo.publisher && (
                    <span>
                      <strong className="text-foreground font-semibold">{volumeInfo.publisher}</strong>
                    </span>
                  )}
                  {publishedDate && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{publishedDate}</span>
                    </>
                  )}
                  {pageCount > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{pageCount} pages</span>
                    </>
                  )}
                  {readTimeStr && pageCount > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>~{readTimeStr} read</span>
                    </>
                  )}
                  {volumeInfo.language && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{volumeInfo.language.toUpperCase()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Col 3 — Action Rail */}
              <div className="sticky top-20 flex flex-col gap-3">
                {/* Card 1: Primary actions */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  {/* Primary button */}
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setSignupAction("bookshelf");
                        setShowSignupPrompt(true);
                        return;
                      }
                      handleBookshelf();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-foreground text-background hover:opacity-90 transition mb-2"
                  >
                    {primaryActionLabel}
                  </button>

                  {/* Segmented 2-button grid */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    <button
                      onClick={handleTBR}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-lg text-[0.625rem] font-semibold transition-all border",
                        wantActive ? activeSegBtnCls : inactiveSegBtnCls
                      )}
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      TBR
                    </button>
                    <button
                      onClick={handleBookshelf}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-lg text-[0.625rem] font-semibold transition-all border",
                        readActive ? activeSegBtnCls : inactiveSegBtnCls
                      )}
                    >
                      <BookMarked className="h-4 w-4" />
                      Read
                    </button>
                  </div>

                  {/* Rating row */}
                  <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                      Your rating
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className="h-4 w-4 text-[#a8893f]"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Like / List / Share row */}
                  <div className="flex items-center gap-0 pt-2">
                    <button
                      onClick={handleLike}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide py-2 rounded-lg hover:text-foreground transition",
                        isLiked ? "text-red-500" : "text-muted-foreground"
                      )}
                    >
                      <Heart
                        className={cn("h-3.5 w-3.5", isLiked && "fill-current")}
                      />
                      Like
                    </button>
                    <button
                      onClick={() => {
                        if (!isAuthenticated) {
                          setSignupAction("general");
                          setShowSignupPrompt(true);
                          return;
                        }
                        setShowAddToList(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wide py-2 rounded-lg hover:text-foreground transition"
                    >
                      + List
                    </button>
                    <button
                      onClick={() => {
                        if (!isAuthenticated) {
                          setSignupAction("general");
                          setShowSignupPrompt(true);
                          return;
                        }
                        setIsShareOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wide py-2 rounded-lg hover:text-foreground transition"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Card 2: Progress */}
                {isAuthenticated && pageCount > 0 && (
                  <ProgressCard
                    pageCount={pageCount}
                    pagesRead={pagesRead}
                    onProgressChange={handleProgressChange}
                    playfairClassName={playfair.className}
                  />
                )}

                {/* Card 3: XP chip */}
                {isAuthenticated && !isInBookshelf && pageCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-[#a8893f]/10 border border-[#a8893f] rounded-xl text-xs font-semibold text-[#a8893f]">
                    <span className="text-sm">✦</span>
                    <span>Complete this book to earn</span>
                    <strong className="ml-auto font-mono">+{pageCount * 2} XP</strong>
                  </div>
                )}

                {/* Diary button */}
                {isAuthenticated && (
                  <button
                    onClick={() => setShowDiaryEditor(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition"
                  >
                    <NotebookPen className="h-3.5 w-3.5" />
                    {existingDiaryContent ? "✏️ Edit your notes" : "Write about it"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── STATS STRIP ── */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-0 mb-8">
            <div className="bg-card border border-border rounded-2xl grid grid-cols-4">
              {/* Cell 1: Community rating */}
              <div className="px-5 py-4">
                <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
                  Community rating
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(playfair.className, "text-[2rem] font-extrabold leading-none tracking-tight")}
                  >
                    {volumeInfo.averageRating ?? "—"}
                    <small className="text-base text-muted-foreground font-normal">/5</small>
                  </div>
                  {volumeInfo.averageRating && (
                    <div className="flex flex-col-reverse gap-0.5 flex-1 min-w-[64px]">
                      {[10, 8, 38, 32, 12].map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[0.5rem] text-muted-foreground">
                          <span className="w-5">{i + 1}★</span>
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p}%`,
                                background: i >= 3 ? "#a8893f" : i >= 2 ? "#b85c38" : "#7a7264",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={cn(playfair.className, "text-[0.6875rem] text-muted-foreground mt-1")}
                  style={{ fontStyle: "italic" }}
                >
                  {volumeInfo.ratingsCount
                    ? `${volumeInfo.ratingsCount.toLocaleString()} readers`
                    : "No ratings yet"}
                </div>
              </div>

              {/* Cell 2: Pages */}
              <div className="px-5 py-4 border-l border-border">
                <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
                  Pages
                </div>
                <div className={cn(playfair.className, "text-[1.75rem] font-extrabold leading-none tracking-tight")}>
                  {pageCount > 0 ? pageCount : "—"}
                </div>
                <div
                  className={cn(playfair.className, "text-[0.6875rem] text-muted-foreground mt-1")}
                  style={{ fontStyle: "italic" }}
                >
                  {pageCount > 0 ? `~${readTimeStr} read` : "Unknown length"}
                </div>
              </div>

              {/* Cell 3: Publisher */}
              <div className="px-5 py-4 border-l border-border">
                <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
                  Publisher
                </div>
                <div className={cn(playfair.className, "text-[1.125rem] font-extrabold leading-tight tracking-tight truncate")}>
                  {volumeInfo.publisher ?? "—"}
                </div>
                <div
                  className={cn(playfair.className, "text-[0.6875rem] text-muted-foreground mt-1")}
                  style={{ fontStyle: "italic" }}
                >
                  {[volumeInfo.language?.toUpperCase(), publishedDate].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>

              {/* Cell 4: Genre */}
              <div className="px-5 py-4 border-l border-border">
                <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
                  Genre
                </div>
                <div className={cn(playfair.className, "text-[1.125rem] font-extrabold leading-tight tracking-tight")}>
                  {volumeInfo.categories?.[0] ?? "—"}
                </div>
                {volumeInfo.categories?.[1] && (
                  <div
                    className={cn(playfair.className, "text-[0.6875rem] text-muted-foreground mt-1")}
                    style={{ fontStyle: "italic" }}
                  >
                    {volumeInfo.categories[1]}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            MOBILE HERO  (hidden on desktop)
        ══════════════════════════════════════════════════════════════ */}
        <div className="md:hidden">
          <div className="bg-gradient-to-b from-[#b85c38]/10 to-transparent pb-4 px-4 pt-6">
            {/* Cover centered */}
            <div className="flex justify-center mb-4">
              <div className="relative w-[140px] aspect-[2/3] rounded-lg overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={volumeInfo.title}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <BookOpen className="size-10 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <h1
              className={cn(playfair.className, "text-center font-extrabold leading-tight tracking-tight")}
              style={{ fontSize: "1.625rem", fontWeight: 800 }}
            >
              {volumeInfo.title}
            </h1>

            {/* Subtitle */}
            {volumeInfo.subtitle && (
              <p
                className={cn(playfair.className, "text-center text-sm text-muted-foreground mt-1.5")}
                style={{ fontStyle: "italic" }}
              >
                {volumeInfo.subtitle}
              </p>
            )}

            {/* Author */}
            {primaryAuthor && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                by <strong className="text-foreground font-semibold">{primaryAuthor}</strong>
              </p>
            )}

            {/* 3-stat row */}
            <div className="flex justify-center gap-8 py-4 border-y border-border mt-4">
              <div className="text-center">
                <div className={cn(playfair.className, "text-[1.125rem] font-extrabold")}>
                  {volumeInfo.averageRating ?? "—"}
                </div>
                <div className="text-[0.5625rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold">
                  ★ Rating
                </div>
              </div>
              <div className="text-center">
                <div className={cn(playfair.className, "text-[1.125rem] font-extrabold")}>
                  {volumeInfo.ratingsCount != null && volumeInfo.ratingsCount > 0
                    ? volumeInfo.ratingsCount > 999
                      ? `${(volumeInfo.ratingsCount / 1000).toFixed(1)}k`
                      : volumeInfo.ratingsCount
                    : pageCount > 0
                    ? pageCount
                    : "—"}
                </div>
                <div className="text-[0.5625rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold">
                  {volumeInfo.ratingsCount != null && volumeInfo.ratingsCount > 0
                    ? "Reading"
                    : "Pages"}
                </div>
              </div>
              <div className="text-center">
                <div className={cn(playfair.className, "text-[1.125rem] font-extrabold")}>
                  {pageCount > 0 ? pageCount : "—"}
                </div>
                <div className="text-[0.5625rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold">
                  Pages
                </div>
              </div>
            </div>

            {/* Friends row (decorative) */}
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <div className="flex">
                {friendInitials.map((ini, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[0.5rem] border-[1.5px] border-background"
                    style={{
                      background: friendColors[i],
                      marginLeft: i === 0 ? 0 : -6,
                    }}
                  >
                    {ini}
                  </div>
                ))}
              </div>
              <span>
                <strong className="text-foreground font-semibold">3 friends</strong> reading now
              </span>
            </div>

            {/* Progress (mobile inline) */}
            {isAuthenticated && pageCount > 0 && (
              <div className="mt-4">
                <ReadingProgress
                  totalPages={pageCount}
                  pagesRead={pagesRead}
                  onProgressChange={handleProgressChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            BODY
        ══════════════════════════════════════════════════════════════ */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
          <div className="grid gap-9 md:grid-cols-[1fr_240px]">

            {/* Left main */}
            <div className="min-w-0">
              {/* Tabs bar */}
              <div className="flex border-b border-border mb-6 overflow-x-auto gap-0" style={{ scrollbarWidth: "none" }}>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-3 text-sm whitespace-nowrap flex items-center gap-1.5 transition-colors border-b-2",
                      activeTab === tab.id
                        ? "border-foreground text-foreground font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Description tab */}
              {activeTab === "description" && (
                <div className="mb-8">
                  <div className="mb-6">
                    <h2
                      className={cn(playfair.className, "text-[1.25rem] font-bold mb-3 tracking-tight")}
                    >
                      About this book
                    </h2>

                    {descriptionRaw ? (
                      <>
                        <p
                          className={cn(playfair.className, "text-base leading-relaxed text-muted-foreground")}
                          style={{
                            maxWidth: 680,
                          }}
                        >
                          {descShown}
                        </p>
                        {descriptionRaw.length > DESC_LIMIT && (
                          <button
                            onClick={() => setDescExpanded((v) => !v)}
                            className="mt-2 text-sm text-[#b85c38] font-semibold"
                          >
                            {descExpanded ? "Show less ↑" : "Read more ↓"}
                          </button>
                        )}

                        {/* Pull quote */}
                        {pullQuote && (
                          <div
                            className={cn(
                              playfair.className,
                              "border-l-4 border-[#b85c38] pl-5 py-1 my-6 text-lg text-foreground"
                            )}
                            style={{ fontStyle: "italic", maxWidth: 600 }}
                          >
                            &ldquo;{pullQuote}&rdquo;
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No description available.</p>
                    )}

                    {/* Stat row */}
                    <div className="flex gap-5 pt-4 border-t border-border text-xs text-muted-foreground mt-6 flex-wrap">
                      {pageCount > 0 && (
                        <span>
                          Reading time · <strong className="text-foreground font-mono">~{readTimeStr}</strong>
                        </span>
                      )}
                      {volumeInfo.language && (
                        <span>
                          Language · <strong className="text-foreground">{volumeInfo.language.toUpperCase()}</strong>
                        </span>
                      )}
                      {volumeInfo.publisher && (
                        <span>
                          Publisher · <strong className="text-foreground">{volumeInfo.publisher}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Facts grid */}
                  <div className="grid grid-cols-3 gap-0 border border-border rounded-xl overflow-hidden bg-card">
                    {[
                      { label: "Published", value: publishedDate ?? "—" },
                      { label: "Publisher", value: volumeInfo.publisher ?? "—" },
                      { label: "Pages", value: pageCount > 0 ? String(pageCount) : "—" },
                      { label: "Language", value: volumeInfo.language?.toUpperCase() ?? "—" },
                      {
                        label: "Categories",
                        value: volumeInfo.categories?.slice(0, 2).join(", ") ?? "—",
                      },
                      {
                        label: "Rating",
                        value: volumeInfo.averageRating ? `${volumeInfo.averageRating} / 5` : "—",
                      },
                    ].map((fact, i) => (
                      <div
                        key={i}
                        className={cn(
                          "px-4 py-3",
                          i % 3 !== 2 && "border-r border-border",
                          i < 3 && "border-b border-border"
                        )}
                      >
                        <div className="text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1">
                          {fact.label}
                        </div>
                        <div className="text-sm font-semibold text-foreground truncate">
                          {fact.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Author books carousel (on desktop, shown in body) */}
                  {authorBooks.length > 0 && primaryAuthor && (
                    <div className="mt-10">
                      <BookCarousel
                        title={`More from ${primaryAuthor}`}
                        subtitle="Other books by this author"
                        books={authorBooks}
                      />
                    </div>
                  )}

                  {/* Similar books carousel */}
                  {similarBooks.length > 0 && (
                    <div className="mt-10">
                      <BookCarousel
                        title={`Similar to ${volumeInfo.title}`}
                        subtitle="Books you might also enjoy"
                        books={similarBooks}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Author tab */}
              {activeTab === "author" && (
                <div className="mb-8">
                  {(volumeInfo.authors?.length ?? 0) > 0 ? (
                    <div className="space-y-6">
                      {volumeInfo.authors!.map((author) => (
                        <div key={author} className="flex items-start gap-4">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                            style={{ background: authorGradient(author) }}
                          >
                            {getInitials(author)}
                          </div>
                          <div>
                            <h3 className={cn(playfair.className, "text-xl font-bold mb-1")}>
                              {author}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Book by {author}
                            </p>
                            <a
                              href={`/authors/${encodeURIComponent(author)}`}
                              className="text-sm text-[#b85c38] font-semibold"
                            >
                              View all books →
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No author information available.</p>
                  )}
                </div>
              )}

              {/* Placeholder tabs */}
              {(activeTab === "reviews" || activeTab === "highlights" || activeTab === "lists") && (
                <div className="mb-8 flex items-center justify-center py-16">
                  <div className="text-center">
                    <p
                      className={cn(playfair.className, "text-lg text-muted-foreground")}
                      style={{ fontStyle: "italic" }}
                    >
                      Coming soon
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeTab === "reviews" && "Reviews from friends will appear here."}
                      {activeTab === "highlights" && "Highlighted passages will appear here."}
                      {activeTab === "lists" && "Lists containing this book will appear here."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="flex flex-col gap-4">

              {/* Mobile: progress card */}
              {isAuthenticated && pageCount > 0 && (
                <div className="md:hidden bg-card border border-border rounded-2xl p-4">
                  <ReadingProgress
                    totalPages={pageCount}
                    pagesRead={pagesRead}
                    onProgressChange={handleProgressChange}
                  />
                </div>
              )}

              {/* Similar books */}
              {similarBooks.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-bold mb-3">
                    Readers also enjoyed
                  </div>
                  <div className="flex flex-col gap-2">
                    {similarBooks.slice(0, 5).map((sb, i) => {
                      const sbCover =
                        (sb as unknown as { volumeInfo?: { imageLinks?: { thumbnail?: string } } })
                          .volumeInfo?.imageLinks?.thumbnail ?? "";
                      const sbTitle =
                        (sb as unknown as { volumeInfo?: { title?: string } }).volumeInfo?.title ??
                        (sb as unknown as { title?: string }).title ??
                        "Untitled";
                      const sbAuthor =
                        (sb as unknown as { volumeInfo?: { authors?: string[] } }).volumeInfo?.authors?.[0] ??
                        (sb as unknown as { author?: string }).author ??
                        "";
                      return (
                        <div key={i} className="flex gap-3 items-center p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                          {sbCover ? (
                            <div className="relative w-9 h-[52px] flex-shrink-0 rounded overflow-hidden">
                              <Image
                                src={sbCover}
                                alt={sbTitle}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div
                              className="w-9 h-[52px] rounded flex-shrink-0"
                              style={{ background: authorGradient(sbTitle) }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{sbTitle}</div>
                            {sbAuthor && (
                              <div className="text-[0.6875rem] text-muted-foreground mt-0.5 truncate">
                                {sbAuthor}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Author card */}
              {primaryAuthor && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-bold mb-3">
                    From the author
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: authorGradient(primaryAuthor) }}
                    >
                      {getInitials(primaryAuthor)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{primaryAuthor}</div>
                      <div className="text-xs text-muted-foreground">
                        {authorBooks.length > 0
                          ? `${authorBooks.length} book${authorBooks.length !== 1 ? "s" : ""} in our library`
                          : "Author"}
                      </div>
                    </div>
                  </div>
                  <p
                    className={cn(playfair.className, "text-xs text-muted-foreground leading-relaxed mb-3")}
                    style={{ fontStyle: "italic" }}
                  >
                    Explore more works by this author.
                  </p>
                  <a
                    href={`/authors/${encodeURIComponent(primaryAuthor)}`}
                    className="text-xs text-[#b85c38] font-semibold"
                  >
                    View all books →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE STICKY BOTTOM BAR
      ══════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50 flex items-center gap-2 px-4 py-3 pb-7 bg-background/95 backdrop-blur border-t border-border">
        <button
          onClick={handleLike}
          className={cn(
            "w-10 h-10 flex items-center justify-center border border-border rounded-xl transition",
            isLiked ? "bg-red-500/10 border-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
        </button>
        <button
          onClick={() => {
            if (!isAuthenticated) {
              setSignupAction("bookshelf");
              setShowSignupPrompt(true);
              return;
            }
            handleBookshelf();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition"
        >
          {isInBookshelf ? "✓ Read" : "+ Mark as Finished"}
        </button>
        <button
          className="w-10 h-10 flex items-center justify-center border border-border rounded-xl text-muted-foreground hover:text-foreground transition"
        >
          <Star className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            if (!isAuthenticated) {
              setSignupAction("general");
              setShowSignupPrompt(true);
              return;
            }
            setIsShareOpen(true);
          }}
          className="w-10 h-10 flex items-center justify-center border border-border rounded-xl text-muted-foreground hover:text-foreground transition"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════ */}
      <SignupPromptDialog
        open={showSignupPrompt}
        onOpenChange={setShowSignupPrompt}
        action={signupAction}
      />

      {book && user?.username && (
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
          username={user?.username}
          onSave={() => {
            if (user?.username) {
              fetch(`/api/users/${encodeURIComponent(user?.username)}/diary`)
                .then((res) => res.json())
                .then((data) => {
                  type DiaryEntry = {
                    bookId?: { toString(): string } | string;
                    content?: string;
                  };
                  const bookId = book._id || book.bookId || book.id;
                  const existingEntry = data.entries?.find((entry: DiaryEntry) => {
                    return (
                      entry.bookId?.toString() === bookId?.toString() ||
                      (book.id && entry.bookId === book.id)
                    );
                  });
                  if (existingEntry) {
                    setExistingDiaryContent(existingEntry.content || "");
                  }
                })
                .catch(() => {
                  // Error already logged
                });
            }
          }}
        />
      )}

      {/* Add to List Dialog */}
      {book && user?.username && (
        <AddToListDialog
          open={showAddToList}
          onOpenChange={setShowAddToList}
          username={user.username}
          bookId={String(book._id || book.bookId || book.id || "")}
          isbndbId={extractIsbnDigitsForResolve(book)}
          openLibraryId={
            book.id?.startsWith("OL") || book.id?.startsWith("/works/")
              ? book.id
              : undefined
          }
          bookTitle={book.volumeInfo.title}
        />
      )}

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
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.97 9.272c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.87 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
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
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground">X</span>
              </button>
            </div>

            <div className="border-t border-border my-4" />

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
              {(isLoadingFollowing && !shareSearchQuery.trim()) ||
              (isSearchingUsers && shareSearchQuery.trim()) ? (
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
                  {usersToDisplay.map((shareUser) => {
                    const avatar = shareUser.avatar || DEFAULT_AVATAR;
                    const initials =
                      shareUser.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) ||
                      shareUser.username?.[0]?.toUpperCase() ||
                      "?";

                    return (
                      <div
                        key={shareUser.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                          {shareUser.avatar ? (
                            <Image
                              src={avatar}
                              alt={shareUser.name || shareUser.username}
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
                            {shareUser.name || shareUser.username}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{shareUser.username}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendToUser(shareUser.username)}
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

      {/* Shimmer animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </main>
  );
}

// ── Inline progress card with drag support ────────────────────────────────────
function ProgressCard({
  pageCount,
  pagesRead,
  onProgressChange,
  playfairClassName,
}: {
  pageCount: number;
  pagesRead: number;
  onProgressChange: (n: number) => void;
  playfairClassName: string;
}) {
  // Local pages drives all visuals — parent is only called (debounced) during
  // drag and immediately on release, so no parent re-render causes jank.
  const [localPages, setLocalPages] = React.useState(pagesRead);
  const [dragActive, setDragActive] = React.useState(false);
  const barRef = React.useRef<HTMLDivElement>(null);
  // Tracks the pointer-down origin for relative drag (1 px = 1 page).
  const dragOrigin = React.useRef<{ x: number; pages: number } | null>(null);
  const rafId = React.useRef<number | undefined>(undefined);
  const saveTimer = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const pct = pageCount > 0 ? Math.min((localPages / pageCount) * 100, 100) : 0;

  // Sync from parent only when idle (not dragging).
  React.useEffect(() => {
    if (!dragActive) setLocalPages(pagesRead);
  }, [pagesRead, dragActive]);

  React.useEffect(() => () => clearTimeout(saveTimer.current), []);

  const clamp = (n: number) => Math.max(0, Math.min(Math.round(n), pageCount));

  const scheduleSave = (pages: number) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onProgressChange(clamp(pages)), 300);
  };

  const absoluteFromClientX = (clientX: number) => {
    if (!barRef.current) return localPages;
    const { left, width } = barRef.current.getBoundingClientRect();
    return clamp(((clientX - left) / width) * pageCount);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Click sets absolute position; subsequent drag is relative from here.
    const startPages = absoluteFromClientX(e.clientX);
    setLocalPages(startPages);
    scheduleSave(startPages);
    dragOrigin.current = { x: e.clientX, pages: startPages };
    setDragActive(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const clientX = e.clientX;
    rafId.current = requestAnimationFrame(() => {
      if (!dragOrigin.current) return;
      // 1 px = 1 page — drag is relative to the pointer-down origin.
      const delta = clientX - dragOrigin.current.x;
      const newPages = clamp(dragOrigin.current.pages + Math.round(delta));
      setLocalPages(newPages);
      scheduleSave(newPages);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const delta = e.clientX - dragOrigin.current.x;
    const finalPages = clamp(dragOrigin.current.pages + Math.round(delta));
    setLocalPages(finalPages);
    clearTimeout(saveTimer.current);
    onProgressChange(finalPages);
    dragOrigin.current = null;
    setDragActive(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Your progress
        </span>
        <span className="font-mono font-bold text-sm">
          {Math.round(pct)}
          <span className="text-xs text-muted-foreground font-normal">%</span>
        </span>
      </div>

      {/* Draggable progress bar — grows taller while dragging for a bigger grab target */}
      <div
        className="relative flex items-center mb-3"
        style={{
          height: dragActive ? 24 : 8,
          transition: "height 0.15s ease",
        }}
      >
        <div
          ref={barRef}
          role="slider"
          aria-valuenow={localPages}
          aria-valuemin={0}
          aria-valuemax={pageCount}
          tabIndex={0}
          className={cn(
            "absolute inset-0 rounded-full bg-muted overflow-visible select-none touch-none",
            dragActive ? "cursor-grabbing" : "cursor-pointer"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { const p = clamp(localPages + 1);  setLocalPages(p); onProgressChange(p); }
            if (e.key === "ArrowLeft")  { const p = clamp(localPages - 1);  setLocalPages(p); onProgressChange(p); }
            if (e.key === "ArrowUp")    { const p = clamp(localPages + 10); setLocalPages(p); onProgressChange(p); }
            if (e.key === "ArrowDown")  { const p = clamp(localPages - 10); setLocalPages(p); onProgressChange(p); }
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-[#b85c38] to-[#a8893f] rounded-full relative overflow-hidden"
            style={{ width: `${pct}%` }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{ animation: "shimmer 2.4s infinite" }}
            />
          </div>
          {/* Drag thumb — grows with the bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-background border-2 border-[#b85c38] shadow pointer-events-none"
            style={{
              left: `${pct}%`,
              width: dragActive ? 22 : 16,
              height: dragActive ? 22 : 16,
              transition: "width 0.15s ease, height 0.15s ease",
            }}
          />
        </div>
      </div>

      {/* Page stepper */}
      <div className="flex items-center gap-2 justify-between">
        <button
          onClick={() => { const p = clamp(localPages - 1); setLocalPages(p); onProgressChange(p); }}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition text-base font-bold"
        >
          −
        </button>
        <div className="flex-1 text-center font-mono text-sm font-semibold">
          <span className="text-muted-foreground">p. </span>
          <strong>{localPages}</strong>
          <span className="text-muted-foreground"> / {pageCount}</span>
        </div>
        <button
          onClick={() => { const p = clamp(localPages + 1); setLocalPages(p); onProgressChange(p); }}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition text-base font-bold"
        >
          +
        </button>
      </div>

      {pagesRead > 0 && (
        <p className={cn(playfairClassName, "text-xs text-muted-foreground text-center mt-2")} style={{ fontStyle: "italic" }}>
          keep going!
        </p>
      )}
    </div>
  );
}
