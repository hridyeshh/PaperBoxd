"use client";

import Image from "next/image";
import * as React from "react";
import { UserRound, Users } from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

import { signIn, useSession } from "next-auth/react";
import { Dock, DockToggle } from "@/components/ui/dock";
import { InteractiveHoverButton } from "@/components/ui/buttons";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Header } from "@/components/ui/layout/header-with-search";
import { Dropdown } from "@/components/ui/dropdown";
import { EditProfileForm, defaultProfile, type EditableProfile } from "@/components/ui/forms/edit-profile-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Image as ImageIcon, MoreVertical, Trash2 } from "lucide-react";
import TetrisLoading from "@/components/ui/tetris-loader";
import {
  type BookshelfBook,
  type LikedBook,
  type TbrBook,
  type ReadingList,
  type ProfileBook,
} from "@/lib/mock/profileBooks";

const dockLabels = ["Profile", "Bookshelf", "Authors", "Lists", "'to-be-read'", "Likes"] as const;
type DockLabel = (typeof dockLabels)[number] | "Activity";
type ActivityView = "Friends" | "Me";
const BOOKSHELF_PAGE_SIZE = 12;
const LIKES_PAGE_SIZE = 12;
const TBR_PAGE_SIZE = 12;
const AUTHORS_PAGE_SIZE = 12;

type ActivityEntry = {
  id: string;
  name: string;
  action: string;
  detail: string;
  timeAgo: string;
  cover: string;
};


type AuthorStat = {
  name: string;
  read: number;
  tbr: number;
  cover: string;
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
    router.push("/auth");
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
  onSignIn,
}: {
  type: "followers" | "following";
  username: string;
  count: number;
  isAuthenticated: boolean;
  onSignIn: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [authPromptOpen, setAuthPromptOpen] = React.useState(false);
  const [users, setUsers] = React.useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Gray placeholder avatar as SVG data URI
  const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Cpath d='M50 30c-8.284 0-15 6.716-15 15 0 5.989 3.501 11.148 8.535 13.526C37.514 62.951 32 70.16 32 78.5h36c0-8.34-5.514-15.549-13.535-19.974C59.499 56.148 63 50.989 63 45c0-8.284-6.716-15-15-15z' fill='white' opacity='0.8'/%3E%3C/svg%3E";

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
                        router.push(`/u/${encodeURIComponent(user.username)}`);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image
                          src={user.avatar || defaultAvatar}
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
  onSignIn,
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
  // Gray placeholder avatar as SVG data URI
  const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Cpath d='M50 30c-8.284 0-15 6.716-15 15 0 5.989 3.501 11.148 8.535 13.526C37.514 62.951 32 70.16 32 78.5h36c0-8.34-5.514-15.549-13.535-19.974C59.499 56.148 63 50.989 63 45c0-8.284-6.716-15-15-15z' fill='white' opacity='0.8'/%3E%3C/svg%3E";
  
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
        <div className="relative h-28 w-28 flex-shrink-0">
          {(() => {
            const avatarSrc = profile.avatar || defaultAvatar;
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
              onSignIn={onSignIn}
            />
            <FollowersFollowingDialog
              type="following"
              username={profile.username}
              count={followingCount}
              isAuthenticated={isAuthenticated}
              onSignIn={onSignIn}
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
            ) : (
              <p className="text-sm text-muted-foreground">Add a bio to share your vibe.</p>
            )}
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
          You can preview the basics, but you'll need to log in to browse bookshelves, activity, and lists.
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
      <div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {books.map((book) => (
          <BookCard key={book.id} {...book} />
        ))}
      </div>
    </section>
  );
}

function BookshelfSection({
  books,
  page,
  pageSize,
  onPageChange,
}: {
  books: BookshelfBook[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBooks = books.slice(startIndex, endIndex);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No books yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Books you've marked as read will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {paginatedBooks.map((book) => (
          <div key={book.id} className="group flex gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
            <div className="relative aspect-[2/3] h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm">
              <Image
                src={book.cover}
                alt={`${book.title} cover`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="56px"
                quality={100}
                unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
              />
            </div>
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
}: {
  books: LikedBook[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBooks = books.slice(startIndex, endIndex);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No liked books yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Books you've marked as liked will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedBooks.map((book) => (
          <div key={book.id} className="group flex flex-col gap-3">
            <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-muted shadow-sm">
              <Image
                src={book.cover}
                alt={`${book.title} cover`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                quality={100}
                unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{book.title}</h3>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              {book.reason ? <p className="mt-1 text-xs text-muted-foreground/80">{book.reason}</p> : null}
            </div>
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
}: {
  books: TbrBook[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBooks = books.slice(startIndex, endIndex);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No to-be-read books yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Books you've added to your TBR list will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">The procrastination wall</h2>
        <p className="text-sm text-muted-foreground">All the books waiting to be read</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedBooks.map((book) => (
          <div key={book.id} className="group flex flex-col gap-3">
            <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-muted shadow-sm">
              <Image
                src={book.cover}
                alt={`${book.title} cover`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                quality={100}
                unoptimized={book.cover?.includes('isbndb.com') || book.cover?.includes('images.isbndb.com') || book.cover?.includes('covers.isbndb.com') || true}
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{book.title}</h3>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              <p className="text-xs text-muted-foreground/80">{book.addedOn}</p>
              {book.urgency ? (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{book.urgency}</p>
              ) : null}
            </div>
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

function AuthorsSection({
  authors,
  page,
  pageSize,
  onPageChange,
}: {
  authors: AuthorStat[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(authors.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAuthors = authors.slice(startIndex, endIndex);

  if (authors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No authors yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Authors from your books will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedAuthors.map((author) => (
          <div key={author.name} className="group flex flex-col gap-3">
            <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-muted shadow-sm">
              <Image
                src={author.cover}
                alt={`${author.name} profile`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                quality={100}
                unoptimized={author.cover?.includes('isbndb.com') || author.cover?.includes('images.isbndb.com') || author.cover?.includes('covers.isbndb.com') || true}
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{author.name}</h3>
              <p className="text-sm text-muted-foreground">
                {author.read} read • {author.tbr} to-be-read
              </p>
            </div>
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

function ListCard({
  list,
  canEdit,
}: {
  list: ReadingList;
  canEdit: boolean;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <div className="group relative flex w-[200px] flex-shrink-0 flex-col gap-3">
      <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-muted shadow-sm">
        <Image
          src={list.cover}
          alt={`${list.title} cover`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="200px"
          quality={100}
          unoptimized={list.cover?.includes('isbndb.com') || list.cover?.includes('images.isbndb.com') || list.cover?.includes('covers.isbndb.com') || true}
        />
      </div>
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">{list.title}</h3>
            <p className="text-sm text-muted-foreground">
              {list.booksCount} {list.booksCount === 1 ? "book" : "books"} • {list.updatedAgo}
            </p>
          </div>
          {canEdit && (
            <Dropdown.Root isOpen={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <Dropdown.Trigger
                className="flex-shrink-0 rounded-lg p-1 transition hover:bg-foreground/5"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <MoreVertical className="size-4 text-muted-foreground" />
              </Dropdown.Trigger>
              <Dropdown.Popover>
                <Dropdown.Menu>
                  <Dropdown.Item
                    label="Edit list name"
                    icon={Edit}
                    onClick={() => {
                      // TODO: Implement edit list name
                      setIsDropdownOpen(false);
                    }}
                  />
                  <Dropdown.Item
                    label="Change cover"
                    icon={ImageIcon}
                    onClick={() => {
                      // TODO: Implement change cover
                      setIsDropdownOpen(false);
                    }}
                  />
                  <Dropdown.Item
                    label="Delete list"
                    icon={Trash2}
                    onClick={() => {
                      // TODO: Implement delete list
                      setIsDropdownOpen(false);
                    }}
                  />
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>
          )}
        </div>
      </div>
    </div>
  );
}

function ListsCarousel({ lists, canEdit }: { lists: ReadingList[]; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lists</h2>
          <p className="text-sm text-muted-foreground">Your curated collections</p>
        </div>
        {canEdit && (
          <InteractiveHoverButton
            text="Create list"
            showIdleAccent={false}
            invert
            className="min-w-[120px]"
            onClick={() => {
              // TODO: Implement create list
            }}
          />
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
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} canEdit={canEdit} />
          ))}
        </div>
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

export default function UserProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const username = typeof params.username === "string" ? params.username : null;
  
  // Check if tab is specified in URL params
  const tabFromUrl = searchParams.get("tab");
  let initialTab: DockLabel = "Profile";
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
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileSaveError, setProfileSaveError] = React.useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);
  const [originalAvatar, setOriginalAvatar] = React.useState<string>("");
  
  // Book collections from API
  const [topBooks, setTopBooks] = React.useState<ProfileBook[]>([]);
  const [favoriteBooks, setFavoriteBooks] = React.useState<ProfileBook[]>([]);
  const [bookshelfBooks, setBookshelfBooks] = React.useState<BookshelfBook[]>([]);
  const [likedBooks, setLikedBooks] = React.useState<LikedBook[]>([]);
  const [tbrBooks, setTbrBooks] = React.useState<TbrBook[]>([]);
  const [readingLists, setReadingLists] = React.useState<ReadingList[]>([]);
  
  // Activities from API
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  
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
        window.location.href = `/u/${encodeURIComponent(session.user.username)}?tab=Activity`;
        return;
      }
      // Set Activity as active tab (even though it's not in dockLabels, we handle it specially)
      setActiveTab("Activity" as DockLabel);
    } else if (tabFromUrl && dockLabels.includes(tabFromUrl as (typeof dockLabels)[number])) {
      setActiveTab(tabFromUrl as DockLabel);
    }
  }, [searchParams, isAuthenticated, session?.user?.username, activeUsername]);
  
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
        } catch (e) {
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
            console.log(`[Profile] Received user data for: ${data.user.username}`);
            console.log(`[Profile] Avatar from API:`, data.user.avatar ? `"${data.user.avatar.substring(0, 100)}..."` : 'null/undefined');
            console.log(`[Profile] Default avatar:`, defaultProfile.avatar ? `"${defaultProfile.avatar.substring(0, 50)}..."` : 'null/undefined');
            
            const avatarValue = data.user.avatar || defaultProfile.avatar;
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
            // Store original avatar to track changes
            setOriginalAvatar(profile.avatar || "");
            
            // Transform and set book collections from API
            // Top books (Profile tab - "Top 4 books" carousel)
            const transformedTopBooks: ProfileBook[] = Array.isArray(data.user.topBooks)
              ? data.user.topBooks.map((book: any, idx: number) => ({
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
              ? data.user.favoriteBooks.map((book: any, idx: number) => ({
                  id: book.bookId?.toString() || book._id?.toString() || `fav-${idx}`,
                  title: book.title || "Unknown Title",
                  author: book.author || "Unknown Author",
                  cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                  mood: book.mood,
                }))
              : [];
            setFavoriteBooks(transformedFavoriteBooks);
            
            // Bookshelf books - sort by finishedOn date (newest first)
            const transformedBookshelf: BookshelfBook[] = Array.isArray(data.user.bookshelf)
              ? data.user.bookshelf
                  .map((book: any, idx: number) => ({
                    id: book.bookId?.toString() || book._id?.toString() || `shelf-${idx}`,
                    title: book.title || "Unknown Title",
                    author: book.author || "Unknown Author",
                    cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                    mood: book.mood,
                    finishedOn: book.finishedOn ? (typeof book.finishedOn === 'string' ? book.finishedOn : new Date(book.finishedOn).toISOString()) : "",
                    format: book.format,
                    rating: book.rating,
                    thoughts: book.thoughts,
                    _finishedOnDate: book.finishedOn ? (typeof book.finishedOn === 'string' ? new Date(book.finishedOn) : new Date(book.finishedOn)) : new Date(0),
                  }))
                  .sort((a: any, b: any) => {
                    // Sort by finishedOn date in descending order (newest first)
                    return b._finishedOnDate.getTime() - a._finishedOnDate.getTime();
                  })
                  .map(({ _finishedOnDate, ...book }: { _finishedOnDate: Date; [key: string]: any }) => book) // Remove the temporary sorting field
              : [];
            setBookshelfBooks(transformedBookshelf);
            
            // Liked books
            const transformedLiked: LikedBook[] = Array.isArray(data.user.likedBooks)
              ? data.user.likedBooks.map((book: any, idx: number) => ({
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
              ? data.user.tbrBooks.map((book: any, idx: number) => ({
                  id: book.bookId?.toString() || book._id?.toString() || `tbr-${idx}`,
                  title: book.title || "Unknown Title",
                  author: book.author || "Unknown Author",
                  cover: book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                  mood: book.mood,
                  addedOn: book.addedOn
                    ? `Added ${new Date(book.addedOn).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                    : "Added",
                  urgency: book.urgency,
                  whyNow: book.whyNow,
                }))
              : [];
            setTbrBooks(transformedTbr);
            
            // Reading lists
            const transformedLists: ReadingList[] = Array.isArray(data.user.readingLists)
              ? data.user.readingLists.map((list: any, idx: number) => {
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
                  };
                })
              : [];
            setReadingLists(transformedLists);
            
            // Activities
            // Determine if this is the owner's profile before mapping
            const isOwnerProfile = isAuthenticated && session?.user?.username === data.user.username;
            const transformedActivities: ActivityEntry[] = Array.isArray(data.user.recentActivities)
              ? data.user.recentActivities.map((activity: any, idx: number) => {
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
                  }
                  
                  return {
                    id: activity._id?.toString() || `activity-${idx}`,
                    name: isOwnerProfile ? "You" : data.user.name || "User",
                    action,
                    detail,
                    timeAgo,
                    cover: activity.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                  };
                })
              : [];
            setActivities(transformedActivities);
            
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
              } catch (e) {
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
  }, [activeUsername, isAuthenticated, status, session?.user?.username]);
  
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
      }
    };

    checkFollowStatus();
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
        });
      } else if (cover) {
        const entry = map.get(name)!;
        if (!entry.cover || entry.cover === placeholderCover) {
          entry.cover = cover;
        }
      }
      return map.get(name)!;
    };
    bookshelfBooks.forEach((book) => {
      const entry = ensureEntry(book.author, book.cover);
      entry.read += 1;
    });
    tbrBooks.forEach((book) => {
      const entry = ensureEntry(book.author, book.cover);
      entry.tbr += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.read + b.tbr - (a.read + a.tbr));
  }, [bookshelfBooks, tbrBooks]);

  const handleProfileSave = React.useCallback(async () => {
    if (!profileData || !activeUsername) return;
    
    try {
      setIsSavingProfile(true);
      setProfileSaveError(null);

      // Avatar is now saved as Cloudinary URL (not base64), which is small enough for cookies
      const payload: any = {
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
        // Update original avatar after successful save
        setOriginalAvatar(result.user.avatar || "");

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
          } catch (e) {
            // Storage quota exceeded or not available
          }
        }

        setIsEditOpen(false);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setProfileSaveError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [profileData, originalAvatar, activeUsername]);

  const dockItems = React.useMemo(() => {
    return dockLabels.map((label) => ({
      label,
      onClick: () => setActiveTab(label),
      isActive: activeTab === label,
    }));
  }, [activeTab]);

  if (isLoadingProfile || !profileData) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <TetrisLoading size="md" speed="fast" loadingText="Loading profile..." />
          </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8 mt-16">
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-12">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {isOwnProfile 
                  ? "Your saved ideas" 
                  : `${profileData.username}'s saved ideas`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isOwnProfile 
                  ? "All your boards, pins, and collages in one place."
                  : `All ${profileData.username}'s boards, pins, and collages in one place.`}
              </p>
            </div>
            <div className="flex justify-end w-full items-start">
              <div className="w-100 max-w-lg flex-shrink-0">
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
              <Dock items={dockItems} activeLabel={activeTab} />

              {activeTab === "Profile" ? (
                <div className="space-y-10">
                  <BookCarousel
                    title="Top 4 books"
                    subtitle="The ones I keep coming back to."
                    books={topBooks}
                  />
                  <BookCarousel
                    title="Books that I love"
                    subtitle="Comfort stories and obsessions that always earn a re-read."
                    books={favoriteBooks}
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
                            return entry.name !== "You";
                          }
                        })
                        .map((entry) => (
                          <article
                            key={entry.id}
                            className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
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
                              <button className="text-sm font-semibold text-primary transition hover:text-primary/80">
                                View details
                              </button>
                            </div>
                          </article>
                        ))}
                    </div>
                  )}
                </div>
              ) : activeTab === "Authors" ? (
                <AuthorsSection authors={authorStats} page={authorsPage} pageSize={AUTHORS_PAGE_SIZE} onPageChange={setAuthorsPage} />
              ) : activeTab === "Bookshelf" ? (
                <BookshelfSection
                  books={bookshelfBooks}
                  page={bookshelfPage}
                  pageSize={BOOKSHELF_PAGE_SIZE}
                  onPageChange={setBookshelfPage}
                />
              ) : activeTab === "Likes" ? (
                <LikesSection books={likedBooks} page={likesPage} pageSize={LIKES_PAGE_SIZE} onPageChange={setLikesPage} />
              ) : activeTab === "Lists" ? (
                <ListsCarousel lists={readingLists} canEdit={isOwnProfile} />
              ) : activeTab === "'to-be-read'" ? (
                <TbrSection books={tbrBooks} page={tbrPage} pageSize={TBR_PAGE_SIZE} onPageChange={setTbrPage} />
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
      </main>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[50vw]">
          <SheetHeader>
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          <EditProfileForm
            profile={profileData || defaultProfile}
            onProfileChange={setProfileData}
            onSubmitProfile={handleProfileSave}
            isSubmitting={isSavingProfile}
            submitError={profileSaveError}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

