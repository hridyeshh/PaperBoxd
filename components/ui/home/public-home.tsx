"use client";

import React, { useEffect, useState, useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import { Hero } from "@/components/ui/home/hero";
import { Timeline } from "@/components/ui/timeline";
import { Footerdemo } from "@/components/ui/footer-section";
import SphereImageGrid, { ImageData } from "@/components/ui/img-sphere";

const timelineData = [
  {
    title: "Personalized Recommendations",
    content: (
      <div>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Discover your next favorite book with our intelligent recommendation engine. 
          PaperBoxd learns from your reading preferences, ratings, and activity to suggest 
          books tailored specifically to your taste.
        </p>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Our algorithm considers your favorite genres, authors, and reading patterns to 
          provide recommendations that match your unique interests. Whether you're into 
          sci-fi, romance, or non-fiction, we'll help you find books you'll love.
        </p>
        <p className="text-foreground text-sm md:text-base font-normal">
          Get recommendations based on books similar to ones you've enjoyed, authors you 
          follow, and what your friends are reading. The more you use PaperBoxd, the 
          smarter your recommendations become.
        </p>
      </div>
    ),
  },
  {
    title: "Track Your Reading Journey",
    content: (
      <div>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Build a comprehensive digital bookshelf that reflects your reading journey. 
          Save books you've read, rate them, and add personal notes about your thoughts 
          and feelings. Keep track of when you finished each book and how you experienced it.
        </p>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Organize your collection with custom reading lists. Create lists for different 
          moods, genres, or goals. Whether it's "Books to Read This Summer" or "Favorite 
          Sci-Fi Novels," you can curate collections that tell your story as a reader.
        </p>
        <p className="text-foreground text-sm md:text-base font-normal">
          Set reading goals and track your progress throughout the year. See your reading 
          statistics, including total books read, pages completed, and your most-read 
          genres. Celebrate your reading achievements and stay motivated to read more.
        </p>
      </div>
    ),
  },
  {
    title: "Social & Community",
    content: (
      <div>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Connect with fellow book lovers and discover what your friends are reading. 
          Follow other readers, see their book collections, and get inspired by their 
          reading choices. Share your favorite books and get recommendations from people 
          with similar tastes.
        </p>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Engage with the community through likes, comments, and sharing. See what books 
          are trending among your network and discover hidden gems recommended by trusted 
          readers. Build your reading community and share your passion for books.
        </p>
        <p className="text-foreground text-sm md:text-base font-normal">
          Create a beautiful profile that showcases your reading personality. Customize 
          your profile with your favorite books, reading lists, and personal bio. Let 
          others see what makes you unique as a reader and find people who share your 
          literary interests.
        </p>
      </div>
    ),
  },
  {
    title: "Smart Lists & Organization",
    content: (
      <div>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Organize your reading life with powerful list management. Create custom reading 
          lists for any purpose - from "Want to Read" to "Books That Changed My Life." 
          Add books to multiple lists and keep everything organized exactly how you want.
        </p>
        <p className="text-foreground text-base md:text-lg lg:text-xl font-normal mb-4">
          Use our built-in collections like "Currently Reading," "Want to Read," and 
          "Favorites" to quickly organize your books. Mark books with moods, formats, 
          and personal tags to make them easy to find later.
        </p>
        <p className="text-foreground text-sm md:text-base font-normal">
          Share your lists with friends or keep them private. Follow other users' lists 
          to get curated book recommendations. Whether you're planning your next reading 
          challenge or organizing your all-time favorites, PaperBoxd makes it easy.
        </p>
      </div>
    ),
  },
];

export function PublicHome() {
  const [sphereBooks, setSphereBooks] = useState<ImageData[]>([]);
  const [isLoadingSphere, setIsLoadingSphere] = useState(true);
  const timelineRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);

  // Fetch sphere books on mount
  useEffect(() => {
    const fetchSphereBooks = async () => {
      try {
        const response = await fetch('/api/books/sphere?limit=80');
        if (response.ok) {
          const data = await response.json();
          setSphereBooks(data.books || []);
        }
      } catch (error) {
        console.error('Error fetching sphere books:', error);
      } finally {
        setIsLoadingSphere(false);
      }
    };

    fetchSphereBooks();
  }, []);

  // Scroll detection for sphere zoom animation
  // Trigger when timeline ends and user scrolls to sphere section
  const { scrollYProgress } = useScroll({
    target: sphereRef,
    offset: ["start end", "center center"],
  });

  // Transform scroll progress to scale and opacity for zoom effect
  // Starts small and zooms in as user scrolls
  const sphereScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 0.8, 1]);
  const sphereOpacity = useTransform(scrollYProgress, [0, 0.3, 1], [0, 0.5, 1]);

  return (
    <div className="w-full">
      {/* Hero Section - Centered (Hero component handles its own centering) */}
      <Hero />

      {/* Timeline Section - Below Hero */}
      <div ref={timelineRef}>
        <Timeline data={timelineData} />
      </div>

      {/* Sphere Section - Appears after timeline with zoom effect */}
      <div 
        ref={sphereRef}
        className="w-full min-h-screen flex items-center justify-center py-20 px-4"
      >
        <motion.div
          style={{
            scale: sphereScale,
            opacity: sphereOpacity,
          }}
          className="flex flex-col items-center justify-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-center">
            Explore Our Collection
          </h2>
          <p className="text-muted-foreground text-lg mb-12 text-center max-w-2xl">
            Discover books from every genre - from fiction to manga, comics to non-fiction. 
            Drag to rotate and explore our diverse library.
          </p>
          {isLoadingSphere ? (
            <div className="w-[700px] h-[700px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading books...</div>
            </div>
          ) : (
            <SphereImageGrid
              images={sphereBooks}
              containerSize={700}
              sphereRadius={300}
              dragSensitivity={0.8}
              momentumDecay={0.96}
              maxRotationSpeed={6}
              baseImageScale={0.12}
              hoverScale={1.3}
              perspective={1200}
              autoRotate={true}
              autoRotateSpeed={0.2}
            />
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <Footerdemo />
    </div>
  );
}

