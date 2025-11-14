"use client";

import Image from "next/image";
import * as React from "react";
import { UserRound, Users } from "lucide-react";

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
import { Edit, Image as ImageIcon, MoreVertical, Trash2 } from "lucide-react";
import {
  favoriteBooks,
  bookshelfBooks,
  likedBooks,
  tbrBooks,
  readingLists,
  topBooks,
  type BookshelfBook,
  type LikedBook,
  type TbrBook,
  type ReadingList,
  type ProfileBook,
} from "@/lib/mock/profileBooks";

const dockLabels = ["Profile", "Activity", "Bookshelf", "Authors", "Lists", "'to-be-read'", "Likes"] as const;
type DockLabel = (typeof dockLabels)[number];
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

const activityFeed: Record<ActivityView, ActivityEntry[]> = {
  Friends: [
    {
      id: "friend-1",
      name: "Aisha Patel",
      action: "finished",
      detail: "Yellowface",
      timeAgo: "12m ago",
      cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=500&q=80",
    },
    {
      id: "friend-2",
      name: "Leo Chavez",
      action: "rated ★★★★★",
      detail: "Project Hail Mary",
      timeAgo: "1h ago",
      cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500&q=80",
    },
    {
      id: "friend-3",
      name: "Nora Lee",
      action: "re-read",
      detail: "The Night Circus",
      timeAgo: "3h ago",
      cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=500&q=80",
    },
  ],
  Me: [
    {
      id: "me-1",
      name: "You",
      action: "annotated",
      detail: "Tomorrow, and Tomorrow, and Tomorrow",
      timeAgo: "Yesterday",
      cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&q=80",
    },
    {
      id: "me-2",
      name: "You",
      action: "added to list",
      detail: "Sea of Tranquility",
      timeAgo: "2d ago",
      cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=500&q=80",
    },
  ],
};

type AuthorStat = {
  name: string;
  read: number;
  tbr: number;
  cover: string;
};

function ProfileSummary({
  profile,
  bookshelfCount,
  onEdit,
  canEdit,
}: {
  profile: EditableProfile;
  bookshelfCount: number;
  onEdit: () => void;
  canEdit: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-28 w-28 sm:mx-0">
          <Image
            src={
              profile.avatar ||
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80"
            }
            alt="Profile avatar"
            fill
            className="rounded-full border-4 border-background object-cover shadow-lg"
          />
        </div>
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <p className="text-2xl font-semibold text-foreground">{profile.username}</p>
              {profile.pronouns.length ? (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {profile.pronouns.join("/")}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{profile.name}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-foreground sm:justify-start">
            <span>{bookshelfCount} books</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{profile.bio || "Add a bio to share your vibe."}</p>
          </div>
        </div>
      </div>
      {canEdit ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <InteractiveHoverButton
            text="Edit profile"
            showIdleAccent
            invert
            className="w-full max-w-xs"
            onClick={onEdit}
          />
        </div>
      ) : null}
    </section>
  );
}

function AuthRequiredBanner({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-muted/20 p-10 text-center">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">Sign in to explore this profile</p>
        <p className="text-sm text-muted-foreground">
          You can preview the basics, but you’ll need to log in to browse bookshelves, activity, and lists.
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
  subtitle?: string;
  books: ProfileBook[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex flex-nowrap gap-6 overflow-x-auto pb-4">
        {books.map((book) => (
          <BookCard key={book.id} {...book} />
        ))}
      </div>
    </section>
  );
}

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/20 p-12 text-center">
      <p className="text-sm text-muted-foreground">The {label} tab is under construction.</p>
      <p className="text-xs text-muted-foreground/80">Check back soon for more ways to organize your reading life.</p>
    </div>
  );
}

function SectionPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const handleChange = (event: React.MouseEvent, nextPage: number) => {
    event.preventDefault();
    if (nextPage >= 1 && nextPage <= totalPages && nextPage !== page) {
      onPageChange(nextPage);
    }
  };

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <Pagination className="pt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" onClick={(event) => handleChange(event, page - 1)} />
        </PaginationItem>

        {pages.map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              href="#"
              isActive={pageNumber === page}
              onClick={(event) => handleChange(event, pageNumber)}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext href="#" onClick={(event) => handleChange(event, page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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
  const visibleBooks = books.slice(startIndex, startIndex + pageSize);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Bookshelf</h2>
        <p className="text-sm text-muted-foreground">
          Every book I’ve finished recently, with formats, ratings, and stray thoughts.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleBooks.map((book) => (
          <article
            key={book.id}
            className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
          >
            <div className="relative h-28 w-20 overflow-hidden rounded-2xl bg-muted">
              <Image src={book.cover} alt={book.title} fill className="object-cover" sizes="80px" />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{book.finishedOn}</p>
                <h3 className="text-base font-semibold text-foreground">{book.title}</h3>
                <p className="text-sm text-muted-foreground">{book.author}</p>
                {book.thoughts ? <p className="text-sm text-muted-foreground">{book.thoughts}</p> : null}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {book.format ? <span className="uppercase tracking-wide">{book.format}</span> : null}
                {book.rating ? <span>Rated {book.rating}/5</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      <SectionPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </section>
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
  const visibleBooks = books.slice(startIndex, startIndex + pageSize);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Liked books</h2>
        <p className="text-sm text-muted-foreground">
          Stories I starred to revisit, re-read, or recommend later.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleBooks.map((book) => (
          <article key={book.id} className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1">
            <div className="relative h-28 w-20 overflow-hidden rounded-2xl bg-muted">
              <Image src={book.cover} alt={book.title} fill className="object-cover" sizes="80px" />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-wide text-muted-foreground/80">Starred favorite</p>
                <h3 className="text-base font-semibold text-foreground">{book.title}</h3>
                <p className="text-sm text-muted-foreground">{book.author}</p>
                {book.reason ? <p className="text-sm text-muted-foreground">{book.reason}</p> : null}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground/90">Quick re-read candidate</div>
            </div>
          </article>
        ))}
      </div>
      <SectionPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </section>
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
  const visibleBooks = books.slice(startIndex, startIndex + pageSize);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">The procrastination wall</h2>
        <p className="text-sm text-muted-foreground">
          All the titles marked as pending—staring me down until I finally crack them open.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleBooks.map((book) => (
          <article
            key={book.id}
            className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
          >
            <div className="relative h-28 w-20 overflow-hidden rounded-2xl bg-muted">
              <Image src={book.cover} alt={book.title} fill className="object-cover" sizes="80px" />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {book.urgency ?? "Eventually"}
                </p>
                <h3 className="text-base font-semibold text-foreground">{book.title}</h3>
                <p className="text-sm text-muted-foreground">{book.author}</p>
                <p className="text-xs text-muted-foreground">{book.addedOn}</p>
                {book.whyNow ? <p className="text-sm text-muted-foreground">{book.whyNow}</p> : null}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground/80">Pending · Mood board ready</div>
            </div>
          </article>
        ))}
      </div>
      <SectionPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </section>
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
  const visibleAuthors = authors.slice(startIndex, startIndex + pageSize);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Authors</h2>
        <p className="text-sm text-muted-foreground">Writers behind your finished stacks and upcoming reads.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleAuthors.map((author) => (
          <article
            key={author.name}
            className="flex items-center gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
          >
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-muted">
              <Image src={author.cover} alt={author.name} fill className="object-cover" sizes="80px" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{author.name}</h3>
              <p className="text-sm text-muted-foreground">
                Read {author.read} · In TBR {author.tbr}
              </p>
            </div>
          </article>
        ))}
      </div>
      <SectionPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </section>
  );
}

function CreateListButton() {
  return (
    <InteractiveHoverButton
      text="Create list"
      showIdleAccent={true}
      className="w-40"
      onClick={() => {
        /* placeholder action */
      }}
    />
  );
}

function ListCardActions() {
  return (
    <Dropdown.Root className="relative">
      <Dropdown.Trigger className="rounded-full p-1 text-muted-foreground transition hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="sr-only">List actions</span>
        <MoreVertical className="h-4 w-4" />
      </Dropdown.Trigger>
      <Dropdown.Popover align="end">
        <Dropdown.Menu>
          <Dropdown.Item label="Rename list" icon={Edit} />
          <Dropdown.Item label="Update cover image" icon={ImageIcon} />
          <Dropdown.Separator />
          <Dropdown.Item label="Delete list" icon={Trash2} className="text-destructive hover:bg-destructive/10" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}

function ListsCarousel({ lists }: { lists: ReadingList[] }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lists</h2>
          <p className="text-sm text-muted-foreground">Curated collections ready to share with friends.</p>
        </div>
        <CreateListButton />
      </div>
      <div className="flex flex-nowrap gap-6 overflow-x-auto overflow-y-visible pb-4">
        {lists.map((list) => (
          <div key={list.id} className="group flex w-[220px] flex-shrink-0 flex-col gap-3">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-sm transition-transform duration-300 group-hover:-translate-y-1">
              <Image src={list.cover} alt={list.title} fill className="object-cover" />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{list.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {list.booksCount} Books · {list.updatedAgo}
                </p>
              </div>
              <ListCardActions />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = React.useState<DockLabel>("Profile");
  const [activityView, setActivityView] = React.useState<ActivityView>("Friends");
  const [profileData, setProfileData] = React.useState<EditableProfile>(defaultProfile);
  const [activeUsername, setActiveUsername] = React.useState(defaultProfile.username);
  const [bookshelfPage, setBookshelfPage] = React.useState(1);
  const [likesPage, setLikesPage] = React.useState(1);
  const [tbrPage, setTbrPage] = React.useState(1);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [authorsPage, setAuthorsPage] = React.useState(1);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileSaveError, setProfileSaveError] = React.useState<string | null>(null);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  
  // Track which username we've loaded to prevent duplicate loads
  const loadedUsernameRef = React.useRef<string | null>(null);
  
  // Load profile data when authenticated
  React.useEffect(() => {
    // Wait for session to be loaded (not loading)
    if (status === "loading") {
      return; // Wait for session to load
    }

    if (isAuthenticated && session?.user?.username) {
      const sessionUsername = session.user.username;
      
      // Always set activeUsername to session username
      setActiveUsername(sessionUsername);
      
      // Load profile data if we haven't loaded it for this username yet
      if (loadedUsernameRef.current !== sessionUsername) {
        loadedUsernameRef.current = sessionUsername;
        
        console.log(`[Profile] Loading profile for username: ${sessionUsername}`);
        
        // Load profile data for the logged-in user
        fetch(`/api/users/${encodeURIComponent(sessionUsername)}`)
          .then((res) => {
            if (!res.ok) {
              if (res.status === 404) {
                console.warn(`User not found: ${sessionUsername}. This might mean the user doesn't exist in the database yet.`);
                // User doesn't exist - this shouldn't happen if they just logged in
                // But we'll handle it gracefully by showing default profile
                return null;
              }
              throw new Error(`Failed to fetch profile: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            if (data?.user) {
              setProfileData({
                username: data.user.username || defaultProfile.username,
                name: data.user.name || defaultProfile.name,
                birthday: data.user.birthday ? new Date(data.user.birthday).toISOString().split("T")[0] : defaultProfile.birthday,
                email: data.user.email || defaultProfile.email,
                bio: data.user.bio || defaultProfile.bio,
                pronouns: Array.isArray(data.user.pronouns) ? data.user.pronouns : defaultProfile.pronouns,
                links: Array.isArray(data.user.links) ? data.user.links.join(", ") : (data.user.links || defaultProfile.links),
                gender: data.user.gender || defaultProfile.gender,
                isPublic: typeof data.user.isPublic === "boolean" ? data.user.isPublic : defaultProfile.isPublic,
                avatar: data.user.avatar || defaultProfile.avatar,
              });
            } else {
              // User not found - use session data as fallback
              console.warn("User profile not found in database, using session data");
              setProfileData({
                username: sessionUsername,
                name: session?.user?.name || defaultProfile.name,
                email: session?.user?.email || defaultProfile.email,
                bio: defaultProfile.bio,
                pronouns: defaultProfile.pronouns,
                links: defaultProfile.links,
                gender: defaultProfile.gender,
                isPublic: defaultProfile.isPublic,
                avatar: session?.user?.image || defaultProfile.avatar,
                birthday: defaultProfile.birthday,
              });
            }
          })
          .catch((err) => {
            console.error("Failed to load user profile:", err);
            // Reset ref so it can retry
            loadedUsernameRef.current = null;
          });
      }
    } else if (status === "unauthenticated") {
      // Reset state when unauthenticated
      loadedUsernameRef.current = null;
      setActiveUsername(defaultProfile.username);
      setProfileData(defaultProfile);
    }
  }, [isAuthenticated, status, session?.user?.username]);
  
  const isOwnProfile = isAuthenticated && session?.user?.username === activeUsername;
  const handleAuthPrompt = React.useCallback(() => {
    signIn();
  }, []);
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
  }, []);

  const handleProfileSave = React.useCallback(async () => {
    try {
      setIsSavingProfile(true);
      setProfileSaveError(null);

      const payload = {
        username: profileData.username,
        name: profileData.name,
        bio: profileData.bio,
        avatar: profileData.avatar,
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
        isPublic: profileData.isPublic,
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
        setProfileData((prev) => ({
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
        }));

        if (result.user.username && result.user.username !== activeUsername) {
          setActiveUsername(result.user.username);
        }
      }

      setIsEditOpen(false);
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [profileData, activeUsername]);
  const dockItems = React.useMemo(
    () =>
      dockLabels.map((label) => ({
        label,
        onClick: () => setActiveTab(label),
      })),
    [setActiveTab],
  );

  return (
    <main className="relative min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 pb-16 pt-12 md:px-8">
          <header className="flex flex-col gap-6">
            <div className={`grid gap-6 ${isOwnProfile ? "lg:grid-cols-[minmax(0,2.5fr)_minmax(0,3fr)]" : ""}`}>
              {isOwnProfile ? (
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    Your saved ideas
                  </h1>
                  <p className="text-sm text-muted-foreground">All your boards, pins, and collages in one place.</p>
                </div>
              ) : null}
              <ProfileSummary
                profile={profileData}
                bookshelfCount={bookshelfBooks.length}
                onEdit={() => {
                  setProfileSaveError(null);
                  setIsEditOpen(true);
                }}
                canEdit={Boolean(isOwnProfile)}
              />
            </div>
            <Dock items={dockItems} activeLabel={activeTab} className="justify-start px-0" />
          </header>

          {isAuthenticated ? (
            activeTab === "Profile" ? (
              <div className="space-y-12">
                <BookCarousel
                  title="Favourite books"
                  subtitle="A quick glance at the reads I can’t stop recommending."
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
                        onClick: () => setActivityView("Friends"),
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
                <div className="grid gap-6 md:grid-cols-2">
                  {activityFeed[activityView].map((entry) => (
                    <article
                      key={entry.id}
                      className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
                    >
                      <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-muted">
                        <Image src={entry.cover} alt={entry.detail} fill className="object-cover" sizes="96px" />
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
              <ListsCarousel lists={readingLists} />
            ) : activeTab === "'to-be-read'" ? (
              <TbrSection books={tbrBooks} page={tbrPage} pageSize={TBR_PAGE_SIZE} onPageChange={setTbrPage} />
            ) : (
              <TabPlaceholder label={activeTab} />
            )
          ) : (
            <AuthRequiredBanner onSignIn={handleAuthPrompt} />
          )}
        </div>
        <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
          <SheetContent
            side="right"
            className="w-full border-l border-border/70 md:max-w-[70vw] lg:max-w-[60vw] 2xl:max-w-[50vw]"
          >
            <SheetHeader className="border-b bg-background p-6">
              <SheetTitle className="text-xl font-semibold text-foreground">Edit profile</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Update your basics, keep your links current, and set your privacy preferences.
              </p>
            </SheetHeader>
            <div className="h-full overflow-y-auto p-6">
              <EditProfileForm
                profile={profileData}
                onProfileChange={setProfileData}
                onSubmitProfile={handleProfileSave}
                isSubmitting={isSavingProfile}
                submitError={profileSaveError}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </main>
  );
}

