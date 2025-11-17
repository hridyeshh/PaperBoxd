"use client";

import React, { useEffect, useState } from "react";
import { BookCarousel, BookCarouselBook } from "@/components/ui/home/book-carousel";
import { Hero } from "@/components/ui/home/hero";
import TetrisLoading from "@/components/ui/tetris-loader";
import { Footerdemo } from "@/components/ui/footer-section";

interface CarouselData {
  title: string;
  subtitle: string;
  type: "newly-published" | "popular" | "trending";
}

const carousels: CarouselData[] = [
  {
    title: "Newly Published This Week",
    subtitle: "Fresh releases you won't want to miss",
    type: "newly-published",
  },
  {
    title: "People Love These",
    subtitle: "Most popular books on PaperBoxd",
    type: "popular",
  },
  {
    title: "Trending Now",
    subtitle: "What everyone is reading right now",
    type: "trending",
  },
];

export function PublicHome() {
  const [carouselData, setCarouselData] = useState<Record<string, BookCarouselBook[]>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
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
            `/api/books/public?type=${carousel.type}&limit=20`
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
  }, []);

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
      <Hero />

      {/* Book Carousels - Below Hero */}
      <div className="container mx-auto px-4 pb-16 space-y-12">
        {carousels.map((carousel) => {
          const books = carouselData[carousel.type] || [];
          if (books.length === 0 && !errors[carousel.type]) {
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

