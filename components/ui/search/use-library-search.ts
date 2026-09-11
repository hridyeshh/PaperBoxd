"use client";

import * as React from "react";
import { track } from "@/lib/analytics";

export type BookSearchResult = {
  id: string;
  title: string;
  authors?: string[];
  description?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
};

export type UserSearchResult = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
};

export type VibeSearchItem = BookSearchResult & {
  matchReason?: string;
  similarityScore?: number;
};

export type SearchType = "Books" | "User" | "Vibe";

type BookSearchItem = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
  _id?: { toString(): string };
  title?: string;
  authors?: string[];
  description?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
};

type BookSearchResponse =
  | { items?: BookSearchItem[]; books?: never }
  | { books?: BookSearchItem[]; items?: never };

type UserSearchResponse = { users?: UserSearchResult[] };

type SearchResponse = BookSearchResponse | UserSearchResponse;

export const VIBE_PROMPTS = [
  "Something dark and claustrophobic",
  "A slow summer read with romance",
  "Mind-bending sci-fi that questions reality",
  "Books that feel like a long train journey",
] as const;

/** One-tap refinements. Each is a comparative the backend's ParseRefinement reads
 *  against the live session, so tapping "Shorter" edits the previous ask. */
export const REFINE_CHIPS = ["Shorter", "Darker", "Lighter", "More emotional", "Less weird", "No romance"] as const;

export function useLibrarySearch() {
  const [query, setQuery] = React.useState("");
  const [searchType, setSearchType] = React.useState<SearchType>("Books");
  const [bookResults, setBookResults] = React.useState<BookSearchResult[]>([]);
  const [userResults, setUserResults] = React.useState<UserSearchResult[]>([]);
  const [vibeResults, setVibeResults] = React.useState<VibeSearchItem[]>([]);
  const [vibePersonalised, setVibePersonalised] = React.useState(false);
  // Conversational search: the backend hands back a session id so the next
  // query ("shorter") is read as a refinement of this one, and a one-line
  // summary of what it understood so the reader can see the accumulated ask.
  const sessionRef = React.useRef<string | null>(null);
  const [understood, setUnderstood] = React.useState<string>("");
  const [refined, setRefined] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const resetQuery = React.useCallback(() => {
    setQuery("");
    setBookResults([]);
    setUserResults([]);
    setVibeResults([]);
    setVibePersonalised(false);
    setSearchError(null);
  }, []);

  const onSearchTypeChange = React.useCallback((type: SearchType) => {
    setSearchType(type);
    resetQuery();
  }, [resetQuery]);

  React.useEffect(() => {
    if (!query.trim()) {
      setBookResults([]);
      setUserResults([]);
      setVibeResults([]);
      setVibePersonalised(false);
      setSearchError(null);
      return;
    }

    // A fresh vibe ask needs a few words; a refinement of a live session
    // ("shorter", "darker") is one word by design and must go through.
    const minLen = searchType === "Vibe" && sessionRef.current ? 3 : 10;
    if (searchType === "Vibe" && query.trim().length < minLen) {
      setVibeResults([]);
      setSearchError(null);
      return;
    }

    const debounceMs = searchType === "Vibe" ? 600 : 300;
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      // Emitted after the debounce, so one event means one query the reader
      // actually settled on rather than one per keystroke. `search_performed`
      // and `vibe_search_performed` are separated because they are different
      // products: one is lookup, one is discovery, and mixing them would hide
      // whichever is the smaller.
      track(searchType === "Vibe" ? "vibe_search_performed" : "search_performed", {
        query_length: query.trim().length,
        search_type: searchType,
      });

      try {
        if (searchType === "Books") {
          const response = await fetch(
            `/api/books/search?q=${encodeURIComponent(query)}&maxResults=10&forceFresh=true`
          );
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              (errorData as { error?: string }).error ||
                `Failed to search books (${response.status})`
            );
          }
          const result = (await response.json()) as SearchResponse;
          if ("items" in result && result.items && Array.isArray(result.items)) {
            setBookResults(
              result.items.map((item) => ({
                id: item.id,
                title: item.volumeInfo?.title || "Unknown Title",
                authors: item.volumeInfo?.authors || [],
                description: item.volumeInfo?.description || "",
                imageLinks: item.volumeInfo?.imageLinks || {},
              }))
            );
          } else if ("books" in result && result.books && Array.isArray(result.books)) {
            setBookResults(
              result.books
                .map((item) => ({
                  id: item._id?.toString() || item.id || "",
                  title: item.volumeInfo?.title || item.title || "Unknown Title",
                  authors: item.volumeInfo?.authors || item.authors || [],
                  description: item.volumeInfo?.description || item.description || "",
                  imageLinks: item.volumeInfo?.imageLinks || item.imageLinks || {},
                }))
                .filter((b) => b.id !== "")
            );
          } else {
            setBookResults([]);
          }
          setUserResults([]);
        } else if (searchType === "User") {
          const response = await fetch(
            `/api/users/search?q=${encodeURIComponent(query)}&limit=10`
          );
          if (!response.ok) throw new Error(`Failed to search users (${response.status})`);
          const result = (await response.json()) as UserSearchResponse;
          setUserResults(result.users && Array.isArray(result.users) ? result.users : []);
          setBookResults([]);
        } else {
          let anonId: string | undefined;
          try {
            anonId = window.localStorage.getItem("pb_anon_id") ?? undefined;
          } catch {
            // private mode: the session will just not persist across searches
          }
          const vibeResponse = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: query.trim(),
              limit: 10,
              session_id: sessionRef.current ?? undefined,
              anon_id: anonId,
            }),
          });
          if (!vibeResponse.ok) {
            throw new Error(`Search unavailable (${vibeResponse.status})`);
          }
          const vibeData = await vibeResponse.json();
          if (typeof vibeData?.sessionId === "string") sessionRef.current = vibeData.sessionId;
          setUnderstood(typeof vibeData?.understood === "string" ? vibeData.understood : "");
          setRefined(!!vibeData?.refined);
          if (vibeData?.items && Array.isArray(vibeData.items)) {
            setVibeResults(
              vibeData.items.map(
                (item: {
                  id: string;
                  volumeInfo?: {
                    title?: string;
                    authors?: string[];
                    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
                  };
                  matchReason?: string;
                }) => ({
                  id: item.id,
                  title: item.volumeInfo?.title || "Unknown Title",
                  authors: item.volumeInfo?.authors || [],
                  imageLinks: item.volumeInfo?.imageLinks || {},
                  matchReason: item.matchReason,
                })
              )
            );
            setVibePersonalised(!!vibeData.personalised);
          } else {
            setVibeResults([]);
          }
          setBookResults([]);
          setUserResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchError(
          error instanceof Error ? error.message : `Failed to search ${searchType.toLowerCase()}`
        );
        setBookResults([]);
        setUserResults([]);
        setVibeResults([]);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, searchType]);

  const currentResults =
    searchType === "Books" ? bookResults : searchType === "Vibe" ? vibeResults : userResults;

  return {
    query,
    setQuery,
    searchType,
    setSearchType: onSearchTypeChange,
    bookResults,
    userResults,
    vibeResults,
    vibePersonalised,
    understood,
    refined,
    isSearching,
    searchError,
    setSearchError,
    currentResults,
    resetQuery,
    vibePrompts: VIBE_PROMPTS,
  };
}
