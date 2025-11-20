"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/layout/header-with-search";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/primitives/command";
import { DockToggle } from "@/components/ui/dock";
import { SearchIcon, Loader2, BookOpen, User } from "lucide-react";
import { createBookSlug } from "@/lib/utils/book-slug";
import { useIsMobile } from "@/hooks/use-media-query";
import { DEFAULT_AVATAR } from "@/lib/utils";

type BookSearchResult = {
  id: string;
  title: string;
  authors?: string[];
  description?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
};

type UserSearchResult = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
};

type SearchType = "Books" | "User";

export default function SearchPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [searchType, setSearchType] = React.useState<SearchType>("Books");
  const [bookResults, setBookResults] = React.useState<BookSearchResult[]>([]);
  const [userResults, setUserResults] = React.useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  // Track when component has mounted on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced search based on search type
  React.useEffect(() => {
    if (!query.trim()) {
      setBookResults([]);
      setUserResults([]);
      setSearchError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        let response: Response;
        let result: any;

        switch (searchType) {
          case "Books":
            try {
              response = await fetch(
                `/api/books/search?q=${encodeURIComponent(query)}&maxResults=10&forceFresh=true`
              );
            } catch (fetchError) {
              throw new Error(
                `Network error: Unable to connect to search API. Please check your connection.`
              );
            }

            if (!response.ok) {
              let errorMessage = `Failed to search books`;
              try {
                const errorData = await response.json();
                errorMessage =
                  errorData?.error ||
                  errorData?.details ||
                  `Failed to search books (${response.status})`;
              } catch {
                errorMessage =
                  response.statusText || `Failed to search books (${response.status})`;
              }
              throw new Error(errorMessage);
            }

            try {
              result = await response.json();
            } catch (parseError) {
              throw new Error(`Invalid response from search API. Please try again.`);
            }
            // Handle both Google Books format (result.items) and database format (result.books)
            if (result.items && Array.isArray(result.items)) {
              const books: BookSearchResult[] = result.items.map((item: any) => ({
                id: item.id,
                title: item.volumeInfo?.title || "Unknown Title",
                authors: item.volumeInfo?.authors || [],
                description: item.volumeInfo?.description || "",
                imageLinks: item.volumeInfo?.imageLinks || {},
              }));
              setBookResults(books);
              setUserResults([]);
            } else if (result.books && Array.isArray(result.books)) {
              // Database format
              const books: BookSearchResult[] = result.books.map((item: any) => ({
                id: item._id?.toString() || item.id,
                title: item.volumeInfo?.title || item.title || "Unknown Title",
                authors: item.volumeInfo?.authors || item.authors || [],
                description: item.volumeInfo?.description || item.description || "",
                imageLinks: item.volumeInfo?.imageLinks || item.imageLinks || {},
              }));
              setBookResults(books);
              setUserResults([]);
            } else {
              setBookResults([]);
            }
            break;

          case "User":
            try {
              response = await fetch(
                `/api/users/search?q=${encodeURIComponent(query)}&limit=10`
              );
            } catch (fetchError) {
              throw new Error(
                `Network error: Unable to connect to search API. Please check your connection.`
              );
            }

            if (!response.ok) {
              let errorMessage = `Failed to search users (${response.status})`;
              try {
                const errorData = await response.json();
                errorMessage = errorData?.error || errorData?.details || errorMessage;
              } catch {
                errorMessage = response.statusText || errorMessage;
              }
              throw new Error(errorMessage);
            }

            try {
              result = await response.json();
            } catch (parseError) {
              throw new Error(`Invalid response from search API. Please try again.`);
            }
            if (result.users && Array.isArray(result.users)) {
              setUserResults(result.users);
              setBookResults([]);
            } else {
              setUserResults([]);
            }
            break;
        }
      } catch (error) {
        console.error("Search error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to search ${searchType.toLowerCase()}`;
        setSearchError(errorMessage);
        setBookResults([]);
        setUserResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, searchType]);

  const currentResults = searchType === "Books" ? bookResults : userResults;

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 mt-16 pb-24">
        <div className="px-4 py-4">
          {/* Search Bar with Dock Toggle */}
          <div className="mb-4">
            <Command className="bg-background rounded-md border" shouldFilter={false}>
              <div className="flex flex-col gap-3 p-3 pb-2">
                <CommandInput
                  className="placeholder:text-muted-foreground flex h-14 w-full rounded-md bg-transparent py-3 text-base outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={`Search ${searchType.toLowerCase()}...`}
                  value={query}
                  onValueChange={(value) => {
                    setQuery(value);
                    if (searchError) {
                      setSearchError(null);
                    }
                  }}
                />
                <DockToggle
                  items={[
                    {
                      label: "Books",
                      icon: BookOpen,
                      isActive: searchType === "Books",
                      onClick: () => setSearchType("Books"),
                    },
                    {
                      label: "User",
                      icon: User,
                      isActive: searchType === "User",
                      onClick: () => setSearchType("User"),
                    },
                  ]}
                  className="w-full flex justify-between"
                  buttonClassName="justify-center"
                />
              </div>
              <CommandList className="max-h-[calc(100vh-280px)] px-2">
                {query.trim() ? (
                  <>
                    {isSearching ? (
                      <div className="flex min-h-[200px] flex-col items-center justify-center py-8">
                        <Loader2 className="text-muted-foreground mb-2 size-6 animate-spin" />
                        <p className="text-muted-foreground text-xs">
                          Searching {searchType.toLowerCase()}...
                        </p>
                      </div>
                    ) : searchError ? (
                      <CommandEmpty className="flex min-h-[200px] flex-col items-center justify-center py-8">
                        <SearchIcon className="text-muted-foreground mb-2 size-6" />
                        <p className="text-muted-foreground mb-1 text-xs">{searchError}</p>
                      </CommandEmpty>
                    ) : currentResults.length === 0 ? (
                      <CommandEmpty className="flex min-h-[200px] flex-col items-center justify-center py-8">
                        <SearchIcon className="text-muted-foreground mb-2 size-6" />
                        <p className="text-muted-foreground mb-1 text-xs">
                          No {searchType.toLowerCase()} found for "{query}"
                        </p>
                      </CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {searchType === "Books" &&
                          bookResults.map((book, index) => {
                            const cover =
                              book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || "";
                            const authors = book.authors?.join(", ") || "Unknown Author";

                            const handleBookSelect = () => {
                              if (book.id) {
                                const isISBN = /^(\d{10}|\d{13})$/.test(book.id);
                                const isOpenLibraryId =
                                  book.id.startsWith("OL") || book.id.startsWith("/works/");
                                const isValidId =
                                  /^[a-zA-Z0-9_-]+$/.test(book.id) &&
                                  !book.id.includes(" ") &&
                                  !book.id.includes("+");

                                if (isISBN || isOpenLibraryId || isValidId) {
                                  router.push(`/b/${book.id}`);
                                } else {
                                  const slug = createBookSlug(book.title, book.id, book.id);
                                  router.push(`/b/${slug}`);
                                }
                              } else {
                                const slug = createBookSlug(book.title);
                                router.push(`/b/${slug}`);
                              }
                            };

                            const uniqueKey = book.id
                              ? `${book.id}-${index}`
                              : `book-${index}-${book.title}`;

                            return (
                              <CommandItem
                                key={uniqueKey}
                                className="flex cursor-pointer items-center gap-3 py-3"
                                value={`${book.id}-${book.title}`}
                                onSelect={handleBookSelect}
                                onClick={handleBookSelect}
                              >
                                {cover ? (
                                  <div className="relative size-14 flex-shrink-0 overflow-hidden rounded-md bg-muted pointer-events-none">
                                    <Image
                                      src={cover}
                                      alt={book.title}
                                      fill
                                      className="object-cover pointer-events-none"
                                      sizes="56px"
                                      quality={100}
                                      unoptimized={
                                        cover.includes("isbndb.com") ||
                                        cover.includes("images.isbndb.com") ||
                                        cover.includes("covers.isbndb.com")
                                      }
                                    />
                                  </div>
                                ) : (
                                  <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-md bg-muted pointer-events-none">
                                    <BookOpen className="size-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex flex-1 flex-col min-w-0">
                                  <p className="max-w-full truncate text-sm font-medium">
                                    {book.title}
                                  </p>
                                  <p className="text-muted-foreground text-xs truncate">
                                    {authors}
                                  </p>
                                </div>
                              </CommandItem>
                            );
                          })}
                        {searchType === "User" &&
                          userResults.map((user, index) => {
                            const handleUserSelect = () => {
                              router.push(`/u/${encodeURIComponent(user.username)}`);
                            };

                            const uniqueKey = user.id
                              ? `${user.id}-${index}`
                              : `user-${index}-${user.username}`;

                            return (
                              <CommandItem
                                key={uniqueKey}
                                className="flex cursor-pointer items-center gap-3 py-3"
                                value={`${user.id}-${user.username}`}
                                onSelect={handleUserSelect}
                                onClick={handleUserSelect}
                              >
                                <div className="relative size-12 flex-shrink-0 overflow-hidden rounded-full bg-muted pointer-events-none">
                                  <Image
                                    src={user.avatar || DEFAULT_AVATAR}
                                    alt={user.username}
                                    fill
                                    className="object-cover pointer-events-none"
                                    sizes="48px"
                                  />
                                </div>
                                <div className="flex flex-1 flex-col min-w-0">
                                  <p className="max-w-full truncate text-sm font-medium">
                                    {user.username}
                                  </p>
                                  <p className="text-muted-foreground text-xs truncate">
                                    {user.name}
                                  </p>
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    )}
                  </>
                ) : (
                  <CommandEmpty className="flex min-h-[200px] flex-col items-center justify-center py-8">
                    <SearchIcon className="text-muted-foreground mb-2 size-6" />
                    <p className="text-muted-foreground mb-1 text-xs">
                      Search for {searchType.toLowerCase()} by typing above
                    </p>
                  </CommandEmpty>
                )}
              </CommandList>
            </Command>
          </div>
        </div>
      </main>
    </div>
  );
}

