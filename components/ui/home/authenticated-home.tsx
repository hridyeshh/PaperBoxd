"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { BookCarouselBook } from "@/components/ui/home/book-carousel";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { PinterestGrid } from "@/components/ui/home/pinterest-grid";
import { useIsMobile } from "@/hooks/use-media-query";

interface CarouselData {
  title: string;
  subtitle: string;
  type: "recommended" | "favorites" | "authors" | "genres" | "continue-reading" | "friends";
}

const carousels: CarouselData[] = [
  {
    title: "Recommended for You",
    subtitle: "Personalized picks based on your reading taste",
    type: "recommended",
  },
  {
    title: "Your Friends Are Liking These",
    subtitle: "Books your friends are enjoying",
    type: "friends",
  },
  {
    title: "Based on Your Favorites",
    subtitle: "Books similar to ones you love",
    type: "favorites",
  },
  {
    title: "From Your Favorite Authors",
    subtitle: "New releases and classics from authors you've read",
    type: "authors",
  },
  {
    title: "Trending in Your Genres",
    subtitle: "What's hot in genres you enjoy",
    type: "genres",
  },
  {
    title: "Continue Reading",
    subtitle: "Pick up where you left off",
    type: "continue-reading",
  },
];

export function AuthenticatedHome() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [carouselData, setCarouselData] = useState<Record<string, BookCarouselBook[]>>({});
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = React.useRef(false);
  
  // For desktop Pinterest grid: combine all books from all carousels
  const [allBooks, setAllBooks] = useState<BookCarouselBook[]>([]);
  const [displayedBooks, setDisplayedBooks] = useState<BookCarouselBook[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Pull-to-refresh state for mobile
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = React.useRef(0);
  const pullStartY = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    // Background fetch function (doesn't show loading state)
    const fetchCarouselsInBackground = async () => {
      try {
        const data: Record<string, BookCarouselBook[]> = {};

        const promises = carousels.map(async (carousel) => {
          try {
            const response = await fetch(
              `/api/books/personalized?type=${carousel.type}&limit=20`
            );
            if (response.ok) {
              const result = await response.json();
              data[carousel.type] = result.books || [];
            }
          } catch (error) {
            console.error(`Error fetching ${carousel.type} in background:`, error);
          }
        });

        await Promise.all(promises);
        
        // Update cache silently
        if (typeof window !== 'undefined' && Object.keys(data).length > 0) {
          localStorage.setItem('home_carousel_data_v2', JSON.stringify(data));
          localStorage.setItem('home_carousel_timestamp_v2', Date.now().toString());
          // Update state if component is still mounted
          setCarouselData(data);
        }
      } catch (error) {
        console.error("Error in background fetch:", error);
      }
    };

    // Check if this is an explicit page refresh (user pressed refresh button)
    const isExplicitRefresh = typeof window !== 'undefined' && 
      (performance.navigation?.type === 1 || 
       (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload');

    // Check if we have cached data in localStorage (persists across sessions)
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem('home_carousel_data_v2') : null;
    const cachedTimestamp = typeof window !== 'undefined' ? localStorage.getItem('home_carousel_timestamp_v2') : null;
    
    // Use cached data only on non-refresh navigations and only if fresh (5 min)
    if (!isExplicitRefresh && cachedData && cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp);
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      if (age < CACHE_DURATION) {
        try {
          const parsed = JSON.parse(cachedData);
          setCarouselData(parsed);
          setLoading(false);
          hasLoadedRef.current = true;
          return;
        } catch {
          // parsing failed — fall through to fetch
        }
      }
    }

    // Only fetch if we haven't loaded yet
    if (hasLoadedRef.current) {
      setLoading(false);
      return;
    }

    const fetchCarousels = async () => {
      try {
        setLoading(true);
        const data: Record<string, BookCarouselBook[]> = {};

        const promises = carousels.map(async (carousel) => {
          try {
            const response = await fetch(
              `/api/books/personalized?type=${carousel.type}&limit=20`
            );
            if (!response.ok) throw new Error(`Failed to fetch ${carousel.type}`);
            const result = await response.json();
            data[carousel.type] = result.books || [];
          } catch (error) {
            console.error(`Error fetching ${carousel.type}:`, error);
            data[carousel.type] = [];
          }
        });

        await Promise.all(promises);
        setCarouselData(data);

        if (typeof window !== 'undefined') {
          localStorage.setItem('home_carousel_data_v2', JSON.stringify(data));
          localStorage.setItem('home_carousel_timestamp_v2', Date.now().toString());
        }

        setLoading(false);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error("Error in fetchCarousels:", error);
        setLoading(false);
        hasLoadedRef.current = true;
      }
    };

    fetchCarousels().catch((error) => {
      console.error("Unhandled error in fetchCarousels:", error);
    });
  }, [isAuthenticated]);

  // Combine all books for Pinterest grid (both desktop and mobile)
  React.useEffect(() => {
    if (Object.keys(carouselData).length === 0) return;
    
    const combined: BookCarouselBook[] = [];
    carousels.forEach((carousel) => {
      const books = carouselData[carousel.type] || [];
      combined.push(...books);
    });
    // Remove duplicates based on book ID, then shuffle for variety on each load
    const uniqueBooks = Array.from(
      new Map(combined.map(book => [book.id || Math.random().toString(), book])).values()
    );
    for (let i = uniqueBooks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueBooks[i], uniqueBooks[j]] = [uniqueBooks[j], uniqueBooks[i]];
    }
    setAllBooks(uniqueBooks);
    setDisplayedBooks(uniqueBooks);
  }, [carouselData, isMobile]);

  const [hasMoreData, setHasMoreData] = useState(true);
  // Tracks the last server page fetched from the onboarding endless-feed endpoint.
  // The initial carousel loads don't use this, so we start at 0.
  const onboardingPageRef = React.useRef(0);
  // Skip the onboarding phase entirely — it overlaps too heavily with the initial
  // carousel pool. Go straight to ISBNdb for scroll, starting from a random page
  // offset so every session scrolls through a different set of books.
  const emptyStreakRef = React.useRef(2); // pre-trip the onboarding drain threshold
  const useIsbndbRef = React.useRef(true); // start on ISBNdb immediately
  const isbndbPageRef = React.useRef(Math.floor(Math.random() * 50)); // random start
  // Consecutive empty ISBNdb responses. Only stop the feed after several misses
  // so a single slow genre-page can't terminate "worldwide" scrolling.
  const isbndbEmptyStreakRef = React.useRef(0);

  // Load more books for the Pinterest grid.
  // Strategy:
  //  1. Drain the onboarding endless-feed endpoint (DB-backed, tier 1/2/3).
  //  2. After 2 consecutive empty onboarding pages, flip to /api/books/from-isbndb
  //     which pulls fresh books from ISBNdb worldwide and persists them.
  //  3. Only give up after several empty ISBNdb pages in a row.
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMoreData) return;
    setIsLoadingMore(true);

    try {
      const existingBookIds = new Set<string>();
      allBooks.forEach((b) => { if (b.id) existingBookIds.add(b.id); });

      if (!useIsbndbRef.current) {
        const nextServerPage = onboardingPageRef.current + 1;
        const response = await fetch(
          `/api/books/personalized?type=onboarding&page=${nextServerPage}&limit=60`
        );
        if (response.ok) {
          const result = await response.json() as { books?: BookCarouselBook[]; hasMore?: boolean };
          const fetched = result.books || [];
          const newBooks = fetched.filter((b) => b.id && !existingBookIds.has(b.id));

          if (newBooks.length > 0) {
            const combined = [...allBooks, ...newBooks];
            setAllBooks(combined);
            setDisplayedBooks(combined);
            onboardingPageRef.current = nextServerPage;
            emptyStreakRef.current = 0;
            return;
          }

          onboardingPageRef.current = nextServerPage;
          emptyStreakRef.current += 1;
          if (emptyStreakRef.current < 2) {
            return;
          }
          // 2 empties in a row → DB pool is drained, flip to ISBNdb.
          useIsbndbRef.current = true;
        } else {
          // Treat HTTP error as a miss and flip immediately to the fallback.
          useIsbndbRef.current = true;
        }
      }

      const nextIsbndbPage = isbndbPageRef.current + 1;
      const isbndbResp = await fetch(
        `/api/books/from-isbndb?page=${nextIsbndbPage}&limit=20`
      );
      if (!isbndbResp.ok) {
        isbndbEmptyStreakRef.current += 1;
        isbndbPageRef.current = nextIsbndbPage;
        if (isbndbEmptyStreakRef.current >= 5) {
          setHasMoreData(false);
        }
        return;
      }

      const isbndbResult = await isbndbResp.json() as { books?: BookCarouselBook[] };
      const isbndbFetched = isbndbResult.books || [];
      const isbndbNewBooks = isbndbFetched.filter(
        (b) => b.id && !existingBookIds.has(b.id)
      );

      if (isbndbNewBooks.length > 0) {
        const combined = [...allBooks, ...isbndbNewBooks];
        setAllBooks(combined);
        setDisplayedBooks(combined);
        isbndbPageRef.current = nextIsbndbPage;
        isbndbEmptyStreakRef.current = 0;
      } else {
        isbndbPageRef.current = nextIsbndbPage;
        isbndbEmptyStreakRef.current += 1;
        if (isbndbEmptyStreakRef.current >= 5) {
          setHasMoreData(false);
        }
      }
    } catch {
      setHasMoreData(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [allBooks, isLoadingMore, hasMoreData]);

  const hasMore = hasMoreData;

  // Pull-to-refresh handler for mobile
  React.useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;
    let isPulling = false;

    const handleStart = (clientY: number) => {
      // Only allow pull-to-refresh when at the top of the page
      if (window.scrollY === 0) {
        startY = clientY;
        pullStartY.current = clientY;
        isPulling = true;
      }
    };

    const handleMove = (clientY: number, preventDefault?: () => void) => {
      if (!isPulling || window.scrollY > 0) {
        isPulling = false;
        return;
      }

      currentY = clientY;
      const distance = Math.max(0, currentY - startY);
      
      // Only allow pull if scrolling down from the top
      if (distance > 0 && window.scrollY === 0) {
        if (preventDefault) preventDefault();
        const cappedDistance = Math.min(distance, 100); // Cap at 100px
        pullDistanceRef.current = cappedDistance;
        setPullDistance(cappedDistance);
      } else {
        isPulling = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleEnd = async () => {
      if (!isPulling) return;
      
      isPulling = false;
      const finalDistance = pullDistanceRef.current;
      
      // If pulled enough (60px), trigger refresh
      if (finalDistance >= 60) {
        setIsRefreshing(true);
        setPullDistance(0);
        
        // Clear cache and reload
        if (typeof window !== 'undefined') {
          localStorage.removeItem('home_carousel_data_v2');
          localStorage.removeItem('home_carousel_timestamp_v2');
        }
        
        hasLoadedRef.current = false;
        
        // Fetch fresh data
        try {
          const data: Record<string, BookCarouselBook[]> = {};
          
          const promises = carousels.map(async (carousel) => {
            try {
              const response = await fetch(
                `/api/books/personalized?type=${carousel.type}&limit=20`
              );
              if (response.ok) {
                const result = await response.json();
                data[carousel.type] = result.books || [];
              }
            } catch (error) {
              console.error(`Error fetching ${carousel.type}:`, error);
              data[carousel.type] = [];
            }
          });

          await Promise.all(promises);
          setCarouselData(data);
          
          // Cache new data
          if (typeof window !== 'undefined') {
            localStorage.setItem('home_carousel_data_v2', JSON.stringify(data));
            localStorage.setItem('home_carousel_timestamp_v2', Date.now().toString());
          }
        } catch (error) {
          console.error("Error refreshing:", error);
        } finally {
          setIsRefreshing(false);
          hasLoadedRef.current = true;
        }
      } else {
        // Spring back
        setPullDistance(0);
      }
      
      pullStartY.current = null;
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientY, () => e.preventDefault());
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    // Mouse events for testing in dev tools
    const handleMouseDown = (e: MouseEvent) => {
      if (window.scrollY === 0) {
        handleStart(e.clientY);
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPulling) {
        handleMove(e.clientY, () => e.preventDefault());
      }
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    // Also support mouse events for testing
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMobile]);

  // Show loading state only if we're actually loading and don't have data yet
  if (loading && !hasLoadedRef.current && Object.keys(carouselData).length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center min-h-screen pb-8">
          <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" ref={containerRef}>
      {/* Pull-to-refresh indicator for mobile */}
      {isMobile && (
        <div 
          className="fixed top-16 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-200"
          style={{ 
            opacity: pullDistance > 10 || isRefreshing ? Math.min(1, Math.max(0.3, pullDistance / 60)) : 0
          }}
        >
          <div className="mt-4">
            {isRefreshing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Refreshing...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full transition-transform"
                  style={{ 
                    transform: `rotate(${Math.min(180, (pullDistance / 60) * 180)}deg)`,
                    opacity: pullDistance > 10 ? Math.min(1, pullDistance / 60) : 0
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {pullDistance >= 60 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pinterest Grid - Endless Feed */}
      <div className="w-full px-8 md:px-12 lg:px-16 xl:px-20 pb-16 pt-8">
        <PinterestGrid
          books={displayedBooks.map(book => ({
            id: book.id || '',
            title: book.title || 'Unknown Title',
            authors: book.author ? [book.author] : [],
            description: '',
            publishedDate: '',
            cover: book.cover || '',
          }))}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoading={isLoadingMore}
            />
      </div>

    </div>
  );
}

