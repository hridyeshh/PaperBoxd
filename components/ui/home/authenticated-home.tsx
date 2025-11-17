"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BookCarousel, BookCarouselBook } from "@/components/ui/home/book-carousel";
import { Hero } from "@/components/ui/home/hero";
import TetrisLoading from "@/components/ui/tetris-loader";
import { Footerdemo } from "@/components/ui/footer-section";

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
  const [carouselData, setCarouselData] = useState<Record<string, BookCarouselBook[]>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    // Only fetch if we haven't loaded yet
    if (hasLoadedRef.current) {
      setLoading(false);
      return;
    }

    const fetchCarousels = async () => {
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
    };

    fetchCarousels();
  }, [session?.user]);

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
    <div className="w-full">
      {/* Hero Section - Centered (Hero component handles its own centering) */}
      <Hero showButton={false} />

      {/* Personalized Book Carousels - Below Hero */}
      <div className="container mx-auto px-4 pb-16 space-y-12">
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

      {/* Footer */}
      <Footerdemo />
    </div>
  );
}

