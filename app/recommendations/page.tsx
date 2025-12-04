"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookCarousel, BookCarouselBook } from "@/components/ui/home/book-carousel";
import { Header } from "@/components/ui/layout/header-with-search";
import { DesktopSidebar } from "@/components/ui/layout/desktop-sidebar";
import { MinimalDesktopHeader } from "@/components/ui/layout/minimal-desktop-header";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
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

export default function RecommendationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [carouselData, setCarouselData] = useState<Record<string, BookCarouselBook[]>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      router.push("/auth");
      return;
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
        const errs: Record<string, string> = {};

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
            errs[carousel.type] = error instanceof Error ? error.message : "Unknown error";
            data[carousel.type] = [];
          }
        });

        await Promise.all(promises);
        setCarouselData(data);
        setErrors(errs);
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
  }, [session?.user, status, router]);

  // Show loading state
  if (status === "loading" || loading) {
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
            <TetrisLoading size="md" speed="fast" loadingText="Loading recommendations..." />
          </div>
        </div>
      </main>
    );
  }

  // Redirect if not authenticated
  if (!session?.user) {
    return null;
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
          "flex-1",
          isMobile ? "mt-16" : "mt-16 ml-16"
        )}>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
            <div className="space-y-10">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Recommendations
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Personalized picks based on your reading taste, books your friends are enjoying, and more.
                </p>
              </div>

              {/* Personalized Book Carousels */}
              <div className="w-full space-y-12">
                {carousels.map((carousel) => {
                  const books = carouselData[carousel.type] || [];
                  
                  // For friends carousel, only show if we have at least 5 books
                  if (carousel.type === "friends" && books.length < 5) {
                    return null; // Don't show friends carousel if less than 5 books
                  }
                  
                  // Show carousel even if empty for "continue-reading" (user might not have any)
                  // But hide others if empty
                  if (books.length === 0 && carousel.type !== "continue-reading" && !errors[carousel.type]) {
                    return null; // Don't show empty carousels
                  }
                  
                  return (
                    <BookCarousel
                      key={carousel.type}
                      title={carousel.title}
                      subtitle={carousel.subtitle}
                      books={books}
                    />
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      </div>
    </main>
  );
}

