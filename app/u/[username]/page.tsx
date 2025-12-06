"use client";

import Image from "next/image";
import * as React from "react";
import { UserRound, Users } from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

import { useSession } from "next-auth/react";
import { Dock, DockToggle } from "@/components/ui/dock";
import { InteractiveHoverButton } from "@/components/ui/buttons";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/primitives/pagination";
import { Header } from "@/components/ui/layout/header-with-search";
import { DesktopSidebar } from "@/components/ui/layout/desktop-sidebar";
import { MinimalDesktopHeader } from "@/components/ui/layout/minimal-desktop-header";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { Dropdown } from "@/components/ui/primitives/dropdown";
import { EditProfileForm, defaultProfile, type EditableProfile } from "@/components/ui/forms/edit-profile-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/primitives/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/primitives/dialog";
import { Edit, MoreVertical, Trash2, Plus, X, Heart, AlertTriangle } from "lucide-react";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { createBookSlug } from "@/lib/utils/book-slug";
import { cn, DEFAULT_AVATAR, formatDiaryDate } from "@/lib/utils";
import {
  type BookshelfBook,
  type LikedBook,
  type TbrBook,
  type ReadingList,
  type ProfileBook,
} from "@/lib/mock/profileBooks";
import { DiaryEntryDialog } from "@/components/ui/dialogs/diary-entry-dialog";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { Switch } from "@/components/ui/primitives/switch";
import { Button } from "@/components/ui/primitives/button";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";
import { ReadingProgressCompact } from "@/components/ui/features/reading-progress-compact";

const dockLabels = ["Favourites", "Bookshelf", "Diary", "Authors", "Lists", "DNF", "Likes"] as const;
type DockLabel = (typeof dockLabels)[number] | "Activity";
type ActivityView = "Friends" | "Me";
const BOOKSHELF_PAGE_SIZE = 12;
const LIKES_PAGE_SIZE = 12;
const TBR_PAGE_SIZE = 12;
const AUTHORS_PAGE_SIZE = 12;
const DIARY_PAGE_SIZE = 15; // 3x5 grid
const LISTS_PAGE_SIZE = 12;

type ActivityEntry = {
  id: string;
  name: string;
  action: string;
  detail: string;
  timeAgo: string;
  cover: string;
  type?: string; // Activity type: "diary_entry", "read", "rated", "collaboration_request", etc.
  diaryEntryId?: string; // For diary entries
  bookId?: string; // For diary entries
  bookTitle?: string; // For diary entries
  bookAuthor?: string; // For diary entries
  content?: string; // For diary entries
  createdAt?: string; // For diary entries
  updatedAt?: string; // For diary entries
  isLiked?: boolean; // For diary entries
  likesCount?: number; // For diary entries
  listId?: string; // For collaboration requests
  listName?: string; // For collaboration requests
  inviter?: string; // For collaboration requests
};


type AuthorStat = {
  name: string;
  read: number;
  tbr: number;
  cover: string;
  books?: BookshelfBook[];
};

type UserListItem = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
};

function AuthPromptDialog({
  open,
  onOpenChange,
  action = "access this feature",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: string;
}) {
  const router = useRouter();

  const handleSignIn = React.useCallback(() => {
    onOpenChange(false);
    try {
      router.push("/auth");
    } catch (error) {
      console.error("Error in handleSignIn:", error);
    }
  }, [onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            You need to sign in or create an account to {action}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <InteractiveHoverButton
            text="Sign in or Sign up"
            showIdleAccent={false}
            invert
            className="w-full"
            onClick={handleSignIn}
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowersFollowingDialog({
  type,
  username,
  count,
  isAuthenticated,
}: {
  type: "followers" | "following";
  username: string;
  count: number;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);
  const [users, setUsers] = React.useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(() => {
    if (!isAuthenticated || !username) return;

    // Reset state when opening
    setUsers([]);
    setError(null);
    setIsLoading(true);

    // Fetch the list
    fetch(`/api/users/${encodeURIComponent(username)}/${type}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            setError("Please sign in to view this list");
          } else if (res.status === 403) {
            setError("Access denied");
          } else {
            setError(`Failed to load list (${res.status})`);
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          const usersList = data[type] || [];
          console.log(`[FollowersFollowingDialog] ${type} fetched:`, usersList);
          setUsers(usersList);
        } else {
          console.log(`[FollowersFollowingDialog] ${type} no data`);
          setUsers([]);
        }
      })
      .catch((err) => {
        console.error(`[FollowersFollowingDialog] Failed to fetch ${type}:`, err);
        setError("Failed to load list");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [username, type, isAuthenticated]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && isAuthenticated) {
      // Fetch when dialog opens
      fetchUsers();
    } else if (!newOpen) {
      // Reset when closing
      setUsers([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchUsers]);

  const handleClick = React.useCallback(() => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    setOpen(true);
    // Trigger fetch when clicking
    fetchUsers();
  }, [isAuthenticated, fetchUsers]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
      >
        {count} {type}
      </button>
      <AuthPromptDialog
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        action={`view ${type}`}
      />
      {isAuthenticated && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="capitalize">{type}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <TetrisLoading size="sm" speed="fast" loadingText="Loading..." />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No {type} yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        try {
                          router.push(`/u/${encodeURIComponent(user.username)}`);
                        } catch (error) {
                          console.error("Error navigating to user profile:", error);
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image
                          src={user.avatar || DEFAULT_AVATAR}
                          alt={user.username}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function ProfileSummary({
  profile,
  bookshelfCount,
  followersCount,
  followingCount,
  onEdit,
  onFollow,
  canEdit,
  isFollowing,
  isFollowLoading,
  isAuthenticated,
  authPromptOpen,
  onAuthPromptChange,
}: {
  profile: EditableProfile;
  bookshelfCount: number;
  followersCount: number;
  followingCount: number;
  onEdit: () => void;
  onFollow: () => void;
  canEdit: boolean;
  isFollowing: boolean;
  isFollowLoading: boolean;
  isAuthenticated: boolean;
  onSignIn: () => void;
  authPromptOpen: boolean;
  onAuthPromptChange: (open: boolean) => void;
}) {
  const bioRef = React.useRef<HTMLParagraphElement>(null);
  const [showReadMore, setShowReadMore] = React.useState(false);

  // Check if bio is truncated
  const checkTruncation = React.useCallback(() => {
    if (bioRef.current && profile.bio && profile.bio.length > 0) {
      // Check if the element's scroll height is greater than its client height
      // This indicates the text is truncated by line-clamp
      const isTruncated = bioRef.current.scrollHeight > bioRef.current.clientHeight;
      setShowReadMore(isTruncated);
    } else {
      setShowReadMore(false);
    }
  }, [profile.bio]);

  React.useEffect(() => {
    // Use requestAnimationFrame to ensure layout is complete
    const timeoutId = setTimeout(() => {
      checkTruncation();
    }, 0);

    // Recheck on window resize
    const handleResize = () => {
      setTimeout(checkTruncation, 0);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkTruncation]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0">
          {(() => {
            const avatarSrc = profile.avatar || DEFAULT_AVATAR;
            console.log(`[ProfileSummary] Rendering avatar:`, avatarSrc ? `"${avatarSrc.substring(0, 100)}..."` : 'null/undefined');
            console.log(`[ProfileSummary] Using default:`, !profile.avatar);
            return (
              <Image
                src={avatarSrc}
                alt="Profile avatar"
                fill
                className="rounded-full border-4 border-background object-cover shadow-lg"
                onError={(e) => {
                  console.error(`[ProfileSummary] Image load error:`, e);
                  console.error(`[ProfileSummary] Failed to load avatar:`, avatarSrc);
                }}
                onLoad={() => {
                  console.log(`[ProfileSummary] Image loaded successfully:`, avatarSrc ? `"${avatarSrc.substring(0, 100)}..."` : 'null');
                }}
              />
            );
          })()}
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-semibold text-foreground break-words">{profile.username}</p>
              {profile.pronouns.length ? (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground flex-shrink-0">
                  {profile.pronouns.join("/")}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground break-words">{profile.name}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-foreground">
            <span>{bookshelfCount} books</span>
            <FollowersFollowingDialog
              type="followers"
              username={profile.username}
              count={followersCount}
              isAuthenticated={isAuthenticated}
            />
            <FollowersFollowingDialog
              type="following"
              username={profile.username}
              count={followingCount}
              isAuthenticated={isAuthenticated}
            />
          </div>
          <div className="space-y-1">
            {profile.bio && profile.bio.length > 0 ? (
              <Dialog>
                <div className="flex items-start gap-1.5 min-w-0">
                  <p
                    ref={bioRef}
                    className="text-sm text-muted-foreground line-clamp-1 flex-1 min-w-0 overflow-hidden"
                  >
                    {profile.bio}
                  </p>
                  {showReadMore && (
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary/80 underline flex-shrink-0 cursor-pointer"
                      >
                        read more
                      </button>
                    </DialogTrigger>
                  )}
                </div>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Bio</DialogTitle>
                    <DialogDescription asChild>
                      <div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words pt-2">
                          {profile.bio}
                        </p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            ) : canEdit ? (
              <p className="text-sm text-muted-foreground">Add a bio to share your vibe.</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {canEdit ? (
          <InteractiveHoverButton
            text="Edit profile"
            showIdleAccent={false}
            invert
            className="min-w-[180px] max-w-xs"
            onClick={onEdit}
          />
        ) : (
          <InteractiveHoverButton
            text={isFollowLoading ? "Loading..." : isFollowing ? "Following" : "Follow"}
            showIdleAccent={false}
            invert={!isFollowing}
            className="min-w-[180px] max-w-xs"
            onClick={onFollow}
            disabled={isFollowLoading}
          />
        )}
      </div>
      <AuthPromptDialog
        open={authPromptOpen}
        onOpenChange={onAuthPromptChange}
        action="follow users"
      />
    </section>
  );
}

function AuthRequiredBanner({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-muted/20 p-10 text-center">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">Sign in to explore this profile</p>
        <p className="text-sm text-muted-foreground">
          You can preview the basics, but you&apos;ll need to log in to browse bookshelves, activity, and lists.
        </p>
      </div>
      <InteractiveHoverButton text="Sign in or create account" showIdleAccent className="w-full max-w-sm" onClick={onSignIn} />
    </section>
  );
}

function BookCard({ title, author, cover, mood }: ProfileBook) {
  return (
    <div className="group flex w-[180px] flex-shrink-0 flex-col gap-3">
      <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-muted shadow-sm">
        <Image
          src={cover}
          alt={`${title} cover`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="180px"
          quality={100}
          unoptimized={cover?.includes('isbndb.com') || cover?.includes('images.isbndb.com') || cover?.includes('covers.isbndb.com') || true}
        />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{author}</p>
        {mood ? <p className="text-xs text-muted-foreground/80">{mood}</p> : null}
      </div>
    </div>
  );
}

// Favorite book card - only shows cover, no text, with remove button on hover
function FavoriteBookCard({
  cover,
  title,
  onRemove,
  isRemoving,
  onClick
}: {
  cover: string;
  title: string;
  onRemove?: () => void;
  isRemoving?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="group relative flex w-[180px] flex-shrink-0">
      <div
        className="relative aspect-[2/3] w-full overflow-visible rounded-3xl bg-muted shadow-sm cursor-pointer"
        onClick={onClick}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-3xl">
          <Image
            src={cover}
            alt={`${title} cover`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="180px"
            quality={100}
            unoptimized={cover?.includes('isbndb.com') || cover?.includes('images.isbndb.com') || cover?.includes('covers.isbndb.com') || true}
          />
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await onRemove();
              } catch (error) {
                console.error("Error in onRemove:", error);
              }
            }}
            disabled={isRemoving}
            className="absolute right-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-muted disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function BookCarousel({
  title,
  subtitle,
  books,
}: {
  title: string;
  subtitle: string;
  books: ProfileBook[];
}) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      {title && (
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {books.map((book) => (
          <BookCard key={book.id} {...book} />
        ))}
      </div>
    </section>
  );
}

function FavoriteBookSearchDialog({
  open,
  onOpenChange,
  onBookSelect,
  currentBooks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookSelect: (book: ProfileBook) => void;
  currentBooks: string[];
}) {
  type SearchResultBook = {
    id?: string;
    _id?: { toString(): string } | string;
    title?: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    volumeInfo?: {
      title?: string;
      authors?: string[];
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
      id?: string;
    };
    isbndbId?: string;
    openLibraryId?: string;
  };
  const [query, setQuery] = React.useState("");
  const [bookResults, setBookResults] = React.useState<SearchResultBook[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Ensure currentBooks is always an array
  const safeCurrentBooks: string[] = Array.isArray(currentBooks) ? currentBooks : [];

  // Debounced search
  React.useEffect(() => {
    if (!query.trim() || !open) {
      setBookResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}&maxResults=10&forceFresh=true`);
        if (response.ok) {
          const data = await response.json();
          console.log("[FavoriteBookSearchDialog] Search response:", data);

          // Handle both Google Books format (data.items) and database format (data.books)
          const books = Array.isArray(data.books) ? data.books : (Array.isArray(data.items) ? data.items : []);
          console.log("[FavoriteBookSearchDialog] Extracted books:", books.length, books);

          type BookFromAPI = {
            id?: string;
            _id?: string;
            title?: string;
            volumeInfo?: {
              title?: string;
              authors?: string[];
            };
          };
          // Ensure all books are valid objects - be more lenient with the filter
          const validBooks = books.filter((book: BookFromAPI) => {
            if (!book || typeof book !== 'object') {
              console.log("[FavoriteBookSearchDialog] Filtered out invalid book:", book);
              return false;
            }
            // Check if book has at least a title or volumeInfo
            const hasTitle = book.title || book.volumeInfo?.title;
            if (!hasTitle) {
              console.log("[FavoriteBookSearchDialog] Filtered out book without title:", book);
              return false;
            }
            return true;
          });
          console.log("[FavoriteBookSearchDialog] Valid books after filtering:", validBooks.length, validBooks);
          setBookResults(validBooks);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Search API error:", response.status, response.statusText, errorData);
          setBookResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setBookResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, open]);

  // Reset query when dialog closes
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setBookResults([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-3xl">
        <DialogHeader className="space-y-3 pb-4 border-b border-border/30">
          <DialogTitle className="text-2xl font-bold text-foreground">Add favorite book</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Search and add books to your favorites (maximum 4 books)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6 py-6">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="w-full rounded-2xl border-2 border-gray-300 dark:border-border/60 bg-white dark:bg-background/50 backdrop-blur-sm px-6 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all shadow-sm"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Results Container */}
          <div className="flex-1 overflow-y-auto px-1 -mx-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-16">
                <TetrisLoading size="md" speed="fast" loadingText="Searching books..." />
              </div>
            ) : bookResults.length === 0 && query.trim() ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted/50 p-6 mb-4">
                  <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">No books found</p>
                <p className="text-sm text-muted-foreground">Try searching with a different term</p>
              </div>
            ) : query.trim() === "" ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted/50 p-6 mb-4">
                  <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Start searching</p>
                <p className="text-sm text-muted-foreground">Enter a book title, author, or ISBN to begin</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookResults
                  .filter((book) => {
                    // Filter out null/undefined books
                    if (!book || typeof book !== 'object') return false;
                    // Allow books even without IDs - we'll generate a key from title/index
                    return true;
                  })
                  .map((book, index) => {
                    const cover =
                      book.imageLinks?.thumbnail ||
                      book.imageLinks?.smallThumbnail ||
                      book.volumeInfo?.imageLinks?.thumbnail ||
                      book.volumeInfo?.imageLinks?.smallThumbnail ||
                      "";
                    const title = book.title || book.volumeInfo?.title || "Unknown Title";
                    const authors = book.authors || book.volumeInfo?.authors || [];
                    const author = Array.isArray(authors) ? authors.join(", ") : (authors || "Unknown Author");
                    // Extract bookId - API returns id at top level, or _id for database results
                    // Handle empty string IDs by using _id or generating a fallback
                    const bookId = (book.id && book.id !== '')
                      ? book.id
                      : (book._id?.toString() || book.volumeInfo?.id || `${title}-${index}`);
                    const isAlreadyAdded = bookId && bookId !== `${title}-${index}` ? safeCurrentBooks.some(
                      (id: string) => {
                        // Compare IDs - handle both string and ObjectId comparisons
                        const idStr = id;
                        const bookIdStr = typeof bookId === 'string' ? bookId : String(bookId);
                        return idStr === bookIdStr || idStr === book._id?.toString();
                      }
                    ) : false;

                    return (
                      <button
                        key={book._id?.toString() || book.id || `${title}-${index}`}
                        type="button"
                        onClick={() => {
                          if (!isAlreadyAdded && book) {
                            // Ensure book has the correct structure for the handler
                            const bookToAdd = {
                              ...book,
                              id: (book.id && book.id !== '')
                                ? book.id
                                : (book._id?.toString() || `${title}-${index}`),
                              _id: book._id?.toString() || book._id,
                              volumeInfo: book.volumeInfo || {
                                title: book.title,
                                authors: book.authors,
                                imageLinks: book.imageLinks,
                              },
                            };
                            onBookSelect({
                              id: bookToAdd.id || "",
                              title: bookToAdd.title || "",
                              author: Array.isArray(bookToAdd.authors) ? bookToAdd.authors.join(", ") : (bookToAdd.authors || "Unknown Author"),
                              cover: bookToAdd.imageLinks?.thumbnail || bookToAdd.imageLinks?.smallThumbnail || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                            } as ProfileBook);
                            onOpenChange(false);
                          }
                        }}
                        disabled={isAlreadyAdded}
                        className="w-full flex gap-4 rounded-2xl border border-border/60 bg-white/80 dark:bg-background/80 backdrop-blur-sm p-4 text-left transition-all hover:bg-white dark:hover:bg-background hover:border-primary/50 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none group"
                      >
                        {cover ? (
                          <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted shadow-md group-hover:shadow-xl transition-shadow">
                            <Image
                              src={cover}
                              alt={`${title} cover`}
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted shadow-md flex items-center justify-center">
                            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                            {author}
                          </p>
                          {isAlreadyAdded && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              <p className="text-xs font-medium text-green-600 dark:text-green-400">Already in favorites</p>
                            </div>
                          )}
                        </div>
                        {!isAlreadyAdded && (
                          <div className="flex items-center">
                            <div className="rounded-full bg-primary/10 p-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <Plus className="h-5 w-5" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditableFavoriteBooksCarousel({
  title,
  subtitle,
  books,
  username,
  canEdit,
  onUpdate,
}: {
  title: React.ReactNode;
  subtitle: string;
  books: ProfileBook[];
  username: string;
  canEdit: boolean;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = React.useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [bookToReplace, setBookToReplace] = React.useState<string | null>(null);
  const [draggedBookId, setDraggedBookId] = React.useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [localBooks, setLocalBooks] = React.useState<ProfileBook[]>(books);
  const justDraggedRef = React.useRef(false);

  // Navigate to book page
  const handleBookClick = React.useCallback((book: ProfileBook) => {
    try {
      // Priority: isbndbId > openLibraryId > bookId (MongoDB _id) > create slug from title
      const bookId = book.isbndbId || book.openLibraryId || book.bookId || book.id;

      if (bookId) {
        // Check if it's an ISBN (10 or 13 digits)
        const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
        // Check if it's an Open Library ID
        const isOpenLibraryId = bookId.startsWith("OL") || bookId.startsWith("/works/");
        // Check if it's a MongoDB ObjectId (24 hex characters)
        const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
        // Check if it's a valid ID format (alphanumeric, no spaces, no +)
        const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");

        // Use ID directly if it's a recognized format
        if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
          try {
            router.push(`/b/${bookId}`);
          } catch (error) {
            console.error("Navigation error:", error);
          }
        } else {
          // Create slug from title for unrecognized formats
          const slug = createBookSlug(book.title, book.isbndbId, bookId);
          try {
            router.push(`/b/${slug}`);
          } catch (error) {
            console.error("Navigation error:", error);
          }
        }
      } else {
        // Fallback to slug if no ID available
        const slug = createBookSlug(book.title);
        try {
          router.push(`/b/${slug}`);
        } catch (error) {
          console.error("Navigation error:", error);
        }
      }
    } catch (error) {
      console.error("Error in handleBookClick:", error);
    }
  }, [router]);

  type BookToAdd = {
    id?: string;
    _id?: { toString(): string } | string;
    title?: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    volumeInfo?: {
      title?: string;
      authors?: string[];
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
      isbndbId?: string;
      openLibraryId?: string;
    };
    isbndbId?: string;
    openLibraryId?: string;
    apiSource?: string;
  };
  const handleAddBook = React.useCallback(async (book: BookToAdd, replaceBookId?: string) => {
    if (!book || (typeof book !== 'object')) {
      console.error("Invalid book data:", book);
      alert("Invalid book data");
      return;
    }

    try {
      // If replacing, remove the old book first
      if (replaceBookId) {
        const response = await fetch(`/api/users/${encodeURIComponent(username)}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "favorite",
            bookId: replaceBookId,
            remove: true,
          }),
        });
        if (!response.ok) {
          alert("Failed to replace book");
          return;
        }
      } else if (books.length >= 4) {
        alert("Maximum 4 favorite books allowed");
        return;
      }

      // Add the new book
      // Extract identifiers - book.id from search API might be isbndbId or openLibraryId, not MongoDB _id
      const mongoDbId = book._id?.toString(); // MongoDB _id (if from cache)
      const searchApiId = book.id; // This could be isbndbId, openLibraryId, or MongoDB _id

      // Extract isbndbId and openLibraryId
      let isbndbId = book.isbndbId || book.volumeInfo?.isbndbId;
      let openLibraryId = book.openLibraryId || book.volumeInfo?.openLibraryId;

      // If searchApiId looks like an ISBN (10 or 13 digits), it's likely an isbndbId
      if (!isbndbId && searchApiId && /^(\d{10}|\d{13})$/.test(searchApiId)) {
        isbndbId = searchApiId;
      }

      // If searchApiId looks like an Open Library ID (starts with OL or /works/), it's likely an openLibraryId
      if (!openLibraryId && searchApiId && (searchApiId.startsWith('OL') || searchApiId.startsWith('/works/'))) {
        openLibraryId = searchApiId;
      }

      // Check if searchApiId is a MongoDB ObjectId (24 hex characters)
      const isMongoDbId = mongoDbId || (searchApiId && /^[0-9a-fA-F]{24}$/.test(searchApiId));
      const bookId = isMongoDbId ? (mongoDbId || searchApiId) : undefined;

      // Must have at least one identifier
      if (!bookId && !isbndbId && !openLibraryId) {
        console.error("Book missing all identifiers:", book);
        alert("Book data is missing required information");
        return;
      }

      console.log("[handleAddBook] Adding book with:", { bookId, isbndbId, openLibraryId, apiSource: book.apiSource });

      const response = await fetch(`/api/users/${encodeURIComponent(username)}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "favorite",
          ...(bookId && { bookId }), // Only include if it's a MongoDB _id
          ...(isbndbId && { isbndbId }),
          ...(openLibraryId && { openLibraryId }),
          volumeInfo: book.volumeInfo || {
            title: book.title,
            authors: book.authors,
            imageLinks: book.imageLinks,
          },
        }),
      });

      if (response.ok) {
        // Handle onUpdate properly - it might be async
        try {
          await onUpdate();
        } catch (updateError) {
          console.error("Error in onUpdate:", updateError);
        }
      } else {
        const error = await response.json().catch(() => ({}));
        console.error("[handleAddBook] API error:", error);
        alert(error.error || error.details || "Failed to add book");
      }
    } catch (error) {
      console.error("Add error:", error);
      alert(error instanceof Error ? error.message : "Failed to add book");
    }
  }, [books.length, username, onUpdate]);

  const handleRemoveBook = async (bookId: string) => {
    if (isRemoving) return;
    setIsRemoving(bookId);
    try {
      const book = books.find((b) => b.id === bookId);
      if (!book) {
        setIsRemoving(null);
        return;
      }

      const response = await fetch(`/api/users/${encodeURIComponent(username)}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "favorite",
          bookId: bookId,
          remove: true,
        }),
      });

      if (response.ok) {
        // Handle onUpdate properly - it might be async
        try {
          await onUpdate();
        } catch (updateError) {
          console.error("Error in onUpdate:", updateError);
        }
      } else {
        const error = await response.json().catch(() => ({}));
        console.error("[handleRemoveBook] API error:", error);
      }
    } catch (error) {
      console.error("Remove error:", error);
    } finally {
      setIsRemoving(null);
    }
  };

  // Update localBooks when books prop changes
  React.useEffect(() => {
    setLocalBooks(books);
  }, [books]);

  // Handle drag and drop reordering
  const handleDragStart = (e: React.DragEvent, bookId: string) => {
    if (!canEdit) return;
    setDraggedBookId(bookId);
    justDraggedRef.current = false;
    e.dataTransfer.effectAllowed = "move";
    // Set drag image to be the book cover for better UX
    const target = e.currentTarget as HTMLElement;
    if (target) {
      e.dataTransfer.setDragImage(target, target.offsetWidth / 2, target.offsetHeight / 2);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canEdit || !draggedBookId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    if (!canEdit || !draggedBookId) return;
    e.preventDefault();
    justDraggedRef.current = true;

    const draggedIndex = localBooks.findIndex(b => b.id === draggedBookId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedBookId(null);
      setDragOverIndex(null);
      justDraggedRef.current = false;
      return;
    }

    // Reorder books locally for immediate feedback
    const newBooks = [...localBooks];
    const [draggedBook] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(dropIndex, 0, draggedBook);
    setLocalBooks(newBooks);
    setDraggedBookId(null);
    setDragOverIndex(null);

    // Save new order to server
    try {
      const bookIds = newBooks.map(b => b.id);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/books`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "favorite",
          bookIds: bookIds,
        }),
      });

      if (!response.ok) {
        // Revert on error
        setLocalBooks(books);
        const error = await response.json().catch(() => ({}));
        console.error("[handleDrop] API error:", error);
        alert(error.error || "Failed to reorder books");
      } else {
        // Refresh to get latest data
        try {
          await onUpdate();
        } catch (updateError) {
          console.error("Error in onUpdate:", updateError);
        }
      }
    } catch (error) {
      // Revert on error
      setLocalBooks(books);
      console.error("Reorder error:", error);
      alert("Failed to reorder books");
    }
  };

  const handleDragEnd = () => {
    setDraggedBookId(null);
    setDragOverIndex(null);
    // Reset the flag after a short delay to prevent click after drag
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 200);
  };

  // Create array of 4 slots (books + placeholders) - only if canEdit
  const slots = React.useMemo(() => {
    if (!canEdit) {
      return localBooks; // For non-owners, just show existing books
    }
    const result: (ProfileBook | null)[] = [...localBooks];
    while (result.length < 4) {
      result.push(null); // null represents an empty slot
    }
    return result;
  }, [localBooks, canEdit]);

  // Show banner if no books and can't edit
  if (!canEdit && books.length === 0) {
    return (
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
          <p className="text-lg font-semibold text-foreground">They didn&apos;t select yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {slots.map((book, index) => {
          if (book) {
            // Both owner and non-owner can click to navigate to book page
            const isDragging = draggedBookId === book.id;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={book.id}
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, book.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative flex w-[180px] flex-shrink-0 transition-all ${isDragging ? "opacity-50 scale-95" : ""
                  } ${isDragOver ? "scale-105" : ""} ${canEdit ? "cursor-move" : ""}`}
              >
                <div onClick={() => {
                  // Prevent click if we just finished dragging
                  if (!justDraggedRef.current) {
                    handleBookClick(book);
                  }
                }}>
                  <FavoriteBookCard
                    cover={book.cover}
                    title={book.title}
                    onClick={() => { }}
                    onRemove={canEdit ? () => handleRemoveBook(book.id) : undefined}
                    isRemoving={canEdit ? isRemoving === book.id : undefined}
                  />
                </div>
                {isDragOver && canEdit && (
                  <div className="absolute inset-0 border-2 border-primary rounded-3xl pointer-events-none z-10" />
                )}
              </div>
            );
          } else {
            // Empty slot - show plus sign (only if canEdit)
            if (!canEdit) return null;
            const isDragOver = dragOverIndex === index;
            return (
              <div
                key={`empty-${index}`}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`group relative flex w-[180px] flex-shrink-0 ${isDragOver ? "scale-105" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setBookToReplace(null);
                    setIsSearchOpen(true);
                  }}
                  className="relative aspect-[2/3] w-full overflow-hidden rounded-3xl border-2 border-dashed border-border bg-muted/20 transition-colors hover:bg-muted/40 flex items-center justify-center"
                >
                  <Plus className="h-12 w-12 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
                {isDragOver && draggedBookId && (
                  <div className="absolute inset-0 border-2 border-primary rounded-3xl pointer-events-none z-10 bg-primary/10" />
                )}
              </div>
            );
          }
        })}
      </div>
      {canEdit && (
        <FavoriteBookSearchDialog
          open={isSearchOpen}
          onOpenChange={(open) => {
            setIsSearchOpen(open);
            if (!open) {
              setBookToReplace(null);
            }
          }}
          onBookSelect={(book) => handleAddBook(book, bookToReplace || undefined)}
          currentBooks={books.map(b => b.id)}
        />
      )}
    </section>
  );
}

function BookshelfSection({
  books,
  page,
  pageSize,
  onPageChange,
  isMobile = false,
}: {
  books: BookshelfBook[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isMobile?: boolean;
}) {
  const router = useRouter();
  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBooks = books.slice(startIndex, endIndex);

  type BookshelfBookWithIds = BookshelfBook & {
    isbndbId?: string;
    openLibraryId?: string;
  };
  const handleBookClick = React.useCallback((book: BookshelfBook) => {
    try {
      // Priority: isbndbId > openLibraryId > bookId (MongoDB _id) > create slug from title
      const bookWithIds = book as BookshelfBookWithIds;
      const bookId = bookWithIds.isbndbId || bookWithIds.openLibraryId || book.id;

      if (bookId) {
        // Check if it's an ISBN (10 or 13 digits)
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
          const slug = createBookSlug(book.title, bookWithIds.isbndbId, bookId);
          router.push(`/b/${slug}`);
        }
      } else {
        // Fallback to slug if no ID available
        const slug = createBookSlug(book.title);
        router.push(`/b/${slug}`);
      }
    } catch (error) {
      console.error("Error in handleBookClick:", error);
    }
  }, [router]);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No books yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Books marked as read will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      )}>
        {paginatedBooks.map((book) => (
          <div
            key={book.id}
            onClick={() => handleBookClick(book)}
            className={cn(
              "group rounded-lg border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer overflow-hidden",
              isMobile ? "flex flex-col" : "flex gap-3 p-3"
            )}
          >
            <div className={cn(
              "relative aspect-[2/3] overflow-hidden bg-muted",
              isMobile ? "w-full" : "h-20 w-14 flex-shrink-0 rounded-lg"
            )}>
              <Image
                src={book.cover}
                alt={`${book.title} cover`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes={isMobile ? "50vw" : "56px"}
                quality={100}
                unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
              />
            </div>
            {isMobile ? (
              <div className="p-2 space-y-1">
                <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                {book.rating ? (
                  <p className="text-xs text-yellow-500">
                    {"★".repeat(book.rating)}
                    {"☆".repeat(5 - book.rating)}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                {book.rating ? (
                  <p className="text-xs text-yellow-500">
                    {"★".repeat(book.rating)}
                    {"☆".repeat(5 - book.rating)}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(pageNum);
                  }}
                  isActive={page === pageNum}
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
                  if (page < totalPages) onPageChange(page + 1);
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function LikesSection({
  books,
  page,
  pageSize,
  onPageChange,
  isMobile = false,
}: {
  books: LikedBook[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isMobile?: boolean;
}) {
  const router = useRouter();
  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBooks = books.slice(startIndex, endIndex);

  const handleBookClick = React.useCallback((book: LikedBook) => {
    try {
      type LikedBookWithIds = LikedBook & {
        isbndbId?: string;
        openLibraryId?: string;
      };
      const bookWithIds = book as LikedBookWithIds;
      const bookId = bookWithIds.isbndbId || bookWithIds.openLibraryId || book.id;

      if (bookId) {
        const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
        const isOpenLibraryId = bookId.startsWith("OL") || bookId.startsWith("/works/");
        const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
        const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");

        if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
          router.push(`/b/${bookId}`);
        } else {
          const bookWithIds = book as LikedBookWithIds;
          const slug = createBookSlug(book.title, bookWithIds.isbndbId, bookId);
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

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No liked books yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Books marked as liked will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      )}>
        {paginatedBooks.map((book) => (
          <div
            key={book.id}
            onClick={() => handleBookClick(book)}
            className={cn(
              "group rounded-lg border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer overflow-hidden",
              isMobile ? "flex flex-col" : "flex gap-3 p-3"
            )}
          >
            <div className={cn(
              "relative aspect-[2/3] overflow-hidden bg-muted",
              isMobile ? "w-full" : "h-20 w-14 flex-shrink-0 rounded-lg"
            )}>
              <Image
                src={book.cover}
                alt={`${book.title} cover`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes={isMobile ? "50vw" : "56px"}
                quality={100}
                unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
              />
            </div>
            {isMobile ? (
              <div className="p-2 space-y-1">
                <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                {book.reason ? <p className="text-xs text-muted-foreground/80 line-clamp-1">{book.reason}</p> : null}
              </div>
            ) : (
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                {book.reason ? <p className="text-xs text-muted-foreground/80 line-clamp-1">{book.reason}</p> : null}
              </div>
            )}
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(pageNum);
                  }}
                  isActive={page === pageNum}
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
                  if (page < totalPages) onPageChange(page + 1);
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function TbrSection({
  books,
  page,
  pageSize,
  onPageChange,
  isMobile = false,
  username,
}: {
  books: TbrBook[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isMobile?: boolean;
  username?: string;
}) {
  const router = useRouter();
  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBooks = books.slice(startIndex, endIndex);

  // Store reading progress for each book
  const [readingProgress, setReadingProgress] = React.useState<Record<string, { pagesRead: number; totalPages: number }>>({});
  const [loadingProgress, setLoadingProgress] = React.useState<Record<string, boolean>>({});

  // Generate book IDs string for dependencies
  const bookIdsKey = paginatedBooks.map((book) => {
    const bookWithIds = book as TbrBookWithIds;
    return bookWithIds.bookId || bookWithIds.isbndbId || bookWithIds.openLibraryId || book.id;
  }).filter(Boolean).sort().join(',');

  // Fetch total pages for books (pagesRead comes from API, we just need totalPages)
  React.useEffect(() => {
    if (!username || paginatedBooks.length === 0) return;

    console.log('[DNF] 🔍 Starting fetchTotalPages', {
      username,
      bookCount: paginatedBooks.length,
      currentReadingProgress: Object.keys(readingProgress).length,
      bookIds: paginatedBooks.map(b => {
        const bookWithIds = b as TbrBookWithIds;
        return {
          id: bookWithIds.bookId || bookWithIds.isbndbId || bookWithIds.openLibraryId || b.id,
          pagesRead: bookWithIds.pagesRead || 0,
          title: b.title
        };
      })
    });

    const fetchTotalPages = async () => {
      const progressMap: Record<string, { pagesRead: number; totalPages: number }> = {};
      const loadingMap: Record<string, boolean> = {};
      let hasUpdates = false;
      let hasFetches = false;

      for (const book of paginatedBooks) {
        const bookWithIds = book as TbrBookWithIds;
        // Try bookId first (MongoDB _id), then fallback to other IDs
        const bookId = bookWithIds.bookId || bookWithIds.isbndbId || bookWithIds.openLibraryId || book.id;
        if (!bookId) {
          console.log('[DNF] ⚠️ Skipping book - no ID:', book.title);
          continue;
        }

        const pagesRead = bookWithIds.pagesRead || 0;
        
        console.log('[DNF] 📖 Processing book:', {
          bookId,
          title: book.title,
          pagesReadFromBook: pagesRead,
          existingProgress: readingProgress[bookId],
          hasTotalPages: !!readingProgress[bookId]?.totalPages
        });
        
        // Skip if no pages read or we already have progress for this book
        if (pagesRead === 0) {
          console.log('[DNF] ⏭️ Skipping book - no pages read:', book.title);
          continue;
        }

        // Only fetch totalPages if we don't have it yet
        if (!readingProgress[bookId]?.totalPages) {
          console.log('[DNF] 🔄 Fetching totalPages for:', book.title, 'bookId:', bookId);
          loadingMap[bookId] = true;
          hasFetches = true;

          try {
            // Fetch book details to get total pages - try multiple ID formats
            let totalPages = 0;
            const idToTry = bookWithIds.bookId || bookWithIds.isbndbId || bookWithIds.openLibraryId || book.id;
            if (idToTry) {
              try {
                console.log('[DNF] 📡 Fetching book details for ID:', idToTry);
                const bookResponse = await fetch(`/api/books/${encodeURIComponent(idToTry)}`);
                if (bookResponse.ok) {
                  const bookData = await bookResponse.json();
                  totalPages = bookData.volumeInfo?.pageCount || 0;
                  console.log('[DNF] ✅ Fetched totalPages:', {
                    bookId,
                    title: book.title,
                    totalPages,
                    pagesRead,
                    calculatedProgress: totalPages > 0 ? `${Math.round((pagesRead / totalPages) * 100)}%` : 'N/A'
                  });
                } else {
                  console.log('[DNF] ❌ Failed to fetch book details:', {
                    bookId: idToTry,
                    status: bookResponse.status
                  });
                }
              } catch (fetchError) {
                console.error('[DNF] ❌ Error fetching book:', idToTry, fetchError);
              }
            }

            // Update progress map with pagesRead from book data and fetched totalPages
            progressMap[bookId] = {
              pagesRead,
              totalPages,
            };
            console.log('[DNF] 📝 Adding to progressMap:', {
              bookId,
              progress: progressMap[bookId],
              calculatedPercentage: totalPages > 0 ? `${Math.round((pagesRead / totalPages) * 100)}%` : 'N/A'
            });
            hasUpdates = true;
          } catch (error) {
            console.error(`[DNF] ❌ Error fetching total pages for book ${bookId}:`, error);
          } finally {
            loadingMap[bookId] = false;
          }
        } else {
          // We have totalPages but need to update pagesRead from book data
          const existingTotalPages = readingProgress[bookId].totalPages;
          progressMap[bookId] = {
            pagesRead,
            totalPages: existingTotalPages,
          };
          console.log('[DNF] 🔄 Updating pagesRead (totalPages already exists):', {
            bookId,
            oldPagesRead: readingProgress[bookId].pagesRead,
            newPagesRead: pagesRead,
            totalPages: existingTotalPages,
            oldPercentage: existingTotalPages > 0 ? `${Math.round((readingProgress[bookId].pagesRead / existingTotalPages) * 100)}%` : 'N/A',
            newPercentage: existingTotalPages > 0 ? `${Math.round((pagesRead / existingTotalPages) * 100)}%` : 'N/A'
          });
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        console.log('[DNF] 💾 Updating readingProgress state:', {
          updates: progressMap,
          beforeUpdate: readingProgress,
          willMerge: true
        });
        setReadingProgress(prev => {
          const merged = { ...prev, ...progressMap };
          console.log('[DNF] ✅ After merge:', {
            before: Object.keys(prev).length,
            after: Object.keys(merged).length,
            mergedProgress: merged
          });
          return merged;
        });
      }

      if (hasFetches) {
        setLoadingProgress(prev => ({ ...prev, ...loadingMap }));
      }
    };

    fetchTotalPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, bookIdsKey]);

  type TbrBookWithIds = TbrBook & {
    isbndbId?: string;
    openLibraryId?: string;
    bookId?: string;
    pagesRead?: number; // Reading progress from API
  };
  const handleBookClick = React.useCallback((book: TbrBook) => {
    try {
      const bookWithIds = book as TbrBookWithIds;
      const bookId = bookWithIds.isbndbId || bookWithIds.openLibraryId || book.id;

      if (bookId) {
        const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
        const isOpenLibraryId = bookId.startsWith("OL") || bookId.startsWith("/works/");
        const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
        const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");

        if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
          router.push(`/b/${bookId}`);
        } else {
          const slug = createBookSlug(book.title, bookWithIds.isbndbId, bookId);
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

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No to-be-read books yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Books added to DNF (Did Not Finish) list will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">The procrastination wall</h2>
        <p className="text-sm text-muted-foreground">All the books waiting to be read</p>
      </div>
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      )}>
        {paginatedBooks.map((book) => {
          const bookWithIds = book as TbrBookWithIds;
          const bookId = bookWithIds.bookId?.toString() || book.id;
          // Use pagesRead from book data if available, otherwise from readingProgress state
          const bookPagesRead = bookWithIds.pagesRead || 0;
          const progress = readingProgress[bookId] || (bookPagesRead > 0 ? { pagesRead: bookPagesRead, totalPages: 0 } : null);
          const isLoading = loadingProgress[bookId];

          // Log progress calculation for debugging
          if (progress && progress.pagesRead > 0) {
            console.log('[DNF] 🎨 Rendering progress for book:', {
              bookId,
              title: book.title,
              bookPagesRead,
              progressFromState: readingProgress[bookId],
              finalProgress: progress,
              calculatedPercentage: progress.totalPages > 0 ? `${Math.round((progress.pagesRead / progress.totalPages) * 100)}%` : 'N/A (no totalPages)',
              isLoading
            });
          }

          return (
            <div
              key={book.id}
              onClick={() => handleBookClick(book)}
              className={cn(
                "group rounded-lg border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer overflow-hidden relative",
                isMobile ? "flex flex-col" : "flex gap-3 p-3 items-center"
              )}
            >
              <div className={cn(
                "relative aspect-[2/3] overflow-hidden bg-muted",
                isMobile ? "w-full" : "h-20 w-14 flex-shrink-0 rounded-lg"
              )}>
                <Image
                  src={book.cover}
                  alt={`${book.title} cover`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes={isMobile ? "50vw" : "56px"}
                  quality={100}
                  unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
                />
              </div>
              {isMobile ? (
                <div className="p-2 space-y-1 relative">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                  <p className="text-xs text-muted-foreground/80">{book.addedOn}</p>
                  {book.urgency ? (
                    <p className="text-xs font-semibold text-muted-foreground">{book.urgency}</p>
                  ) : null}
                  {/* Reading progress for mobile - show at bottom right */}
                  {progress && progress.pagesRead > 0 && progress.totalPages > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <div className="relative">
                        <ReadingProgressCompact
                          totalPages={progress.totalPages}
                          pagesRead={progress.pagesRead}
                          size={40}
                          strokeWidth={4}
                        />
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                          <div className="bg-background border border-border rounded-lg p-2 shadow-lg whitespace-nowrap">
                            <div className="text-xs font-semibold text-foreground">
                              {progress.pagesRead} {progress.totalPages > 0 ? `/ ${progress.totalPages}` : ''} pages
                            </div>
                            {progress.totalPages > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {Math.round((progress.pagesRead / progress.totalPages) * 100)}% complete
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                    <p className="text-xs text-muted-foreground/80">{book.addedOn}</p>
                    {book.urgency ? (
                      <p className="text-xs font-semibold text-muted-foreground">{book.urgency}</p>
                    ) : null}
                  </div>
                  {/* Reading progress for desktop - always visible on right */}
                  {progress && progress.pagesRead > 0 && progress.totalPages > 0 && (
                    <div className="flex-shrink-0 relative">
                      <ReadingProgressCompact
                        totalPages={progress.totalPages}
                        pagesRead={progress.pagesRead}
                        size={50}
                        strokeWidth={5}
                      />
                      {/* Hover tooltip */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 whitespace-nowrap">
                        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                          <div className="text-xs font-semibold text-foreground">
                            {progress.pagesRead} {progress.totalPages > 0 ? `/ ${progress.totalPages}` : ''} pages
                          </div>
                          {progress.totalPages > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {Math.round((progress.pagesRead / progress.totalPages) * 100)}% complete
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(pageNum);
                  }}
                  isActive={page === pageNum}
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
                  if (page < totalPages) onPageChange(page + 1);
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function AuthorsSection({
  authors,
  page,
  pageSize,
  onPageChange,
  bookshelfBooks,
  isMobile = false,
}: {
  authors: AuthorStat[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  bookshelfBooks: BookshelfBook[];
  isMobile?: boolean;
}) {
  const [selectedAuthor, setSelectedAuthor] = React.useState<AuthorStat | null>(null);
  const [isAuthorDialogOpen, setIsAuthorDialogOpen] = React.useState(false);
  const [authorBooks, setAuthorBooks] = React.useState<BookshelfBook[]>([]);

  const totalPages = Math.ceil(authors.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAuthors = authors.slice(startIndex, endIndex);

  const handleAuthorClick = React.useCallback((author: AuthorStat) => {
    try {
      if (!author || !author.name) return;

      // Filter bookshelf books by this author
      const booksByAuthor = (Array.isArray(bookshelfBooks) ? bookshelfBooks : []).filter((book) => {
        if (!book || !book.author) return false;
        const bookAuthor = book.author || "";
        return bookAuthor.toLowerCase() === author.name.toLowerCase();
      });

      setAuthorBooks(booksByAuthor);
      setSelectedAuthor(author);
      setIsAuthorDialogOpen(true);
    } catch (error) {
      console.error("Error in handleAuthorClick:", error);
    }
  }, [bookshelfBooks]);

  const router = useRouter();
  const handleBookClick = React.useCallback((book: BookshelfBook) => {
    try {
      if (!book) return;

      type AuthorBookWithIds = BookshelfBook & {
        isbndbId?: string;
        openLibraryId?: string;
      };
      const bookWithIds = book as AuthorBookWithIds;
      const bookId = bookWithIds.isbndbId || bookWithIds.openLibraryId || book?.id;

      if (bookId) {
        const isISBN = /^(\d{10}|\d{13})$/.test(String(bookId));
        const isOpenLibraryId = String(bookId).startsWith("OL") || String(bookId).startsWith("/works/");
        const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(String(bookId));
        const isValidId = /^[a-zA-Z0-9_-]+$/.test(String(bookId)) && !String(bookId).includes(" ") && !String(bookId).includes("+");

        if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
          router.push(`/b/${bookId}`);
        } else {
          const slug = createBookSlug(book?.title || "Unknown", bookWithIds.isbndbId, bookId);
          router.push(`/b/${slug}`);
        }
      } else {
        const slug = createBookSlug(book?.title || "Unknown");
        router.push(`/b/${slug}`);
      }
    } catch (error) {
      console.error("Error in handleBookClick:", error);
    }
  }, [router]);

  if (authors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No authors yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Authors from the books will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      )}>
        {paginatedAuthors.map((author) => {
          if (!author || !author.name) return null;
          const displayBooks = (author.books && Array.isArray(author.books)) ? author.books.slice(0, 3) : [];

          return (
            <div
              key={author.name}
              onClick={() => handleAuthorClick(author)}
              className="group flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
            >
              {/* 3-Book Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((index) => {
                  const book = displayBooks[index];
                  const cover = (book && book.cover) ? book.cover : null;

                  return (
                    <div
                      key={index}
                      className="relative aspect-[2/3] overflow-hidden rounded-sm bg-muted/50"
                    >
                      {cover ? (
                        <Image
                          src={cover}
                          alt={(book && book.title) ? book.title : `Book ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 33vw, 120px"
                          quality={100}
                          unoptimized={cover?.includes('isbndb.com') || cover?.includes('images.isbndb.com') || cover?.includes('covers.isbndb.com') || true}
                          onError={(e) => {
                            // Fallback to gray placeholder on image error
                            const target = e.target as HTMLImageElement;
                            if (target) {
                              target.style.display = 'none';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/50" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Author Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{author.name || "Unknown Author"}</h3>
                <p className="text-xs text-muted-foreground">
                  {author.read || 0} read • {author.tbr || 0} to-be-read
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(pageNum);
                  }}
                  isActive={page === pageNum}
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
                  if (page < totalPages) onPageChange(page + 1);
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Author Books Dialog */}
      <Dialog open={isAuthorDialogOpen} onOpenChange={setIsAuthorDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedAuthor?.name || "Author"} - Books read</DialogTitle>
          </DialogHeader>
          <div className="p-6 sm:p-8">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">{selectedAuthor?.name}</h1>
              <p className="text-lg text-muted-foreground">
                {authorBooks.length} {authorBooks.length === 1 ? "book" : "books"} read
              </p>
            </div>

            {/* Books Grid */}
            {authorBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center">
                <p className="text-xl text-muted-foreground">
                  You haven&apos;t read any books by {selectedAuthor?.name} yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {authorBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleBookClick(book)}
                    className="group relative aspect-[2/3] overflow-hidden rounded-lg cursor-pointer"
                  >
                    <Image
                      src={book.cover}
                      alt={book.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                      quality={100}
                      unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListCard({
  list,
  canEdit,
  username,
  onListDeleted,
}: {
  list: ReadingList;
  canEdit: boolean;
  username: string;
  onListDeleted?: () => void;
}) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editListName, setEditListName] = React.useState(list.title);
  const [editIsSecret, setEditIsSecret] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Check if this is a saved list (has "from @" in description)
  const isSavedList = list.description?.includes("from @") || false;

  // User can only edit if they own the list AND it's not a saved list
  const canEditList = canEdit && !isSavedList;

  const handleDeleteList = async () => {
    if (!list || !username || !list.id || isDeleting) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${list.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("List deleted successfully!");
        setIsDeleteDialogOpen(false);
        if (onListDeleted) {
          onListDeleted();
        }
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "Failed to delete list");
      }
    } catch (err) {
      console.error("Error deleting list:", err);
      toast.error("Failed to delete list");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditList = async () => {
    if (!list || !username || !list.id || !editListName.trim() || isUpdating) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editListName.trim(),
          isPublic: !editIsSecret,
        }),
      });

      if (response.ok) {
        toast.success("List updated successfully!");
        setIsEditDialogOpen(false);
        if (onListDeleted) {
          onListDeleted(); // Refresh the list
        }
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "Failed to update list");
      }
    } catch (err) {
      console.error("Error updating list:", err);
      toast.error("Failed to update list");
    } finally {
      setIsUpdating(false);
    }
  };

  // Update edit form when list changes
  React.useEffect(() => {
    setEditListName(list.title);
    // Check if list is secret based on description or other indicators
    // For now, default to false (public)
    setEditIsSecret(false);
  }, [list.title]);

  // Get first 3 books for display
  const displayBooks = list.books?.slice(0, 3) || [];
  type ListBook = {
    volumeInfo?: {
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
        medium?: string;
        large?: string;
      };
    };
    cover?: string;
  };
  const getBookCover = (book: ListBook) => {
    if (book?.volumeInfo?.imageLinks?.thumbnail) return book.volumeInfo.imageLinks.thumbnail;
    if (book?.volumeInfo?.imageLinks?.smallThumbnail) return book.volumeInfo.imageLinks.smallThumbnail;
    if (book?.volumeInfo?.imageLinks?.medium) return book.volumeInfo.imageLinks.medium;
    if (book?.volumeInfo?.imageLinks?.large) return book.volumeInfo.imageLinks.large;
    return null;
  };

  return (
    <div
      className="group flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => {
        router.push(`/u/${username}/lists/${list.id}`);
      }}
    >
      {/* 3-Book Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((index) => {
          const book = displayBooks[index];
          const cover = book ? getBookCover(book) : null;

          return (
            <div
              key={index}
              className="relative aspect-[2/3] overflow-hidden rounded-sm bg-muted/50"
            >
              {cover ? (
                <Image
                  src={cover}
                  alt={(book?.volumeInfo?.title) ? book.volumeInfo.title : `Book ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 120px"
                  quality={100}
                  unoptimized={cover?.includes('isbndb.com') || cover?.includes('images.isbndb.com') || cover?.includes('covers.isbndb.com') || true}
                  onError={(e) => {
                    // Fallback to gray placeholder on image error
                    const target = e.target as HTMLImageElement;
                    if (target && target.parentElement) {
                      target.style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-muted/50" />
              )}
            </div>
          );
        })}
      </div>

      {/* List Info */}
      <div className="flex-1 min-w-0 space-y-1 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{list.title}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {list.booksCount} {list.booksCount === 1 ? "book" : "books"} • {list.updatedAgo}
            </p>
          </div>
          {canEditList && (
            <Dropdown.Root isOpen={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <Dropdown.Trigger
                data-dropdown-trigger
                className="flex-shrink-0 rounded-lg p-1 transition hover:bg-foreground/5"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <MoreVertical className="size-4 text-muted-foreground" />
              </Dropdown.Trigger>
              <Dropdown.Popover align="start">
                <Dropdown.Menu>
                  <Dropdown.Item
                    label="Edit list name"
                    icon={Edit}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      setIsEditDialogOpen(true);
                    }}
                  />
                  <Dropdown.Separator />
                  <Dropdown.Item
                    label="Delete list"
                    icon={Trash2}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive [&_svg]:text-destructive"
                  />
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-0 sm:rounded-2xl">
          <div className="p-6">
            {/* Warning Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>

            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-semibold">Delete list?</DialogTitle>
            </DialogHeader>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              This will permanently delete <span className="font-medium text-foreground">&quot;{list?.title}&quot;</span> from your profile and remove it from anyone who saved it. This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 font-medium"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteList();
                }}
                className="flex-1 font-medium shadow-sm"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete List
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-md p-0 sm:rounded-2xl">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-2xl font-semibold">Edit list</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Update your list name and privacy settings
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 sm:mt-6 space-y-3 sm:space-y-4">
              {/* List Name Input */}
              <div className="space-y-2">
                <Label htmlFor="edit-list-name" className="text-sm font-medium">
                  List name
                </Label>
                <Input
                  id="edit-list-name"
                  placeholder="Name your list"
                  value={editListName}
                  onChange={(e) => setEditListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editListName.trim()) {
                      handleEditList();
                    }
                  }}
                  className="w-full focus-visible:border-foreground dark:focus-visible:border-white"
                  autoFocus
                />
              </div>

              {/* Make this list secret */}
              <div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 sm:p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditIsSecret(!editIsSecret);
                  }}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <Label htmlFor="edit-secret-toggle" className="text-xs sm:text-sm font-medium cursor-pointer">
                      Make this list secret
                    </Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                      Only people you share the link with can see this list
                    </p>
                  </div>
                  <Switch
                    id="edit-secret-toggle"
                    checked={editIsSecret}
                    onCheckedChange={setEditIsSecret}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditDialogOpen(false);
                  }}
                  className="flex-1 font-medium text-sm sm:text-base"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEditList();
                  }}
                  className="flex-1 font-medium shadow-sm text-sm sm:text-base"
                  disabled={isUpdating || !editListName.trim()}
                >
                  {isUpdating ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Updating...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListsCarousel({ lists, canEdit, username, onListCreated, onListDeleted, page, pageSize, onPageChange, isMobile = false }: { lists: ReadingList[]; canEdit: boolean; username: string; onListCreated?: () => void; onListDeleted?: () => void; page: number; pageSize: number; onPageChange: (page: number) => void; isMobile?: boolean }) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [listName, setListName] = React.useState("");
  const [isSecret, setIsSecret] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const resetForm = () => {
    setListName("");
    setIsSecret(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };


  const handleCreateList = async () => {
    if (!listName.trim() || !username) {
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: listName.trim(),
          description: "",
          isPublic: !isSecret,
          books: [],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create list");
      }

      const data = await response.json();
      const listId = data.list._id || data.list.id;

      // Reset form and close dialog
      resetForm();
      setIsCreateDialogOpen(false);

      // Refresh lists
      if (onListCreated) {
        onListCreated();
      }

      // Redirect to list detail page
      router.push(`/u/${username}/lists/${listId}`);
    } catch (error) {
      console.error("Failed to create list:", error);
      // TODO: Show error toast
    } finally {
      setIsCreating(false);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lists</h2>
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Your curated collections" :
              <>
                <span className="italic">{username}</span>&apos;s curated collection
              </>
            }
          </p>
        </div>
        {canEdit && (
          <>
            <InteractiveHoverButton
              text="Create list"
              showIdleAccent={false}
              invert
              className="min-w-[120px]"
              onClick={() => {
                setIsCreateDialogOpen(true);
              }}
            />
            <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 sm:rounded-2xl">
                <div className="p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl font-semibold">Create a list</DialogTitle>
                  </DialogHeader>

                  {/* List Image Placeholder */}
                  <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
                    <div className="relative w-full rounded-lg bg-muted/40 border border-border/60 overflow-hidden">
                      <div className="aspect-[4/3] flex items-center justify-center">
                        <div className="grid grid-cols-2 gap-1.5 w-full h-full p-2 sm:p-2.5">
                          <div className="bg-muted/50 rounded-sm"></div>
                          <div className="bg-muted/50 rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* List Name Input */}
                  <div className="space-y-2 mb-4 sm:mb-6">
                    <Label htmlFor="list-name" className="text-sm font-medium">
                      List name
                    </Label>
                    <Input
                      id="list-name"
                      placeholder="Name your list"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && listName.trim()) {
                          handleCreateList();
                        }
                      }}
                      className="w-full focus-visible:border-foreground dark:focus-visible:border-white"
                      autoFocus
                    />
                  </div>

                  {/* Make this list secret */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 sm:p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setIsSecret(!isSecret)}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <Label htmlFor="secret-toggle" className="text-sm font-medium cursor-pointer">
                          Make this list secret
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Only people you share the link with can see this list
                        </p>
                      </div>
                      <Switch
                        id="secret-toggle"
                        checked={isSecret}
                        onCheckedChange={setIsSecret}
                      />
                    </div>
                  </div>


                  {/* Create Button */}
                  <Button
                    onClick={handleCreateList}
                    disabled={!listName.trim() || isCreating}
                    variant={listName.trim() ? "default" : "secondary"}
                    className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </>
        )}
      </div>
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
          <p className="text-lg font-semibold text-foreground">No lists yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {canEdit ? "Create your first reading list to get started." : "This user hasn't created any lists yet."}
          </p>
        </div>
      ) : (
        <>
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
          )}>
            {lists.slice((page - 1) * pageSize, page * pageSize).map((list) => (
              <ListCard key={list.id} list={list} canEdit={canEdit} username={username} onListDeleted={onListDeleted} />
            ))}
          </div>
          {Math.ceil(lists.length / pageSize) > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) onPageChange(page - 1);
                    }}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: Math.ceil(lists.length / pageSize) }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(pageNum);
                      }}
                      isActive={page === pageNum}
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
                      if (page < Math.ceil(lists.length / pageSize)) onPageChange(page + 1);
                    }}
                    className={page === Math.ceil(lists.length / pageSize) ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
      <p className="text-lg font-semibold text-foreground">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">This tab is coming soon.</p>
    </div>
  );
}

type DiaryEntry = {
  id: string;
  bookId?: string | null;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  bookCover?: string | null;
  subject?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isLiked: boolean;
  likesCount: number;
  likes: string[];
};

function DiarySection({
  entries,
  isOwnProfile,
  username,
  onEntryClick,
  onRefresh,
  page,
  pageSize,
  onPageChange,
  isMobile = false,
}: {
  entries: DiaryEntry[];
  isOwnProfile: boolean;
  username: string;
  onEntryClick?: (entry: DiaryEntry) => void;
  onRefresh?: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isMobile?: boolean;
}) {
  const [selectedEntry, setSelectedEntry] = React.useState<DiaryEntry | null>(null);

  // Update selectedEntry when entries change (to keep it in sync)
  const selectedEntryId = selectedEntry?.id || null;
  const selectedEntryIsLiked = selectedEntry?.isLiked;
  const selectedEntryLikesCount = selectedEntry?.likesCount;

  React.useEffect(() => {
    if (selectedEntryId) {
      const updatedEntry = entries.find(e => e.id === selectedEntryId);
      if (updatedEntry &&
        (updatedEntry.isLiked !== selectedEntryIsLiked ||
          updatedEntry.likesCount !== selectedEntryLikesCount)) {
        setSelectedEntry(updatedEntry);
      }
    }
  }, [entries, selectedEntryId, selectedEntryIsLiked, selectedEntryLikesCount]);

  const totalPages = Math.ceil(entries.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEntries = entries.slice(startIndex, endIndex);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No diary entries yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {isOwnProfile
            ? "Start writing about books you've read to see your entries here."
            : "This user hasn't written any diary entries yet."}
        </p>
      </div>
    );
  }

  const handleEntryClick = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    if (onEntryClick) {
      onEntryClick(entry);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">Diary</h2>
          <p className="text-sm text-muted-foreground">Thoughts and reflections on books</p>
        </div>
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
        )}>
          {paginatedEntries.map((entry) => {
            const isLiked = entry.isLiked || false;
            const likesCount = entry.likesCount || 0;
            const hasBookCover = entry.bookCover && entry.bookCover.trim();

            return (
              <div
                key={entry.id}
                onClick={() => handleEntryClick(entry)}
                className={cn(
                  "group rounded-lg border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer overflow-hidden",
                  isMobile ? "flex flex-col" : "flex gap-3 p-3"
                )}
              >
                {/* Book Cover (if entry is about a book) */}
                {hasBookCover && (
                  <div className={cn(
                    "relative aspect-[2/3] overflow-hidden bg-muted",
                    isMobile ? "w-full" : "h-20 w-14 flex-shrink-0 rounded-lg"
                  )}>
                    <Image
                      src={entry.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
                      alt={entry.bookTitle || "Book cover"}
                      fill
                      className="object-cover"
                      sizes={isMobile ? "50vw" : "56px"}
                      quality={100}
                      unoptimized={entry.bookCover?.includes('isbndb.com') || entry.bookCover?.includes('images.isbndb.com') || entry.bookCover?.includes('covers.isbndb.com') || true}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target && target.parentElement) {
                          target.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                )}

                {/* Entry Content */}
                <div className={cn(
                  "space-y-1",
                  isMobile ? "p-2.5" : "flex-1 min-w-0"
                )}>
                  <div>
                    {entry.bookTitle ? (
                      <>
                        <h3 className={cn(
                          "font-semibold text-foreground line-clamp-2 leading-tight",
                          isMobile ? "text-xs" : "text-sm"
                        )}>{entry.bookTitle}</h3>
                        {entry.bookAuthor && (
                          <p className={cn(
                            "text-muted-foreground truncate",
                            isMobile ? "text-xs mt-0.5" : "text-xs"
                          )}>{entry.bookAuthor}</p>
                        )}
                      </>
                    ) : (
                      <h3 className={cn(
                        "font-semibold text-foreground line-clamp-2 leading-tight",
                        isMobile ? "text-xs" : "text-sm"
                      )}>
                        {(entry.subject && entry.subject.trim()) ? entry.subject : "Diary Entry"}
                      </h3>
                    )}
                    {entry.updatedAt && (
                      <p className={cn(
                        "text-muted-foreground/80 truncate",
                        isMobile ? "text-xs mt-1" : "text-xs mt-1"
                      )}>
                        {entry.updatedAt !== entry.createdAt
                          ? `Updated ${formatDiaryDate(entry.updatedAt)}`
                          : formatDiaryDate(entry.createdAt)}
                      </p>
                    )}
                  </div>
                  {!isMobile && (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 line-clamp-2 overflow-hidden text-xs"
                      dangerouslySetInnerHTML={{ __html: entry.content || "" }}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    />
                  )}
                  {likesCount > 0 && (
                    <div className={cn(
                      "flex items-center gap-1 text-muted-foreground",
                      isMobile ? "text-xs mt-1.5" : "text-xs mt-1"
                    )}>
                      <Heart className={cn(
                        isLiked ? 'fill-red-500 text-red-500' : '',
                        "h-3 w-3"
                      )} />
                      <span>{likesCount}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) onPageChange(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(pageNum);
                    }}
                    isActive={page === pageNum}
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
                    if (page < totalPages) onPageChange(page + 1);
                  }}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {selectedEntry && (
        <DiaryEntryDialog
          open={!!selectedEntry}
          onOpenChange={(open) => {
            if (!open) setSelectedEntry(null);
          }}
          entry={selectedEntry ? {
            id: selectedEntry.id,
            bookId: selectedEntry.bookId || null,
            bookTitle: selectedEntry.bookTitle || null,
            bookAuthor: selectedEntry.bookAuthor || null,
            bookCover: selectedEntry.bookCover || null,
            subject: selectedEntry.subject || null,
            content: selectedEntry.content || "",
            createdAt: selectedEntry.createdAt || "",
            updatedAt: selectedEntry.updatedAt || "",
            likes: selectedEntry.likes || [],
            isLiked: selectedEntry.isLiked || false,
            likesCount: selectedEntry.likesCount || 0,
          } : {
            id: "",
            content: "",
            createdAt: "",
            updatedAt: "",
          }}
          username={username}
          isOwnProfile={isOwnProfile}
          onLikeChange={async () => {
            // Refresh entries list view after like change
            if (onEntryClick && selectedEntry) {
              try {
                await onEntryClick(selectedEntry);
              } catch (error) {
                console.error("Error in onEntryClick callback:", error);
              }
            }
            // Also refresh the diary entries list via onRefresh if available
            if (onRefresh) {
              try {
                await onRefresh();
              } catch (error) {
                console.error("Error refreshing diary entries:", error);
              }
            }
          }}
          onDelete={async () => {
            // Refresh entries list after deletion
            setSelectedEntry(null);
            if (onRefresh) {
              await onRefresh();
            }
          }}
        />
      )}
    </>
  );
}

function CollaborationRequestCard({
  activity,
  onAccept,
  onReject,
}: {
  activity: ActivityEntry;
  onAccept: (listId: string) => void;
  onReject: (listId: string) => void;
}) {
  console.log("[CollaborationRequestCard] props:", { activity });
  return (
    <article
      key={activity.id}
      className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm"
    >
      <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-muted">
        <Image
          src={activity.cover}
          alt={activity.detail}
          fill
          className="object-cover"
          sizes="96px"
          quality={100}
          unoptimized={activity.cover?.includes('isbndb.com') || activity.cover?.includes('images.isbndb.com') || activity.cover?.includes('covers.isbndb.com') || true}
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{activity.timeAgo}</p>
          <p className="text-base font-semibold text-foreground">
            {activity.inviter} {activity.action}
          </p>
          <p className="text-sm text-muted-foreground">{activity.detail}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onAccept(activity.listId!)}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(activity.listId!)}>
            Reject
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const username = typeof params.username === "string" ? params.username : null;

  // Check if tab is specified in URL params
  const tabFromUrl = searchParams.get("tab");
  let initialTab: DockLabel = "Favourites";
  if (tabFromUrl === "Activity") {
    initialTab = "Activity" as DockLabel;
  } else if (tabFromUrl && dockLabels.includes(tabFromUrl as (typeof dockLabels)[number])) {
    initialTab = tabFromUrl as DockLabel;
  }

  const [activeTab, setActiveTab] = React.useState<DockLabel>(initialTab);
  const [activityView, setActivityView] = React.useState<ActivityView>("Friends");
  const [profileData, setProfileData] = React.useState<EditableProfile | null>(null);
  const [activeUsername, setActiveUsername] = React.useState(username || defaultProfile.username);
  const [bookshelfPage, setBookshelfPage] = React.useState(1);
  const [likesPage, setLikesPage] = React.useState(1);
  const [tbrPage, setTbrPage] = React.useState(1);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [authorsPage, setAuthorsPage] = React.useState(1);
  const [diaryPage, setDiaryPage] = React.useState(1);
  const [listsPage, setListsPage] = React.useState(1);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileSaveError, setProfileSaveError] = React.useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);
  // Store original profile data when edit form opens to restore on cancel
  const originalProfileDataRef = React.useRef<EditableProfile | null>(null);

  // Book collections from API
  const [topBooks, setTopBooks] = React.useState<ProfileBook[]>([]);
  const [favoriteBooks, setFavoriteBooks] = React.useState<ProfileBook[]>([]);
  const [bookshelfBooks, setBookshelfBooks] = React.useState<BookshelfBook[]>([]);
  const [likedBooks, setLikedBooks] = React.useState<LikedBook[]>([]);
  const [tbrBooks, setTbrBooks] = React.useState<TbrBook[]>([]);
  const [readingLists, setReadingLists] = React.useState<ReadingList[]>([]);
  const [diaryEntries, setDiaryEntries] = React.useState<DiaryEntry[]>([]);

  // Activities from API
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  type ActivityDiaryEntry = {
    id: string;
    bookId?: string;
    bookTitle?: string;
    bookAuthor?: string;
    bookCover?: string;
    content?: string;
    createdAt?: string;
    updatedAt?: string;
    isLiked?: boolean;
    likesCount?: number;
  };
  const [selectedActivityDiaryEntry, setSelectedActivityDiaryEntry] = React.useState<ActivityDiaryEntry | null>(null);

  const handleAccept = async (listId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.user?.id, action: "accept" }),
      });

      if (response.ok) {
        setActivities((prev) =>
          prev.filter(
            (activity) =>
              !(
                activity.type === "collaboration_request" &&
                activity.listId === listId
              )
          )
        );
      } else {
        console.error("Failed to accept collaboration request");
      }
    } catch (error) {
      console.error("Error accepting collaboration request:", error);
    }
  };

  const handleReject = async (listId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.user?.id, action: "reject" }),
      });

      if (response.ok) {
        setActivities((prev) =>
          prev.filter(
            (activity) =>
              !(
                activity.type === "collaboration_request" &&
                activity.listId === listId
              )
          )
        );
      } else {
        console.error("Failed to reject collaboration request");
      }
    } catch (error) {
      console.error("Error rejecting collaboration request:", error);
    }
  };

  // Function to fetch diary entries
  const fetchDiaryEntries = React.useCallback(async (username: string) => {
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/diary`);
      if (response.ok) {
        const data = await response.json();
        type DiaryEntryFromAPI = {
          _id?: { toString(): string } | string;
          id?: string;
          bookId?: { toString(): string } | string;
          bookTitle?: string;
          bookAuthor?: string;
          bookCover?: string;
          subject?: string;
          content?: string;
          createdAt?: string;
          updatedAt?: string;
          isLiked?: boolean;
          likesCount?: number;
          likes?: unknown[];
        };
        const transformedEntries: DiaryEntry[] = Array.isArray(data.entries)
          ? data.entries
            .map((entry: DiaryEntryFromAPI, idx: number) => {
              const isGeneralEntry = !entry.bookId && !entry.bookTitle;
              console.log('[DiarySection] Entry data:', {
                idx,
                id: entry._id?.toString() || entry.id,
                subject: entry.subject,
                bookTitle: entry.bookTitle,
                bookId: entry.bookId,
                isGeneralEntry,
                rawEntry: entry,
              });
              return {
                id: entry._id?.toString() || entry.id || entry.bookId?.toString() || `diary-${idx}`,
                bookId: entry.bookId?.toString() || entry.bookId,
                bookTitle: entry.bookTitle || null,
                bookAuthor: entry.bookAuthor || null,
                bookCover: entry.bookCover || null,
                subject: entry.subject || null,
                isGeneralEntry,
                content: entry.content || "",
                createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                isLiked: entry.isLiked || false,
                likesCount: entry.likesCount || 0,
                likes: entry.likes || [],
              };
            })
            .sort((a: DiaryEntry, b: DiaryEntry) => {
              // Sort by updatedAt descending (newest first)
              const aDate = a.updatedAt ? new Date(a.updatedAt) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
              const bDate = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
              return bDate.getTime() - aDate.getTime();
            })
          : [];
        setDiaryEntries(transformedEntries);
      }
    } catch (error) {
      console.error("Error fetching diary entries:", error);
    }
  }, []);

  // Refresh diary entries when Diary tab is activated
  React.useEffect(() => {
    if (activeTab === "Diary" && activeUsername) {
      fetchDiaryEntries(activeUsername);
    }
  }, [activeTab, activeUsername, fetchDiaryEntries]);

  // Social counts from API
  const [followersCount, setFollowersCount] = React.useState(0);
  const [followingCount, setFollowingCount] = React.useState(0);

  // Follow state
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [isFollowLoading, setIsFollowLoading] = React.useState(false);

  // Auth prompt state
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);

  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Update activeTab when URL params change, or handle Activity tab
  React.useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "Activity") {
      // Activity tab should always show logged-in user's activity
      // If we're not on logged-in user's profile, redirect to their profile with Activity tab
      if (isAuthenticated && session?.user?.username && activeUsername !== session.user.username) {
        // Use router.push instead of window.location.href to avoid potential issues
        try {
          router.push(`/u/${encodeURIComponent(session.user.username)}?tab=Activity`);
        } catch (error) {
          console.error("Failed to navigate to Activity tab:", error);
        }
        return;
      }
      // Set Activity as active tab (even though it's not in dockLabels, we handle it specially)
      setActiveTab("Activity" as DockLabel);
    } else if (tabFromUrl && dockLabels.includes(tabFromUrl as (typeof dockLabels)[number])) {
      setActiveTab(tabFromUrl as DockLabel);
    }
  }, [searchParams, isAuthenticated, session?.user?.username, activeUsername, router]);

  // Track which username we've loaded to prevent duplicate loads
  const loadedUsernameRef = React.useRef<string | null>(null);

  // Update activeUsername when URL params change
  React.useEffect(() => {
    if (username) {
      setActiveUsername(username);
    }
  }, [username]);

  // Load profile data
  React.useEffect(() => {
    // Wait for session to be loaded (not loading)
    if (status === "loading") {
      return; // Wait for session to load
    }

    if (!activeUsername) {
      setIsLoadingProfile(false);
      return;
    }

    // Load profile data if we haven't loaded it for this username yet
    if (loadedUsernameRef.current !== activeUsername) {
      loadedUsernameRef.current = activeUsername;
      setIsLoadingProfile(true);

      console.log(`[Profile] Loading profile for username: ${activeUsername}`);

      // Check sessionStorage for cached profile data
      const cacheKey = `profile_${activeUsername}`;
      const cachedData = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const cacheTime = parsed.timestamp || 0;
          const now = Date.now();
          // Use cache if less than 30 seconds old
          if (now - cacheTime < 30000) {
            setProfileData(parsed.data);
            setIsLoadingProfile(false);
            // Still fetch fresh data in background
          }
        } catch {
          // Invalid cache, continue with fetch
        }
      }

      // Load profile data for the requested username
      fetch(`/api/users/${encodeURIComponent(activeUsername)}`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              console.warn(`User not found: ${activeUsername}`);
              return null;
            }
            throw new Error(`Failed to fetch profile: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data?.user) {
            console.log("[Profile] Received user data:", data.user);
            console.log(`[Profile] Received user data for: ${data.user.username}`);
            console.log(`[Profile] Avatar from API:`, data.user.avatar ? `"${data.user.avatar.substring(0, 100)}..."` : 'null/undefined');
            console.log(`[Profile] Default avatar:`, DEFAULT_AVATAR ? `"${DEFAULT_AVATAR.substring(0, 50)}..."` : 'null/undefined');

            const avatarValue = data.user.avatar || DEFAULT_AVATAR;
            console.log(`[Profile] Final avatar value:`, avatarValue ? `"${avatarValue.substring(0, 100)}..."` : 'null/undefined');
            console.log(`[Profile] Avatar type:`, typeof avatarValue);
            console.log(`[Profile] Avatar length:`, avatarValue ? avatarValue.length : 0);

            const profile = {
              username: data.user.username || defaultProfile.username,
              name: data.user.name || defaultProfile.name,
              birthday: data.user.birthday ? new Date(data.user.birthday).toISOString().split("T")[0] : defaultProfile.birthday,
              email: data.user.email || defaultProfile.email,
              bio: data.user.bio || defaultProfile.bio,
              pronouns: Array.isArray(data.user.pronouns) ? data.user.pronouns : defaultProfile.pronouns,
              links: Array.isArray(data.user.links) ? data.user.links.join(", ") : (data.user.links || defaultProfile.links),
              gender: data.user.gender || defaultProfile.gender,
              isPublic: typeof data.user.isPublic === "boolean" ? data.user.isPublic : defaultProfile.isPublic,
              avatar: avatarValue,
            };
            console.log(`[Profile] Setting profile data with avatar:`, profile.avatar ? `"${profile.avatar.substring(0, 100)}..."` : 'missing');
            setProfileData(profile);

            type BookFromAPI = {
              bookId?: { toString(): string } | string;
              _id?: { toString(): string } | string;
              title?: string;
              author?: string;
              cover?: string;
              mood?: string;
              isbndbId?: string;
              openLibraryId?: string;
              finishedOn?: string | Date;
              format?: string;
              rating?: number;
              thoughts?: string;
              reason?: string;
              addedOn?: string | Date;
              urgency?: string;
              whyNow?: string;
              pagesRead?: number; // Reading progress from API
              progressUpdatedAt?: string | Date;
            };
            // Transform and set book collections from API
            // Top books (Profile tab - "Top 4 books" carousel)
            const transformedTopBooks: ProfileBook[] = Array.isArray(data.user.topBooks)
              ? data.user.topBooks.map((book: BookFromAPI, idx: number) => ({
                id: book.bookId?.toString() || book._id?.toString() || `top-${idx}`,
                title: book.title || "Unknown Title",
                author: book.author || "Unknown Author",
                cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                mood: book.mood,
              }))
              : [];
            setTopBooks(transformedTopBooks);

            // Favorite books (Profile tab - "Books that I love" carousel)
            const transformedFavoriteBooks: ProfileBook[] = Array.isArray(data.user.favoriteBooks)
              ? data.user.favoriteBooks.map((book: BookFromAPI, idx: number) => ({
                id: book.bookId?.toString() || book._id?.toString() || `fav-${idx}`,
                title: book.title || "Unknown Title",
                author: book.author || "Unknown Author",
                cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                mood: book.mood,
                // Store identifiers for navigation
                bookId: book.bookId?.toString() || book._id?.toString(),
                isbndbId: book.isbndbId,
                openLibraryId: book.openLibraryId,
              }))
              : [];
            setFavoriteBooks(transformedFavoriteBooks);

            // Clear cache to force fresh data on next load
            if (typeof window !== "undefined") {
              sessionStorage.removeItem(`profile_${activeUsername}`);
            }

            // Bookshelf books - sort by finishedOn date (newest first)
            const transformedBookshelf: BookshelfBook[] = Array.isArray(data.user.bookshelf)
              ? data.user.bookshelf
                .map((book: BookFromAPI, idx: number) => ({
                  id: book.bookId?.toString() || book._id?.toString() || `shelf-${idx}`,
                  title: book.title || "Unknown Title",
                  author: book.author || "Unknown Author",
                  cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                  mood: book.mood,
                  finishedOn: book.finishedOn ? (typeof book.finishedOn === 'string' ? book.finishedOn : new Date(book.finishedOn).toISOString()) : "",
                  format: book.format,
                  rating: book.rating,
                  thoughts: book.thoughts,
                }))
                .sort((a: BookshelfBook, b: BookshelfBook) => {
                  // Sort by finishedOn date in descending order (newest first)
                  const aDate = a.finishedOn ? new Date(a.finishedOn) : new Date(0);
                  const bDate = b.finishedOn ? new Date(b.finishedOn) : new Date(0);
                  return bDate.getTime() - aDate.getTime();
                })
              : [];
            setBookshelfBooks(transformedBookshelf);

            // Liked books
            const transformedLiked: LikedBook[] = Array.isArray(data.user.likedBooks)
              ? data.user.likedBooks.map((book: BookFromAPI, idx: number) => ({
                id: book.bookId?.toString() || book._id?.toString() || `liked-${idx}`,
                title: book.title || "Unknown Title",
                author: book.author || "Unknown Author",
                cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                mood: book.mood,
                reason: book.reason,
              }))
              : [];
            setLikedBooks(transformedLiked);

            // TBR books
            const transformedTbr: TbrBook[] = Array.isArray(data.user.tbrBooks)
              ? data.user.tbrBooks.map((book: BookFromAPI, idx: number) => ({
                  id: book.bookId?.toString() || book._id?.toString() || `tbr-${idx}`,
                  bookId: book.bookId?.toString() || book._id?.toString(),
                  isbndbId: book.isbndbId,
                  openLibraryId: book.openLibraryId,
                  title: book.title || "Unknown Title",
                  author: book.author || "Unknown Author",
                  cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                  mood: book.mood,
                  addedOn: book.addedOn
                    ? `Added ${new Date(book.addedOn).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                    : "Added",
                  urgency: book.urgency,
                  whyNow: book.whyNow,
                  pagesRead: book.pagesRead || 0, // Include reading progress from API
                }))
              : [];
            setTbrBooks(transformedTbr);

            type ReadingListFromAPI = {
              _id?: { toString(): string } | string;
              id?: string;
              title?: string;
              description?: string;
              books?: Array<{
                _id?: { toString(): string } | string;
                volumeInfo?: {
                  imageLinks?: {
                    thumbnail?: string;
                    smallThumbnail?: string;
                  };
                };
              }>;
              cover?: string;
              updatedAt?: string | Date;
              createdAt?: string | Date;
            };
            // Reading lists
            const transformedLists: ReadingList[] = Array.isArray(data.user.readingLists)
              ? data.user.readingLists.map((list: ReadingListFromAPI, idx: number) => {
                const updatedAt = list.updatedAt ? new Date(list.updatedAt) : new Date(list.createdAt || Date.now());
                const now = new Date();
                const diffMs = now.getTime() - updatedAt.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                let updatedAgo = "";
                if (diffDays === 0) updatedAgo = "Today";
                else if (diffDays === 1) updatedAgo = "1d";
                else if (diffDays < 7) updatedAgo = `${diffDays}d`;
                else if (diffDays < 30) updatedAgo = `${Math.floor(diffDays / 7)}w`;
                else if (diffDays < 365) updatedAgo = `${Math.floor(diffDays / 30)}mo`;
                else updatedAgo = `${Math.floor(diffDays / 365)}y`;

                // Get cover from first book if available, otherwise use default
                let cover = "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80";
                if (list.cover) {
                  cover = list.cover;
                } else if (Array.isArray(list.books) && list.books.length > 0) {
                  // If books are populated, get cover from first book
                  const firstBook = list.books[0];
                  if (firstBook?.volumeInfo?.imageLinks?.thumbnail) {
                    cover = firstBook.volumeInfo.imageLinks.thumbnail;
                  } else if (firstBook?.volumeInfo?.imageLinks?.smallThumbnail) {
                    cover = firstBook.volumeInfo.imageLinks.smallThumbnail;
                  }
                }

                return {
                  id: list._id?.toString() || `list-${idx}`,
                  title: list.title || "Untitled List",
                  booksCount: Array.isArray(list.books) ? list.books.length : 0,
                  updatedAgo,
                  cover,
                  description: list.description,
                  books: Array.isArray(list.books) ? list.books.slice(0, 3) : [], // Store first 3 books for display
                };
              })
              : [];
            setReadingLists(transformedLists);

            type DiaryEntryFromAPIForTransformation = {
              _id?: { toString(): string } | string;
              id?: string;
              bookId?: { toString(): string } | string;
              bookTitle?: string;
              bookAuthor?: string;
              bookCover?: string;
              subject?: string;
              content?: string;
              createdAt?: string;
              updatedAt?: string;
              isLiked?: boolean;
              likesCount?: number;
              likes?: unknown[];
            };
            type LikeId = { toString(): string } | string;
            // Diary entries
            const transformedDiaryEntries: DiaryEntry[] = Array.isArray(data.user.diaryEntries)
              ? data.user.diaryEntries.map((entry: DiaryEntryFromAPIForTransformation, idx: number) => {
                const isGeneralEntry = !entry.bookId && !entry.bookTitle;
                return {
                  id: entry._id?.toString() || `diary-${idx}`,
                  bookId: entry.bookId?.toString() || entry.bookId || null,
                  bookTitle: entry.bookTitle || null,
                  bookAuthor: entry.bookAuthor || null,
                  bookCover: entry.bookCover || null,
                  subject: entry.subject || null,
                  isGeneralEntry,
                  content: entry.content || "",
                  likes: Array.isArray(entry.likes) ? entry.likes.map((id) => {
                    const likeId = id as LikeId;
                    return typeof likeId === 'string' ? likeId : likeId.toString();
                  }) : [],
                  likesCount: Array.isArray(entry.likes) ? entry.likes.length : 0,
                  isLiked: session?.user?.id && Array.isArray(entry.likes) && entry.likes.some((id) => {
                    const likeId = id as LikeId;
                    const idStr = typeof likeId === 'string' ? likeId : likeId.toString();
                    return idStr === session.user.id;
                  }) || false,
                  createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                  updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                };
              })
              : [];
            setDiaryEntries(transformedDiaryEntries);

            // Activities
            // Determine if this is the owner's profile before mapping
            const isOwnerProfile = isAuthenticated && session?.user?.username === data.user.username;

            console.log("[Profile] Raw recentActivities:", data.user.recentActivities);

            type ActivityFromAPI = {
              _id?: { toString(): string } | string;
              type: string;
              timestamp?: string | Date;
              bookId?: { toString(): string } | string;
              bookTitle?: string;
              bookCover?: string;
              listId?: string;
              listName?: string;
              sharedBy?: { toString(): string } | string;
              sharedByUsername?: string;
              userName?: string;
              rating?: number;
              review?: string;
            };
            // Transform regular activities
            const transformedActivities: ActivityEntry[] = Array.isArray(data.user.recentActivities)
              ? data.user.recentActivities.map((activity: ActivityFromAPI, idx: number) => {
                // Format time ago
                const activityDate = activity.timestamp ? new Date(activity.timestamp) : new Date();
                const now = new Date();
                const diffMs = now.getTime() - activityDate.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                let timeAgo = "";
                if (diffMins < 1) timeAgo = "Just now";
                else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                else if (diffDays === 1) timeAgo = "Yesterday";
                else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
                else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)}w ago`;
                else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}mo ago`;
                else timeAgo = `${Math.floor(diffDays / 365)}y ago`;

                // Format action based on type
                let action = "";
                let detail = "";
                if (activity.type === "read") {
                  action = "finished";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "rated") {
                  action = `rated ${"★".repeat(activity.rating || 0)}`;
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "liked") {
                  action = "liked";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "added_to_list") {
                  action = "added to list";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "started_reading") {
                  action = "started reading";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "reviewed") {
                  action = "reviewed";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "collaboration_request") {
                  action = "invited you to collaborate on";
                  detail = activity.listName || "a list";
                }

                return {
                  id: activity._id?.toString() || `activity-${idx}`,
                  name: isOwnerProfile ? "You" : activity.userName || "User",
                  action,
                  detail,
                  timeAgo,
                  cover: activity.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                  type: activity.type,
                  listId: activity.listId,
                  listName: activity.listName,
                  inviter: activity.userName,
                };
              })
              : [];

            type DiaryEntryFromAPI = {
              _id?: { toString(): string } | string;
              id?: string;
              bookId?: { toString(): string } | string;
              bookTitle?: string;
              bookAuthor?: string;
              bookCover?: string;
              subject?: string;
              content?: string;
              createdAt?: string;
              updatedAt?: string;
              likes?: unknown[];
            };
            // Add diary entries as activities
            const diaryActivities: ActivityEntry[] = Array.isArray(data.user.diaryEntries)
              ? data.user.diaryEntries.map((entry: DiaryEntryFromAPI, idx: number) => {
                // Format time ago
                const entryDate = entry.updatedAt ? new Date(entry.updatedAt) : (entry.createdAt ? new Date(entry.createdAt) : new Date());
                const now = new Date();
                const diffMs = now.getTime() - entryDate.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                let timeAgo = "";
                if (diffMins < 1) timeAgo = "Just now";
                else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                else if (diffDays === 1) timeAgo = "Yesterday";
                else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
                else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)}w ago`;
                else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}mo ago`;
                else timeAgo = `${Math.floor(diffDays / 365)}y ago`;

                const entryId = entry._id?.toString() || entry.id || `diary-${idx}`;
                const bookId = entry.bookId?.toString() || entry.bookId;
                type LikeId = { toString(): string } | string;
                const isLiked = session?.user?.id && Array.isArray(entry.likes) && entry.likes.some((id) => {
                  const likeId = id as LikeId;
                  const idStr = typeof likeId === 'string' ? likeId : likeId.toString();
                  return idStr === session.user.id;
                });

                const isGeneralEntry = !entry.bookId && !entry.bookTitle;
                return {
                  id: `diary-activity-${entryId}`,
                  name: isOwnerProfile ? "You" : data.user.name || "User",
                  action: isGeneralEntry ? "wrote" : "wrote about",
                  detail: entry.bookTitle || (isGeneralEntry
                    ? (entry.subject && entry.subject.trim() ? entry.subject : "a diary entry")
                    : "a book"),
                  timeAgo,
                  cover: entry.bookCover || null,
                  type: "diary_entry",
                  diaryEntryId: entryId,
                  bookId: bookId,
                  bookTitle: entry.bookTitle || null,
                  bookAuthor: entry.bookAuthor || null,
                  isGeneralEntry,
                  content: entry.content || "",
                  createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                  updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                  isLiked: isLiked || false,
                  likesCount: Array.isArray(entry.likes) ? entry.likes.length : 0,
                };
              })
              : [];

            // Combine and sort all activities by time (newest first)
            const allActivities = [...transformedActivities, ...diaryActivities].sort((a, b) => {
              // Parse timeAgo to get approximate timestamp for sorting
              // This is a simple heuristic - activities with "Just now" or "m ago" come first
              const getSortValue = (timeAgo: string) => {
                if (timeAgo === "Just now") return 0;
                if (timeAgo.includes("m ago")) return parseInt(timeAgo) || 0;
                if (timeAgo.includes("h ago")) return parseInt(timeAgo) * 60 || 0;
                if (timeAgo === "Yesterday") return 1440;
                if (timeAgo.includes("d ago")) return parseInt(timeAgo) * 1440 || 0;
                if (timeAgo.includes("w ago")) return parseInt(timeAgo) * 10080 || 0;
                if (timeAgo.includes("mo ago")) return parseInt(timeAgo) * 43200 || 0;
                if (timeAgo.includes("y ago")) return parseInt(timeAgo) * 525600 || 0;
                return 999999;
              };
              return getSortValue(a.timeAgo) - getSortValue(b.timeAgo);
            });

            console.log("[Profile] Transformed and sorted activities:", allActivities);
            setActivities(allActivities);

            // Set follower/following counts
            setFollowersCount(data.user.followersCount || 0);
            setFollowingCount(data.user.followingCount || 0);

            // Cache in sessionStorage
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                  data: profile,
                  timestamp: Date.now(),
                }));
              } catch {
                // Storage quota exceeded or not available
              }
            }
          } else {
            // User not found
            console.warn("User profile not found in database");
            setProfileData(null);
            setTopBooks([]);
            setFavoriteBooks([]);
            setBookshelfBooks([]);
            setLikedBooks([]);
            setTbrBooks([]);
            setReadingLists([]);
            setDiaryEntries([]);
            setActivities([]);
          }
        })
        .catch((err) => {
          console.error("Failed to load user profile:", err);
          // Reset ref so it can retry
          loadedUsernameRef.current = null;
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    }
  }, [activeUsername, isAuthenticated, status, session?.user?.username, session?.user?.id]);

  // Extract username to a stable variable
  const currentUsername = session?.user?.username ?? null;
  const isOwnProfile = React.useMemo(() => {
    return isAuthenticated && currentUsername === activeUsername;
  }, [isAuthenticated, currentUsername, activeUsername]);

  const handleAuthPrompt = React.useCallback(() => {
    setAuthPromptOpen(true);
  }, []);

  // Check if current user is following this profile
  React.useEffect(() => {
    if (!isAuthenticated || !currentUsername || isOwnProfile || !activeUsername) {
      setIsFollowing(false);
      return;
    }

    // Fetch current user's following list to check if they follow this user
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/users/${currentUsername}`);
        if (response.ok) {
          const data = await response.json();
          if (data.user && Array.isArray(data.user.following)) {
            // Get the target user's ID from the already loaded profile data
            const targetResponse = await fetch(`/api/users/${activeUsername}`);
            if (targetResponse.ok) {
              const targetData = await targetResponse.json();
              if (targetData.user && targetData.user.id) {
                // Check if target user ID is in current user's following list
                const isCurrentlyFollowing = data.user.following.includes(targetData.user.id);
                setIsFollowing(isCurrentlyFollowing);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to check follow status:", error);
        // Ensure we don't leave state in an inconsistent state
        setIsFollowing(false);
      }
    };

    // Properly handle the async function to prevent unhandled rejections
    checkFollowStatus().catch((error) => {
      console.error("Unhandled error in checkFollowStatus:", error);
      setIsFollowing(false);
    });
  }, [isAuthenticated, currentUsername, activeUsername, isOwnProfile]);

  // Handle follow/unfollow action
  const handleFollow = React.useCallback(async () => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }

    setIsFollowLoading(true);
    try {
      const response = await fetch(`/api/users/${activeUsername}/follow`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to follow/unfollow user");
      }

      const data = await response.json();

      // Update local state
      setIsFollowing(data.isFollowing);
      setFollowersCount(data.followersCount);

      // If we're on the current user's profile, update their following count too
      if (isOwnProfile) {
        setFollowingCount(data.followingCount);
      }
    } catch (error) {
      console.error("Follow/unfollow error:", error);
    } finally {
      setIsFollowLoading(false);
    }
  }, [isAuthenticated, activeUsername, isOwnProfile]);
  const authorStats = React.useMemo<AuthorStat[]>(() => {
    const placeholderCover = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80";
    const map = new Map<string, AuthorStat>();
    const ensureEntry = (name: string, cover?: string) => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          read: 0,
          tbr: 0,
          cover: cover ?? placeholderCover,
          books: [],
        });
      } else if (cover) {
        const entry = map.get(name)!;
        if (!entry.cover || entry.cover === placeholderCover) {
          entry.cover = cover;
        }
      }
      return map.get(name)!;
    };
    try {
      bookshelfBooks.forEach((book) => {
        if (!book || !book.author) return;
        const entry = ensureEntry(book.author, book.cover);
        entry.read += 1;
        // Add book to author's books array (only from bookshelf, not TBR)
        if (!entry.books) {
          entry.books = [];
        }
        entry.books.push(book);
      });
      tbrBooks.forEach((book) => {
        if (!book || !book.author) return;
        const entry = ensureEntry(book.author, book.cover);
        entry.tbr += 1;
      });
      // Sort books for each author (by finishedOn date, newest first)
      map.forEach((entry) => {
        if (entry.books) {
          entry.books = entry.books.slice(0, 3); // Keep only first 3 books
        }
      });
    } catch (error) {
      console.error("Error calculating author stats:", error);
    }
    return Array.from(map.values()).sort((a, b) => b.read + b.tbr - (a.read + a.tbr));
  }, [bookshelfBooks, tbrBooks]);

  const handleProfileSave = React.useCallback(async () => {
    if (!profileData || !activeUsername) return;

    try {
      setIsSavingProfile(true);
      setProfileSaveError(null);

      // Avatar is now saved as Cloudinary URL (not base64), which is small enough for cookies
      type ProfileUpdatePayload = {
        username: string;
        name: string;
        bio: string;
        birthday: string | null;
        gender: string;
        pronouns: string[];
        links: string[];
        avatar: string;
      };
      const payload: ProfileUpdatePayload = {
        username: profileData.username,
        name: profileData.name,
        bio: profileData.bio,
        birthday: profileData.birthday || null,
        gender: profileData.gender,
        // Ensure pronouns is always an array, never an empty string
        pronouns: Array.isArray(profileData.pronouns)
          ? profileData.pronouns.filter((p) => p && typeof p === "string" && p.trim().length > 0)
          : [],
        links: profileData.links
          ? profileData.links
            .split(",")
            .map((link) => link.trim())
            .filter(Boolean)
          : [],
        // isPublic is always set to true on the server (all profiles are public)
        avatar: profileData.avatar || "",
      };

      const response = await fetch(`/api/users/${activeUsername}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      if (result.user) {
        setProfileData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            username: result.user.username ?? prev.username,
            name: result.user.name ?? prev.name,
            bio: result.user.bio ?? prev.bio,
            avatar: result.user.avatar ?? prev.avatar,
            birthday: result.user.birthday ?? prev.birthday,
            gender: result.user.gender ?? prev.gender,
            pronouns: Array.isArray(result.user.pronouns) ? result.user.pronouns : prev.pronouns,
            links: Array.isArray(result.user.links)
              ? result.user.links.join(", ")
              : result.user.links ?? prev.links,
            isPublic:
              typeof result.user.isPublic === "boolean" ? result.user.isPublic : prev.isPublic,
            email: result.user.email ?? prev.email ?? "",
          };
        });

        // Dispatch custom event to notify other components (like mobile dock) that avatar was updated
        if (typeof window !== "undefined" && result.user.avatar) {
          window.dispatchEvent(new CustomEvent("profileAvatarUpdated", {
            detail: { avatar: result.user.avatar, username: result.user.username || activeUsername }
          }));
        }

        if (result.user.username && result.user.username !== activeUsername) {
          setActiveUsername(result.user.username);
          // Redirect to new username URL
          window.location.href = `/u/${result.user.username}`;
        }

        // Update cache after successful save
        const cacheKey = `profile_${result.user.username || activeUsername}`;
        if (typeof window !== "undefined") {
          try {
            // Use the updated profile data from result
            const updatedProfile = {
              username: result.user.username ?? profileData.username,
              name: result.user.name ?? profileData.name,
              birthday: result.user.birthday ?? profileData.birthday,
              email: result.user.email ?? profileData.email,
              bio: result.user.bio ?? profileData.bio,
              pronouns: Array.isArray(result.user.pronouns) ? result.user.pronouns : profileData.pronouns,
              links: Array.isArray(result.user.links) ? result.user.links.join(", ") : (result.user.links ?? profileData.links),
              gender: result.user.gender ?? profileData.gender,
              isPublic: typeof result.user.isPublic === "boolean" ? result.user.isPublic : profileData.isPublic,
              avatar: result.user.avatar ?? profileData.avatar,
            };
            sessionStorage.setItem(cacheKey, JSON.stringify({
              data: updatedProfile,
              timestamp: Date.now(),
            }));
          } catch {
            // Storage quota exceeded or not available
          }
        }

        // Update original profile ref with saved data
        if (result.user) {
          const updatedProfile = {
            username: result.user.username ?? profileData.username,
            name: result.user.name ?? profileData.name,
            birthday: result.user.birthday ?? profileData.birthday,
            email: result.user.email ?? profileData.email,
            bio: result.user.bio ?? profileData.bio,
            pronouns: Array.isArray(result.user.pronouns) ? result.user.pronouns : profileData.pronouns,
            links: Array.isArray(result.user.links)
              ? result.user.links.join(", ")
              : result.user.links ?? profileData.links,
            gender: result.user.gender ?? profileData.gender,
            isPublic: typeof result.user.isPublic === "boolean" ? result.user.isPublic : profileData.isPublic,
            avatar: result.user.avatar ?? profileData.avatar,
          };
          originalProfileDataRef.current = JSON.parse(JSON.stringify(updatedProfile));
        }

        setIsEditOpen(false);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setProfileSaveError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [profileData, activeUsername]);

  const dockItems = React.useMemo(() => {
    return dockLabels.map((label) => ({
      label,
      onClick: () => setActiveTab(label),
      isActive: activeTab === label,
    }));
  }, [activeTab]);

  // Set data attribute for MobileDock to check when edit form opens/closes
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isEditOpen && isMobile) {
        document.body.setAttribute('data-edit-open', 'true');
      } else {
        document.body.removeAttribute('data-edit-open');
      }
    }
  }, [isEditOpen, isMobile]);

  // Store original profile data when edit form opens to restore on cancel
  const prevIsEditOpenRef = React.useRef(false);
  React.useEffect(() => {
    // Only store original data when form transitions from closed to open
    if (isEditOpen && !prevIsEditOpenRef.current && profileData) {
      // Deep clone the profile data to store as original
      originalProfileDataRef.current = JSON.parse(JSON.stringify(profileData));
    }
    prevIsEditOpenRef.current = isEditOpen;
  }, [isEditOpen, profileData]);

  if (isLoadingProfile || !profileData) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background">
        <AnimatedGridPattern
          numSquares={120}
          maxOpacity={0.08}
          duration={4}
          repeatDelay={0.75}
          className="text-slate-500 dark:text-slate-400"
        />
        <div className="relative z-10 flex min-h-screen flex-col">
          {isMobile ? (
            <Header minimalMobile={isMobile} />
          ) : (
            <>
              <DesktopSidebar />
              <MinimalDesktopHeader />
            </>
          )}
          <div className={cn(
            "flex flex-1 items-center justify-center px-4 pb-16 pt-20 md:pb-24 md:pt-24",
            isMobile ? "mt-16" : "mt-16 ml-16"
          )}>
            <TetrisLoading size="md" speed="fast" loadingText="Loading profile..." />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen flex-col overflow-x-hidden w-full">
        {(!isMobile || !isEditOpen) && (
          isMobile ? (
            <Header minimalMobile={isMobile} />
          ) : (
            <>
              <DesktopSidebar />
              <MinimalDesktopHeader />
            </>
          )
        )}
        <div className={cn(
          "flex-1",
          isMobile ? "mt-16" : "mt-16 ml-16"
        )}>
          <div className={cn(
            "mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8 overflow-x-hidden",
            isEditOpen && !isMobile && "backdrop-blur-md"
          )}>
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-12">
                <div className="hidden md:block">
                  <h1
                    className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
                    style={{ fontFamily: '"CoFo Glassier", sans-serif' }}
                  >
                    {isOwnProfile
                      ? "Your Library, organised"
                      : `${profileData.username}'s library`}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {isOwnProfile
                      ? "All your books, lists, and all time favourites in one place."
                      : `${profileData.username}'s books, lists, and all time favourites in one place.`}
                  </p>
                </div>
                <div className="flex justify-end w-full items-start">
                  <div className={cn(
                    "w-full max-w-lg flex-shrink-0",
                    isMobile && "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4 pl-6"
                  )}>
                    <ProfileSummary
                      profile={profileData}
                      bookshelfCount={bookshelfBooks.length}
                      followersCount={followersCount}
                      followingCount={followingCount}
                      onEdit={() => {
                        setProfileSaveError(null);
                        setIsEditOpen(true);
                      }}
                      onFollow={handleFollow}
                      authPromptOpen={authPromptOpen}
                      onAuthPromptChange={setAuthPromptOpen}
                      canEdit={isOwnProfile}
                      isFollowing={isFollowing}
                      isFollowLoading={isFollowLoading}
                      isAuthenticated={isAuthenticated}
                      onSignIn={() => setAuthPromptOpen(true)}
                    />
                  </div>
                </div>
              </div>

              {isAuthenticated ? (
                <>
                  <div className={cn(
                    "w-full",
                    isMobile && "flex items-center justify-center"
                  )}>
                    <Dock
                      items={dockItems}
                      activeLabel={activeTab}
                      className={isMobile ? "w-full" : ""}
                    />
                  </div>

                  {activeTab === "Favourites" ? (
                    <div className="space-y-10">
                      {topBooks.length > 0 && (
                        isMobile ? (
                          <div className="grid grid-cols-2 gap-4">
                            {topBooks.slice(0, 4).map((book) => (
                              <div key={book.id} className="flex flex-col gap-2">
                                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted">
                                  <Image
                                    src={book.cover}
                                    alt={book.title}
                                    fill
                                    className="object-cover"
                                    sizes="50vw"
                                    quality={100}
                                    unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
                                  />
                                </div>
                                <div>
                                  <h3 className="text-xs font-semibold text-foreground line-clamp-2">{book.title}</h3>
                                  <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <BookCarousel
                            title=""
                            subtitle=""
                            books={topBooks}
                          />
                        )
                      )}
                      <EditableFavoriteBooksCarousel
                        title={isOwnProfile ? "Books that I love" : (
                          <>
                            Books that <span className="italic">{profileData?.username || activeUsername}</span> loves
                          </>
                        )}
                        subtitle="Comfort stories and obsessions that always earn a re-read."
                        books={favoriteBooks}
                        username={activeUsername}
                        canEdit={isOwnProfile}
                        onUpdate={async () => {
                          // Reload favorite books
                          if (!activeUsername) return;
                          try {
                            const response = await fetch(`/api/users/${encodeURIComponent(activeUsername)}`);
                            if (response.ok) {
                              const data = await response.json();
                              type BookFromAPI = {
                                bookId?: { toString(): string } | string;
                                _id?: { toString(): string } | string;
                                title?: string;
                                author?: string;
                                cover?: string;
                                mood?: string;
                                isbndbId?: string;
                                openLibraryId?: string;
                              };
                              const transformedFavoriteBooks: ProfileBook[] = Array.isArray(data.user.favoriteBooks)
                                ? data.user.favoriteBooks.map((book: BookFromAPI, idx: number) => ({
                                  id: book.bookId?.toString() || book._id?.toString() || `fav-${idx}`,
                                  title: book.title || "Unknown Title",
                                  author: book.author || "Unknown Author",
                                  cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                                  mood: book.mood,
                                  // Store identifiers for navigation
                                  bookId: book.bookId?.toString() || book._id?.toString(),
                                  isbndbId: book.isbndbId,
                                  openLibraryId: book.openLibraryId,
                                }))
                                : [];
                              setFavoriteBooks(transformedFavoriteBooks);
                              // Clear cache
                              if (typeof window !== "undefined") {
                                sessionStorage.removeItem(`profile_${activeUsername}`);
                              }
                            }
                          } catch (error) {
                            console.error("Failed to reload favorite books:", error);
                          }
                        }}
                      />
                    </div>
                  ) : activeTab === "Activity" ? (
                    <div className="space-y-10">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground">Activity</h2>
                          <p className="text-sm text-muted-foreground">See what friends are tracking or revisit your own updates.</p>
                        </div>
                        <DockToggle
                          items={[
                            {
                              label: "Friends",
                              icon: Users,
                              isActive: activityView === "Friends",
                              onClick: () => {
                                setActivityView("Friends");
                                // Update last viewed timestamp to clear red dot in header
                                if (isAuthenticated && session?.user?.username) {
                                  localStorage.setItem(
                                    `activity_last_viewed_${session.user.username}`,
                                    new Date().toISOString()
                                  );
                                }
                              },
                            },
                            {
                              label: "Me",
                              icon: UserRound,
                              isActive: activityView === "Me",
                              onClick: () => setActivityView("Me"),
                            },
                          ]}
                        />
                      </div>
                      {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
                          <p className="text-lg font-semibold text-foreground">No activity yet</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {activityView === "Me"
                              ? "Your reading activity will appear here once you start tracking books."
                              : "No friend activity to show yet."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                          {activities
                            .filter((entry) => {
                              // Filter based on activityView
                              if (activityView === "Me") {
                                return entry.name === "You";
                              } else {
                                // in "Friends" view, show collaboration requests for the current user
                                if (entry.type === "collaboration_request") {
                                  return true;
                                }
                                return entry.name !== "You";
                              }
                            })
                            .map((entry) => {
                              console.log("[Activity Tab] Rendering activity:", entry);
                              if (entry.type === "collaboration_request") {
                                return (
                                  <CollaborationRequestCard
                                    key={entry.id}
                                    activity={entry}
                                    onAccept={handleAccept}
                                    onReject={handleReject}
                                  />
                                );
                              }
                              return (
                                <article
                                  key={entry.id}
                                  onClick={() => {
                                    // If it's a diary entry, open the diary entry dialog
                                    if (entry.type === "diary_entry" && entry.diaryEntryId) {
                                      setSelectedActivityDiaryEntry({
                                        id: entry.diaryEntryId,
                                        bookId: entry.bookId,
                                        bookTitle: entry.bookTitle,
                                        bookAuthor: entry.bookAuthor,
                                        bookCover: entry.cover,
                                        content: entry.content,
                                        createdAt: entry.createdAt,
                                        updatedAt: entry.updatedAt,
                                        isLiked: entry.isLiked,
                                        likesCount: entry.likesCount,
                                      });
                                    }
                                  }}
                                  className={`flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1 ${entry.type === "diary_entry" ? "cursor-pointer" : ""
                                    }`}
                                >
                                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-muted">
                                    <Image
                                      src={entry.cover}
                                      alt={entry.detail}
                                      fill
                                      className="object-cover"
                                      sizes="96px"
                                      quality={100}
                                      unoptimized={entry.cover?.includes('isbndb.com') || entry.cover?.includes('images.isbndb.com') || entry.cover?.includes('covers.isbndb.com') || true}
                                    />
                                  </div>
                                  <div className="flex flex-1 flex-col justify-between">
                                    <div>
                                      <p className="text-sm text-muted-foreground">{entry.timeAgo}</p>
                                      <p className="text-base font-semibold text-foreground">
                                        {entry.name} {entry.action}
                                      </p>
                                      <p className="text-sm text-muted-foreground">{entry.detail}</p>
                                    </div>
                                    {entry.type === "diary_entry" ? (
                                      <button className="text-sm font-semibold text-primary transition hover:text-primary/80">
                                        View diary entry
                                      </button>
                                    ) : (
                                      <button className="text-sm font-semibold text-primary transition hover:text-primary/80">
                                        View details
                                      </button>
                                    )}
                                  </div>
                                </article>
                              )
                            })
                          }
                        </div>
                      )}

                      {/* Diary Entry Dialog for Activity */}
                      {selectedActivityDiaryEntry && (
                        <DiaryEntryDialog
                          open={!!selectedActivityDiaryEntry}
                          onOpenChange={(open) => {
                            if (!open) setSelectedActivityDiaryEntry(null);
                          }}
                          entry={selectedActivityDiaryEntry ? {
                            id: selectedActivityDiaryEntry.id,
                            bookId: selectedActivityDiaryEntry.bookId || null,
                            bookTitle: selectedActivityDiaryEntry.bookTitle || null,
                            bookAuthor: selectedActivityDiaryEntry.bookAuthor || null,
                            bookCover: selectedActivityDiaryEntry.bookCover || null,
                            subject: null,
                            content: selectedActivityDiaryEntry.content || "",
                            createdAt: selectedActivityDiaryEntry.createdAt || "",
                            updatedAt: selectedActivityDiaryEntry.updatedAt || "",
                            likes: [],
                            isLiked: selectedActivityDiaryEntry.isLiked || false,
                            likesCount: selectedActivityDiaryEntry.likesCount || 0,
                          } : {
                            id: "",
                            content: "",
                            createdAt: "",
                            updatedAt: "",
                            likes: [],
                            isLiked: false,
                            likesCount: 0,
                          }}
                          username={activeUsername}
                          isOwnProfile={isOwnProfile}
                          onLikeChange={async () => {
                            // Refresh activities after like change
                            if (activeUsername) {
                              try {
                                const response = await fetch(`/api/users/${encodeURIComponent(activeUsername)}`);
                                if (!response.ok) {
                                  console.error("Failed to refresh activities after like change");
                                  return;
                                }
                                const data = await response.json();
                                // Re-transform activities (similar to the main fetch logic)
                                const isOwnerProfile = isAuthenticated && session?.user?.username === data.user.username;

                                type ActivityFromAPI = {
                                  _id?: { toString(): string } | string;
                                  type: string;
                                  timestamp?: string | Date;
                                  bookId?: { toString(): string } | string;
                                  bookTitle?: string;
                                  bookCover?: string;
                                  listId?: string;
                                  listName?: string;
                                  sharedBy?: { toString(): string } | string;
                                  sharedByUsername?: string;
                                  userName?: string;
                                  rating?: number;
                                  review?: string;
                                };
                                const transformedActivities: ActivityEntry[] = Array.isArray(data.user.recentActivities)
                                  ? data.user.recentActivities.map((activity: ActivityFromAPI, idx: number) => {
                                    const activityDate = activity.timestamp ? new Date(activity.timestamp) : new Date();
                                    const now = new Date();
                                    const diffMs = now.getTime() - activityDate.getTime();
                                    const diffMins = Math.floor(diffMs / (1000 * 60));
                                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                                    let timeAgo = "";
                                    if (diffMins < 1) timeAgo = "Just now";
                                    else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                                    else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                                    else if (diffDays === 1) timeAgo = "Yesterday";
                                    else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
                                    else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)}w ago`;
                                    else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}mo ago`;
                                    else timeAgo = `${Math.floor(diffDays / 365)}y ago`;

                                    let action = "";
                                    let detail = "";
                                    if (activity.type === "read") {
                                      action = "finished";
                                      detail = activity.bookTitle || "a book";
                                    } else if (activity.type === "rated") {
                                      action = `rated ${"★".repeat(activity.rating || 0)}`;
                                      detail = activity.bookTitle || "a book";
                                    } else if (activity.type === "liked") {
                                      action = "liked";
                                      detail = activity.bookTitle || "a book";
                                    } else if (activity.type === "added_to_list") {
                                      action = "added to list";
                                      detail = activity.bookTitle || "a book";
                                    } else if (activity.type === "started_reading") {
                                      action = "started reading";
                                      detail = activity.bookTitle || "a book";
                                    } else if (activity.type === "reviewed") {
                                      action = "reviewed";
                                      detail = activity.bookTitle || "a book";
                                    }

                                    return {
                                      id: activity._id?.toString() || `activity-${idx}`,
                                      name: isOwnerProfile ? "You" : data.user.name || "User",
                                      action,
                                      detail,
                                      timeAgo,
                                      cover: activity.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                                      type: activity.type,
                                    };
                                  })
                                  : [];

                                type DiaryEntryFromAPI = {
                                  _id?: { toString(): string } | string;
                                  id?: string;
                                  bookId?: { toString(): string } | string;
                                  bookTitle?: string;
                                  bookAuthor?: string;
                                  bookCover?: string;
                                  subject?: string;
                                  content?: string;
                                  createdAt?: string;
                                  updatedAt?: string;
                                  likes?: unknown[];
                                };
                                const diaryActivities: ActivityEntry[] = Array.isArray(data.user.diaryEntries)
                                  ? data.user.diaryEntries.map((entry: DiaryEntryFromAPI, idx: number) => {
                                    const entryDate = entry.updatedAt ? new Date(entry.updatedAt) : (entry.createdAt ? new Date(entry.createdAt) : new Date());
                                    const now = new Date();
                                    const diffMs = now.getTime() - entryDate.getTime();
                                    const diffMins = Math.floor(diffMs / (1000 * 60));
                                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                                    let timeAgo = "";
                                    if (diffMins < 1) timeAgo = "Just now";
                                    else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                                    else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                                    else if (diffDays === 1) timeAgo = "Yesterday";
                                    else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
                                    else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)}w ago`;
                                    else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}mo ago`;
                                    else timeAgo = `${Math.floor(diffDays / 365)}y ago`;

                                    const entryId = entry._id?.toString() || entry.id || `diary-${idx}`;
                                    const bookId = entry.bookId?.toString() || entry.bookId;
                                    type LikeId = { toString(): string } | string;
                                    const isLiked = session?.user?.id && Array.isArray(entry.likes) && entry.likes.some((id) => {
                                      const likeId = id as LikeId;
                                      const idStr = typeof likeId === 'string' ? likeId : likeId.toString();
                                      return idStr === session.user.id;
                                    });
                                    const isGeneralEntry = !entry.bookId && !entry.bookTitle;

                                    return {
                                      id: `diary-activity-${entryId}`,
                                      name: isOwnerProfile ? "You" : data.user.name || "User",
                                      action: isGeneralEntry ? "wrote" : "wrote about",
                                      detail: entry.bookTitle || (isGeneralEntry ? "a diary entry" : "a book"),
                                      timeAgo,
                                      cover: entry.bookCover || null,
                                      type: "diary_entry",
                                      diaryEntryId: entryId,
                                      bookId: bookId,
                                      bookTitle: entry.bookTitle || null,
                                      bookAuthor: entry.bookAuthor || null,
                                      isGeneralEntry,
                                      content: entry.content || "",
                                      createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                                      updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
                                      isLiked: isLiked || false,
                                      likesCount: Array.isArray(entry.likes) ? entry.likes.length : 0,
                                    };
                                  })
                                  : [];

                                const allActivities = [...transformedActivities, ...diaryActivities].sort((a, b) => {
                                  const getSortValue = (timeAgo: string) => {
                                    if (timeAgo === "Just now") return 0;
                                    if (timeAgo.includes("m ago")) return parseInt(timeAgo) || 0;
                                    if (timeAgo.includes("h ago")) return parseInt(timeAgo) * 60 || 0;
                                    if (timeAgo === "Yesterday") return 1440;
                                    if (timeAgo.includes("d ago")) return parseInt(timeAgo) * 1440 || 0;
                                    if (timeAgo.includes("w ago")) return parseInt(timeAgo) * 10080 || 0;
                                    if (timeAgo.includes("mo ago")) return parseInt(timeAgo) * 43200 || 0;
                                    if (timeAgo.includes("y ago")) return parseInt(timeAgo) * 525600 || 0;
                                    return 999999;
                                  };
                                  return getSortValue(a.timeAgo) - getSortValue(b.timeAgo);
                                });

                                setActivities(allActivities);

                                // Update selected entry
                                const updatedEntry = allActivities.find(a => a.diaryEntryId === selectedActivityDiaryEntry.id);
                                if (updatedEntry && updatedEntry.type === "diary_entry") {
                                  setSelectedActivityDiaryEntry({
                                    id: updatedEntry.diaryEntryId!,
                                    bookId: updatedEntry.bookId,
                                    bookTitle: updatedEntry.bookTitle,
                                    bookAuthor: updatedEntry.bookAuthor,
                                    bookCover: updatedEntry.cover,
                                    content: updatedEntry.content,
                                    createdAt: updatedEntry.createdAt,
                                    updatedAt: updatedEntry.updatedAt,
                                    isLiked: updatedEntry.isLiked,
                                    likesCount: updatedEntry.likesCount,
                                  });
                                }
                              } catch (error) {
                                console.error("Error refreshing activities:", error);
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  ) : activeTab === "Authors" ? (
                    <AuthorsSection authors={authorStats} page={authorsPage} pageSize={isMobile ? 8 : AUTHORS_PAGE_SIZE} onPageChange={setAuthorsPage} bookshelfBooks={bookshelfBooks} isMobile={isMobile} />
                  ) : activeTab === "Bookshelf" ? (
                    <BookshelfSection
                      books={bookshelfBooks}
                      page={bookshelfPage}
                      pageSize={isMobile ? 8 : BOOKSHELF_PAGE_SIZE}
                      onPageChange={setBookshelfPage}
                      isMobile={isMobile}
                    />
                  ) : activeTab === "Likes" ? (
                    <LikesSection books={likedBooks} page={likesPage} pageSize={isMobile ? 8 : LIKES_PAGE_SIZE} onPageChange={setLikesPage} isMobile={isMobile} />
                  ) : activeTab === "Lists" ? (
                    <ListsCarousel
                      lists={readingLists}
                      canEdit={isOwnProfile}
                      username={activeUsername}
                      page={listsPage}
                      pageSize={isMobile ? 8 : LISTS_PAGE_SIZE}
                      onPageChange={setListsPage}
                      isMobile={isMobile}
                      onListCreated={async () => {
                        // Refresh lists after creation
                        try {
                          const response = await fetch(`/api/users/${encodeURIComponent(activeUsername)}/lists`);
                          if (response.ok) {
                            const data = await response.json();
                            type ListBookInList = {
                              volumeInfo?: {
                                imageLinks?: {
                                  thumbnail?: string;
                                  smallThumbnail?: string;
                                };
                              };
                            };
                            type ListFromAPI = {
                              _id?: { toString(): string } | string;
                              id?: string;
                              title?: string;
                              description?: string;
                              books?: ListBookInList[];
                              booksCount?: number;
                              updatedAt?: string | Date;
                              createdAt?: string | Date;
                            };
                            const transformedLists: ReadingList[] = Array.isArray(data.lists)
                              ? data.lists.map((list: ListFromAPI, idx: number) => {
                                const updatedAt = list.updatedAt ? new Date(list.updatedAt) : new Date(list.createdAt || Date.now());
                                const now = new Date();
                                const diffMs = now.getTime() - updatedAt.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                let updatedAgo = "";
                                if (diffDays === 0) updatedAgo = "Today";
                                else if (diffDays === 1) updatedAgo = "1d";
                                else if (diffDays < 7) updatedAgo = `${diffDays}d`;
                                else if (diffDays < 30) updatedAgo = `${Math.floor(diffDays / 7)}w`;
                                else if (diffDays < 365) updatedAgo = `${Math.floor(diffDays / 30)}mo`;
                                else updatedAgo = `${Math.floor(diffDays / 365)}y`;

                                // Get cover from first book if available
                                let cover = "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80";
                                if (Array.isArray(list.books) && list.books.length > 0) {
                                  const firstBook = list.books[0];
                                  if (firstBook?.volumeInfo?.imageLinks?.thumbnail) {
                                    cover = firstBook.volumeInfo.imageLinks.thumbnail;
                                  } else if (firstBook?.volumeInfo?.imageLinks?.smallThumbnail) {
                                    cover = firstBook.volumeInfo.imageLinks.smallThumbnail;
                                  }
                                }

                                return {
                                  id: list.id || list._id?.toString() || `list-${idx}`,
                                  title: list.title || "Untitled List",
                                  booksCount: (list.booksCount ?? 0) || (Array.isArray(list.books) ? list.books.length : 0),
                                  updatedAgo,
                                  cover,
                                  description: list.description,
                                  books: Array.isArray(list.books) ? list.books.slice(0, 3) : [], // Store first 3 books for display
                                };
                              })
                              : [];
                            setReadingLists(transformedLists);
                          }
                        } catch (error) {
                          console.error("Failed to refresh lists:", error);
                        }
                      }}
                      onListDeleted={async () => {
                        // Refresh lists after deletion
                        try {
                          const response = await fetch(`/api/users/${encodeURIComponent(activeUsername)}/lists`);
                          if (response.ok) {
                            const data = await response.json();
                            type ListBookInList = {
                              volumeInfo?: {
                                imageLinks?: {
                                  thumbnail?: string;
                                  smallThumbnail?: string;
                                };
                              };
                            };
                            type ListFromAPI = {
                              _id?: { toString(): string } | string;
                              id?: string;
                              title?: string;
                              description?: string;
                              books?: ListBookInList[];
                              booksCount?: number;
                              updatedAt?: string | Date;
                              createdAt?: string | Date;
                            };
                            const transformedLists: ReadingList[] = Array.isArray(data.lists)
                              ? data.lists.map((list: ListFromAPI, idx: number) => {
                                const updatedAt = list.updatedAt ? new Date(list.updatedAt) : new Date(list.createdAt || Date.now());
                                const now = new Date();
                                const diffMs = now.getTime() - updatedAt.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                let updatedAgo = "";
                                if (diffDays === 0) updatedAgo = "Today";
                                else if (diffDays === 1) updatedAgo = "1d";
                                else if (diffDays < 7) updatedAgo = `${diffDays}d`;
                                else if (diffDays < 30) updatedAgo = `${Math.floor(diffDays / 7)}w`;
                                else if (diffDays < 365) updatedAgo = `${Math.floor(diffDays / 30)}mo`;
                                else updatedAgo = `${Math.floor(diffDays / 365)}y`;

                                // Get cover from first book if available
                                let cover = "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80";
                                if (Array.isArray(list.books) && list.books.length > 0) {
                                  const firstBook = list.books[0];
                                  if (firstBook?.volumeInfo?.imageLinks?.thumbnail) {
                                    cover = firstBook.volumeInfo.imageLinks.thumbnail;
                                  } else if (firstBook?.volumeInfo?.imageLinks?.smallThumbnail) {
                                    cover = firstBook.volumeInfo.imageLinks.smallThumbnail;
                                  }
                                }

                                return {
                                  id: list.id || list._id?.toString() || `list-${idx}`,
                                  title: list.title || "Untitled List",
                                  booksCount: (list.booksCount ?? 0) || (Array.isArray(list.books) ? list.books.length : 0),
                                  updatedAgo,
                                  cover,
                                  description: list.description,
                                  books: Array.isArray(list.books) ? list.books.slice(0, 3) : [], // Store first 3 books for display
                                };
                              })
                              : [];
                            setReadingLists(transformedLists);
                          }
                        } catch (error) {
                          console.error("Failed to refresh lists:", error);
                        }
                      }}
                    />
                  ) : activeTab === "DNF" ? (
                    <TbrSection books={tbrBooks} page={tbrPage} pageSize={isMobile ? 8 : TBR_PAGE_SIZE} onPageChange={setTbrPage} isMobile={isMobile} username={activeUsername} />
                  ) : activeTab === "Diary" ? (
                    <DiarySection
                      entries={diaryEntries}
                      isOwnProfile={isOwnProfile}
                      username={activeUsername}
                      page={diaryPage}
                      pageSize={isMobile ? 8 : DIARY_PAGE_SIZE}
                      onPageChange={setDiaryPage}
                      isMobile={isMobile}
                      onEntryClick={() => {
                        // Refresh diary entries after interaction
                        if (activeUsername) {
                          fetchDiaryEntries(activeUsername);
                        }
                      }}
                      onRefresh={async () => {
                        // Refresh diary entries after deletion
                        if (activeUsername) {
                          await fetchDiaryEntries(activeUsername);
                        }
                      }}
                    />
                  ) : (
                    <TabPlaceholder label={activeTab} />
                  )}
                </>
              ) : (
                <>
                  <Dock items={dockItems} activeLabel={activeTab} />
                  <AuthRequiredBanner onSignIn={handleAuthPrompt} />
                </>
              )}
            </div>
          </div>
        </div>

        <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-[50vw]">
            <SheetHeader>
              <SheetTitle>Edit Profile</SheetTitle>
            </SheetHeader>
            <EditProfileForm
              profile={profileData || defaultProfile}
              onProfileChange={setProfileData}
              onSubmitProfile={handleProfileSave}
              onCancel={() => {
                // Restore original profile data on cancel
                if (originalProfileDataRef.current) {
                  setProfileData(originalProfileDataRef.current);
                }
                setIsEditOpen(false);
              }}
              isSubmitting={isSavingProfile}
              submitError={profileSaveError}
            />
          </SheetContent>
        </Sheet>
      </div>
    </main>
  );
}

