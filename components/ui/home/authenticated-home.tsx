"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BookCarouselBook } from "@/components/ui/home/book-carousel";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { Footerdemo } from "@/components/ui/features/footer-section";
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
  const { data: session } = useSession();
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
    if (!session?.user) {
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
          localStorage.setItem('home_carousel_data', JSON.stringify(data));
          localStorage.setItem('home_carousel_timestamp', Date.now().toString());
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
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem('home_carousel_data') : null;
    const cachedTimestamp = typeof window !== 'undefined' ? localStorage.getItem('home_carousel_timestamp') : null;
    
    // Use cached data if it exists and:
    // 1. Not an explicit refresh, OR
    // 2. Cache is less than 30 minutes old (even on refresh, use cache if fresh)
    if (cachedData && cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp);
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
      
      if (!isExplicitRefresh || age < CACHE_DURATION) {
        try {
          const parsed = JSON.parse(cachedData);
          setCarouselData(parsed);
          setLoading(false);
          hasLoadedRef.current = true;
          
          // If cache is old but we're using it, refresh in background
          if (age >= CACHE_DURATION) {
            // Fetch fresh data in background without showing loading
            fetchCarouselsInBackground();
          }
          return;
        } catch {
          // If parsing fails, continue to fetch
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

      // Fetch all carousels in parallel
      const promises = carousels.map(async (carousel) => {
        try {
          const response = await fetch(
            `/api/books/personalized?type=${carousel.type}&limit=20`
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch ${carousel.type}`);
          }
          const result = await response.json();
          data[carousel.type] = result.books || [];
        } catch (error) {
          console.error(`Error fetching ${carousel.type}:`, error);
          data[carousel.type] = [];
        }
      });

      await Promise.all(promises);
      setCarouselData(data);
      
      // Cache data in localStorage (persists across sessions)
      if (typeof window !== 'undefined') {
        localStorage.setItem('home_carousel_data', JSON.stringify(data));
        localStorage.setItem('home_carousel_timestamp', Date.now().toString());
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
  }, [session?.user]);

  // Combine all books for Pinterest grid (both desktop and mobile)
  React.useEffect(() => {
    if (Object.keys(carouselData).length === 0) return;
    
    const combined: BookCarouselBook[] = [];
    carousels.forEach((carousel) => {
      const books = carouselData[carousel.type] || [];
      combined.push(...books);
    });
        // Remove duplicates based on book ID
        const uniqueBooks = Array.from(
          new Map(combined.map(book => [book.id || Math.random().toString(), book])).values()
        );
    setAllBooks(uniqueBooks);
    setDisplayedBooks(uniqueBooks);
    // Initialize offsets
    const initialOffsets: Record<string, number> = {};
    carousels.forEach((carousel) => {
      initialOffsets[carousel.type] = (carouselData[carousel.type] || []).length;
    });
    setCarouselOffsets(initialOffsets);
  }, [carouselData, isMobile]);

  // Track which carousels we've fetched and their offsets
  const [carouselOffsets, setCarouselOffsets] = useState<Record<string, number>>({});
  const [hasMoreData, setHasMoreData] = useState(true);

  // Load more books for Pinterest grid - fetch more from API
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMoreData) {
      console.log('[LoadMore] Skipping - isLoadingMore:', isLoadingMore, 'hasMoreData:', hasMoreData);
      return;
    }
    
    console.log('[LoadMore] Starting to load more books...');
    setIsLoadingMore(true);
    try {
      const data: Record<string, BookCarouselBook[]> = {};
      const newOffsets = { ...carouselOffsets };
      
      // Create a set of existing book IDs for quick lookup
      const existingBookIds = new Set<string>();
      allBooks.forEach(book => {
        if (book.id) existingBookIds.add(book.id);
      });
      
      // Fetch more books from each carousel type with increased limits
      const promises = carousels.map(async (carousel) => {
        const currentCount = (carouselData[carousel.type] || []).length;
        const newLimit = currentCount + 40; // Fetch 40 more each time
        
        try {
          const response = await fetch(
            `/api/books/personalized?type=${carousel.type}&limit=${newLimit}`
          );
          if (response.ok) {
            const result = await response.json();
            const fetchedBooks = result.books || [];
            
            // Since API returns books from the beginning, slice to get only new books
            // Take books starting from the count we already have
            const newBooks = fetchedBooks.slice(currentCount);
            
            // Also filter out any duplicates that might exist across carousels
            const trulyNewBooks = newBooks.filter((book: BookCarouselBook) => {
              return book.id && !existingBookIds.has(book.id);
            });
            
            // If we got new books, add them to the data
            if (trulyNewBooks.length > 0) {
              // Merge with existing books for this carousel type
              const existingCarouselBooks = carouselData[carousel.type] || [];
              data[carousel.type] = [...existingCarouselBooks, ...trulyNewBooks];
              newOffsets[carousel.type] = newLimit;
              console.log(`[LoadMore] ${carousel.type}: Got ${trulyNewBooks.length} new books (requested ${newLimit}, had ${currentCount})`);
            } else {
              // No new books, keep existing data
              data[carousel.type] = carouselData[carousel.type] || [];
              console.log(`[LoadMore] ${carousel.type}: No new books found`);
            }
            
            // Check if we got fewer books than requested (no more data)
            if (fetchedBooks.length < newLimit && trulyNewBooks.length === 0) {
              console.log(`[LoadMore] ${carousel.type}: Carousel exhausted (got ${fetchedBooks.length}, requested ${newLimit})`);
            }
          }
        } catch (error) {
          console.error(`Error fetching more ${carousel.type}:`, error);
          // Keep existing data on error
          data[carousel.type] = carouselData[carousel.type] || [];
        }
      });

      await Promise.all(promises);
      
      // Track how many new books we found across all carousels
      let totalNewBooks = 0;
      
      // Combine all books from all carousels, tracking new ones
      const combined: BookCarouselBook[] = [];
      carousels.forEach((carousel) => {
        const books = data[carousel.type] || [];
        const existingCarouselBooks = carouselData[carousel.type] || [];
        const existingIds = new Set(existingCarouselBooks.map(b => b.id));
        
        // Count new books for this carousel
        const newBooksInCarousel = books.filter(b => b.id && !existingIds.has(b.id));
        totalNewBooks += newBooksInCarousel.length;
        
        combined.push(...books);
      });
      
      // Remove duplicates based on book ID
      const bookMap = new Map<string, BookCarouselBook>();
      combined.forEach(book => {
        const key = book.id || Math.random().toString();
        if (!bookMap.has(key)) {
          bookMap.set(key, book);
        }
      });
      const uniqueBooks = Array.from(bookMap.values());
      
      // Check if we got any new books
      console.log('[LoadMore] Total new books found:', totalNewBooks, 'Unique books:', uniqueBooks.length, 'All books:', allBooks.length);
      
      if (totalNewBooks > 0 || uniqueBooks.length > allBooks.length) {
        console.log('[LoadMore] Adding new books to display');
        setAllBooks(uniqueBooks);
        setDisplayedBooks(uniqueBooks);
        setCarouselData(data); // Update carousel data with new books
        setCarouselOffsets(newOffsets);
        // Keep hasMoreData as true to allow more loading
      } else {
        console.log('[LoadMore] No new books found');
        // No new books found, check if we should stop trying
        // If all carousels returned the same number of books as we already had, likely exhausted
        const allCarouselsExhausted = carousels.every(carousel => {
          const books = data[carousel.type] || [];
          const existingBooks = carouselData[carousel.type] || [];
          // If we got the same or fewer books than we already had, likely exhausted
          return books.length <= existingBooks.length;
        });
        
        if (allCarouselsExhausted) {
          setHasMoreData(false);
        }
      }
    } catch (error) {
      console.error("Error loading more books:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [allBooks, carouselOffsets, carouselData, isLoadingMore, hasMoreData]);

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
          localStorage.removeItem('home_carousel_data');
          localStorage.removeItem('home_carousel_timestamp');
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
            localStorage.setItem('home_carousel_data', JSON.stringify(data));
            localStorage.setItem('home_carousel_timestamp', Date.now().toString());
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
            cover: book.cover || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80',
          }))}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoading={isLoadingMore}
            />
      </div>

      {/* Footer */}
      <Footerdemo />
    </div>
  );
}

