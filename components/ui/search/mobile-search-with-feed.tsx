"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthenticatedHomeMobile } from "@/components/ui/home/authenticated-home-mobile";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/primitives/command";
import { ArrowLeft, BookOpen, SearchIcon, Sparkles, Wand2 } from "lucide-react";
import { cn, DEFAULT_AVATAR } from "@/lib/utils";
import { createBookSlug } from "@/lib/utils/book-slug";
import {
  type BookSearchResult,
  type SearchType,
  type UserSearchResult,
  type VibeSearchItem,
  useLibrarySearch,
} from "@/components/ui/search/use-library-search";

const TYPE_PILLS: SearchType[] = ["Books", "User", "Vibe"];

export function MobileSearchWithFeed() {
  const router = useRouter();
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const [searchActive, setSearchActive] = React.useState(false);

  const {
    query,
    setQuery,
    searchType,
    setSearchType,
    bookResults,
    userResults,
    vibeResults,
    vibePersonalised,
    isSearching,
    searchError,
    setSearchError,
    currentResults,
    resetQuery,
    vibePrompts,
  } = useLibrarySearch();

  const openSearch = React.useCallback(() => {
    setSearchActive(true);
    requestAnimationFrame(() => {
      const input = inputWrapperRef.current?.querySelector<HTMLInputElement>(
        "[cmdk-input], input"
      );
      input?.focus();
    });
  }, []);

  const closeSearch = React.useCallback(() => {
    setSearchActive(false);
    resetQuery();
  }, [resetQuery]);

  React.useEffect(() => {
    if (searchActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchActive]);

  const placeholder =
    searchType === "User"
      ? "Search readers..."
      : searchType === "Vibe"
        ? "Describe a mood, theme, or feeling..."
        : "Search books & authors...";

  return (
    <div className="relative min-h-screen bg-background">
      {/* Infinite masonry feed — fades out when search is active */}
      <div
        className={cn(
          "transition-opacity duration-300 ease-out",
          searchActive ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        aria-hidden={searchActive}
      >
        <div className={cn("transition-[padding] duration-200", searchActive ? "pt-0" : "pt-[4.25rem]")}>
          <AuthenticatedHomeMobile />
        </div>
      </div>

      {/* Fixed top search chrome */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b bg-background/90 backdrop-blur-xl",
          searchActive
            ? searchType === "Vibe"
              ? "border-amber-500/15 bg-gradient-to-b from-amber-500/[0.06] to-background/95"
              : "border-border/60 shadow-sm"
            : "border-transparent shadow-[0_1px_0_0_hsl(var(--border)/0.5)]"
        )}
      >
        <div className={cn("px-4", searchActive ? "pt-2.5 pb-3" : "py-2.5")}>
          <div className="flex min-w-0 items-center gap-2">
            {searchActive && (
              <button
                type="button"
                onClick={closeSearch}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted"
                aria-label="Back to feed"
              >
                <ArrowLeft className="size-5" strokeWidth={2} />
              </button>
            )}

            {!searchActive ? (
              <button
                type="button"
                onClick={openSearch}
                className="flex h-11 w-full min-w-0 items-center gap-3 rounded-2xl bg-muted/70 px-4 text-left text-muted-foreground shadow-sm ring-1 ring-border/40 transition-all active:scale-[0.99] active:bg-muted"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/80">
                  <SearchIcon className="size-4 opacity-50" />
                </span>
                <span className="truncate text-[15px] tracking-tight">Search books, readers, vibes…</span>
              </button>
            ) : (
              <div
                ref={inputWrapperRef}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3.5 shadow-sm ring-1",
                  searchType === "Vibe"
                    ? "bg-amber-500/[0.06] ring-amber-500/25"
                    : "bg-muted/50 ring-border/50"
                )}
              >
                {searchType === "Vibe" ? (
                  <Wand2 className="size-4 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
                ) : (
                  <SearchIcon className="size-4 shrink-0 text-muted-foreground/50" />
                )}
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  placeholder={placeholder}
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/55"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {searchActive && (
            <div className="mt-3 flex gap-1 rounded-xl bg-muted/50 p-1 ring-1 ring-border/30">
              {TYPE_PILLS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSearchType(type)}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all duration-150",
                    searchType === type
                      ? type === "Vibe"
                        ? "bg-background text-amber-700 shadow-sm ring-1 ring-amber-500/20 dark:text-amber-400"
                        : "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  {type === "User" ? (
                    "Readers"
                  ) : type === "Vibe" ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="size-3" />
                      Vibe
                    </span>
                  ) : (
                    "Books"
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Search panel — covers feed when active */}
      {searchActive && (
        <div className="fixed inset-x-0 bottom-0 top-[7.75rem] z-40 overflow-hidden bg-background pb-20">
          <Command
            className={cn(
              "flex h-full flex-col",
              "[&_[cmdk-input-wrapper]]:hidden"
            )}
            shouldFilter={false}
          >
            <CommandList className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-3 pt-1">
              <SearchResultsBody
                query={query}
                searchType={searchType}
                isSearching={isSearching}
                searchError={searchError}
                setQuery={setQuery}
                setSearchError={setSearchError}
                currentResults={currentResults}
                bookResults={bookResults}
                userResults={userResults}
                vibeResults={vibeResults}
                vibePersonalised={vibePersonalised}
                vibePrompts={vibePrompts}
                router={router}
              />
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

/** Shared results UI (also used by desktop search page). */
export function SearchResultsBody({
  query,
  searchType,
  isSearching,
  searchError,
  setQuery,
  setSearchError,
  currentResults,
  bookResults,
  userResults,
  vibeResults,
  vibePersonalised,
  vibePrompts,
  router,
}: {
  query: string;
  searchType: SearchType;
  isSearching: boolean;
  searchError: string | null;
  setQuery: (q: string) => void;
  setSearchError: (e: string | null) => void;
  currentResults: BookSearchResult[] | UserSearchResult[] | VibeSearchItem[];
  bookResults: BookSearchResult[];
  userResults: UserSearchResult[];
  vibeResults: VibeSearchItem[];
  vibePersonalised: boolean;
  vibePrompts: readonly string[];
  router: ReturnType<typeof useRouter>;
}) {
  if (query.trim()) {
    if (isSearching) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <div className="pbld-bookmark" style={{ "--w": "72px" } as React.CSSProperties}>
            <div className="pbld-bookmark__pages" />
            <div className="pbld-bookmark__cover-l" />
            <div className="pbld-bookmark__cover-r" />
            <div className="pbld-bookmark__ribbon" />
          </div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {searchType === "Vibe"
              ? "Finding your vibe..."
              : `Searching ${searchType === "User" ? "readers" : "books"}`}
          </p>
        </div>
      );
    }
    if (searchError) {
      return (
        <CommandEmpty className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
          <SearchIcon className="mb-3 size-6 text-muted-foreground/30" />
          <p className="mb-1 text-sm font-medium">Search failed</p>
          <p className="mb-4 text-xs text-muted-foreground">{searchError}</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear search
          </button>
        </CommandEmpty>
      );
    }
    if (searchType === "Vibe" && query.trim().length < 10) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 w-1 rounded-full transition-colors duration-150",
                  i < query.trim().length ? "bg-amber-500/60" : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60">A bit more to activate vibe search</p>
        </div>
      );
    }
    if (currentResults.length === 0) {
      return (
        <CommandEmpty className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
          <p className="mb-1 text-sm font-medium text-foreground/60">
            No {searchType === "User" ? "readers" : "books"} found
          </p>
          <p className="text-xs text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
        </CommandEmpty>
      );
    }
    return (
      <CommandGroup className="py-1">
        {searchType === "Vibe" && vibePersonalised && (
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <Sparkles className="size-3 text-amber-500/50" />
            <p className="text-[10px] italic text-amber-600/50 dark:text-amber-400/40">
              Tuned to your reading taste
            </p>
          </div>
        )}
        {searchType === "Vibe" &&
          vibeResults.map((book, index) => (
            <VibeResultRow key={`vibe-${book.id}-${index}`} book={book} router={router} />
          ))}
        {searchType === "Books" &&
          bookResults.map((book, index) => (
            <BookResultRow key={book.id ? `${book.id}-${index}` : `book-${index}`} book={book} router={router} />
          ))}
        {searchType === "User" &&
          userResults.map((user, index) => (
            <UserResultRow
              key={user.id ? `${user.id}-${index}` : `user-${index}`}
              user={user}
              router={router}
            />
          ))}
      </CommandGroup>
    );
  }

  if (searchType === "Vibe") {
    return (
      <div className="px-1 py-4">
        <p className="mb-3 px-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
          Try a feeling
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {vibePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuery(prompt)}
              className="rounded-xl bg-muted/40 px-4 py-3.5 text-left text-sm leading-snug text-foreground/80 ring-1 ring-border/40 transition-colors active:bg-muted"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-2 text-center">
      <div
        className="pbld-pageflip opacity-30"
        style={{ "--w": "36px", "--h": "44px" } as React.CSSProperties}
      >
        <div className="pbld-pageflip__left" />
        <div className="pbld-pageflip__right" />
        <div className="pbld-pageflip__spine" />
        <div className="pbld-pageflip__page" />
      </div>
      <p className="text-xs text-muted-foreground">
        {searchType === "User" ? "Find readers by username" : "Search by title, author, or ISBN"}
      </p>
    </div>
  );
}

function BookResultRow({ book, router }: { book: BookSearchResult; router: ReturnType<typeof useRouter> }) {
  const cover = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || "";
  const authors = book.authors?.join(", ") || "Unknown Author";
  const handleSelect = () => {
    if (book.id) {
      const isISBN = /^(\d{10}|\d{13})$/.test(book.id);
      const isOpenLibraryId = book.id.startsWith("OL") || book.id.startsWith("/works/");
      const isValidId = /^[a-zA-Z0-9_-]+$/.test(book.id) && !book.id.includes(" ") && !book.id.includes("+");
      if (isISBN || isOpenLibraryId || isValidId) router.push(`/b/${book.id}`);
      else router.push(`/b/${createBookSlug(book.title, book.id, book.id)}`);
    } else router.push(`/b/${createBookSlug(book.title)}`);
  };
  return (
    <CommandItem
      className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 aria-selected:bg-muted/80"
      value={`${book.id}-${book.title}`}
      onSelect={handleSelect}
      onClick={(e) => {
        e.stopPropagation();
        handleSelect();
      }}
    >
      {cover ? (
        <div className="pointer-events-none relative h-[60px] w-10 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm ring-1 ring-border/30">
          <Image src={cover} alt={book.title} fill className="object-cover" sizes="40px" unoptimized />
        </div>
      ) : (
        <div className="pointer-events-none flex h-[60px] w-10 shrink-0 items-center justify-center rounded-[3px] bg-muted">
          <BookOpen className="size-4 text-muted-foreground/50" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{book.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{authors}</p>
      </div>
    </CommandItem>
  );
}

function VibeResultRow({ book, router }: { book: VibeSearchItem; router: ReturnType<typeof useRouter> }) {
  const cover = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || "";
  const authors = book.authors?.join(", ") || "Unknown Author";
  const handleSelect = () => {
    if (book.id) {
      const isISBN = /^(\d{10}|\d{13})$/.test(book.id);
      const isValidId = /^[a-zA-Z0-9_-]+$/.test(book.id) && !book.id.includes(" ") && !book.id.includes("+");
      if (isISBN || isValidId) router.push(`/b/${book.id}`);
      else router.push(`/b/${createBookSlug(book.title, book.id, book.id)}`);
    } else router.push(`/b/${createBookSlug(book.title)}`);
  };
  return (
    <CommandItem
      className="flex cursor-pointer flex-col items-start gap-0 rounded-lg px-3 py-2.5"
      value={`vibe-${book.id}-${book.title}`}
      onSelect={handleSelect}
      onClick={(e) => {
        e.stopPropagation();
        handleSelect();
      }}
    >
      <div className="flex w-full items-center gap-3">
        {cover ? (
          <div className="pointer-events-none relative h-[60px] w-10 shrink-0 overflow-hidden rounded-[3px] bg-muted shadow-sm">
            <Image src={cover} alt={book.title} fill className="object-cover" sizes="40px" unoptimized />
          </div>
        ) : (
          <div className="pointer-events-none flex h-[60px] w-10 shrink-0 items-center justify-center rounded-[3px] bg-muted">
            <BookOpen className="size-4 text-muted-foreground/50" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug">{book.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{authors}</p>
        </div>
      </div>
      {book.matchReason && (
        <p className="mt-1.5 px-[52px] text-[11px] leading-snug text-amber-600/70 dark:text-amber-400/60">
          {book.matchReason}
        </p>
      )}
    </CommandItem>
  );
}

function UserResultRow({ user, router }: { user: UserSearchResult; router: ReturnType<typeof useRouter> }) {
  const handleSelect = () => router.push(`/u/${encodeURIComponent(user.username)}`);
  return (
    <CommandItem
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5"
      value={`${user.id}-${user.username}`}
      onSelect={handleSelect}
      onClick={(e) => {
        e.stopPropagation();
        handleSelect();
      }}
    >
      <div className="pointer-events-none relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
        <Image src={user.avatar || DEFAULT_AVATAR} alt={user.username} fill className="object-cover" sizes="40px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.username}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.name}</p>
      </div>
    </CommandItem>
  );
}
