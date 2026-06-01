"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HomeLayoutHeader } from "@/components/ui/layout/home-layout-header";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  Command,
  CommandInput,
  CommandList,
} from "@/components/ui/primitives/command";
import { SearchIcon, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MobileSearchWithFeed,
  SearchResultsBody,
} from "@/components/ui/search/mobile-search-with-feed";
import { useLibrarySearch } from "@/components/ui/search/use-library-search";

export default function SearchPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (isMobile) {
    return <MobileSearchWithFeed />;
  }

  return <DesktopSearchPage router={router} />;
}

function DesktopSearchPage({ router }: { router: ReturnType<typeof useRouter> }) {
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
    vibePrompts,
  } = useLibrarySearch();

  return (
    <div className="flex min-h-screen flex-col">
      <HomeLayoutHeader />
      <main className="mt-16 flex-1 pb-16">
        <div className="mx-auto w-full max-w-xl px-4 py-4">
          <Command
            className={cn(
              "overflow-hidden rounded-xl border bg-background",
              "[&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:p-0 [&_[cmdk-input-wrapper]]:flex-1",
              "[&_[cmdk-input-wrapper]_svg]:hidden"
            )}
            shouldFilter={false}
          >
            <div
              className={cn(
                "px-4 pt-4 pb-3.5 transition-colors duration-200",
                searchType === "Vibe" && "bg-amber-500/[0.025] dark:bg-amber-500/[0.04]"
              )}
            >
              <div className="flex items-center gap-2.5">
                {searchType === "Vibe" ? (
                  <Wand2 className="size-4 shrink-0 text-amber-500/60" />
                ) : (
                  <SearchIcon className="size-4 shrink-0 text-muted-foreground/60" />
                )}
                <CommandInput
                  className="h-9 w-full bg-transparent text-base placeholder:text-muted-foreground/60"
                  placeholder={
                    searchType === "User"
                      ? "Search readers..."
                      : searchType === "Vibe"
                        ? "Describe a mood, theme, or feeling..."
                        : "Search books & authors..."
                  }
                  value={query}
                  onValueChange={(value) => {
                    setQuery(value);
                    if (searchError) setSearchError(null);
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-1">
                {(["Books", "User", "Vibe"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSearchType(type)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150",
                      searchType === type
                        ? type === "Vibe"
                          ? "bg-amber-500/12 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400"
                          : "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
            </div>

            <div className="h-px bg-border" />

            <CommandList className="scrollbar-hide max-h-[calc(100vh-260px)] min-h-[320px] overflow-y-auto">
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
      </main>
    </div>
  );
}
