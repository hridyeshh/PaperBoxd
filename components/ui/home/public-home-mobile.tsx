"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Auth } from "@/components/ui/auth/auth-form-1";
import SphereImageGrid, { ImageData } from "@/components/ui/img-sphere";
import { Footerdemo } from "@/components/ui/features/footer-section";

export function PublicHomeMobile() {
  const [titleNumber, setTitleNumber] = useState(0);
  const [sphereBooks, setSphereBooks] = useState<ImageData[]>([]);
  const [isLoadingSphere, setIsLoadingSphere] = useState(true);
  const [containerSize, setContainerSize] = useState(300);
  const titles = useMemo(
    () => [
      "Save the books you've read", 
      "Like the book",
      "Follow your friends",
      "Get book recommendations", 
      "Share your lists",
      "Show off your taste", 
      "Share your collection"],
    [],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  // Set responsive container size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateSize = () => {
        setContainerSize(window.innerWidth >= 640 ? 400 : 300);
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

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

    fetchSphereBooks().catch((error) => {
      console.error('Unhandled error in fetchSphereBooks:', error);
      setIsLoadingSphere(false);
    });
  }, []);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1">
        {/* Hero Section - Mobile optimized */}
        <div className="w-full">
          <div className="container mx-auto">
            <div className="flex gap-8 py-12 md:py-20 items-center justify-center flex-col px-4">
              <div className="flex gap-4 flex-col">
                <h1 className="text-3xl md:text-5xl max-w-2xl tracking-tighter text-center font-regular">
                  <span 
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-9xl text-spektr-cyan-50 block text-center" 
                    style={{ fontFamily: '"brooklyn-heritage-script", serif' }}
                  >
                    PaperBoxd
                  </span>
                  <span className="relative flex w-full justify-center overflow-hidden text-center pb-4 pt-1 min-h-[60px] sm:min-h-[80px]">
                    {titles.map((title, index) => (
                      <motion.span
                        key={index}
                        className="absolute text-2xl sm:text-3xl md:text-4xl top-4 sm:top-6 font-semibold"
                        initial={{ opacity: 0, y: "-100" }}
                        transition={{ type: "spring", stiffness: 50 }}
                        animate={
                          titleNumber === index
                            ? {
                                y: 0,
                                opacity: 1,
                              }
                            : {
                                y: titleNumber > index ? -150 : 150,
                                opacity: 0,
                              }
                        }
                      >
                        {title}
                      </motion.span>
                    ))}
                  </span>
                </h1>

                <p 
                  className="text-base sm:text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center"
                  style={{ fontFamily: '"joc", sans-serif' }}
                >
                  Create lists, share books, add favourites, and much more on PaperBoxd.
                </p>
              </div>
              <div className="w-full max-w-sm">
                <Auth />
              </div>
            </div>
          </div>
        </div>

        {/* Sphere Section - Mobile responsive */}
        <div className="w-full flex items-center justify-center py-12 px-4">
          <div className="flex flex-col items-center justify-center w-full max-w-sm">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 text-center">
              All the books, all in one place.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-8 text-center max-w-xs">
              Discover books from every genre - from fiction to manga, comics to non-fiction. 
              Drag to rotate and explore our diverse library.
            </p>
            {isLoadingSphere ? (
              <div 
                className="flex items-center justify-center"
                style={{ width: containerSize, height: containerSize }}
              >
                <div className="text-muted-foreground">Loading books...</div>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <SphereImageGrid
                  images={sphereBooks}
                  containerSize={containerSize}
                  sphereRadius={containerSize * 0.5}
                  dragSensitivity={0.8}
                  momentumDecay={0.96}
                  maxRotationSpeed={6}
                  baseImageScale={0.12}
                  hoverScale={1.3}
                  perspective={1200}
                  autoRotate={true}
                  autoRotateSpeed={0.2}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Sticks to bottom */}
      <Footerdemo />
    </div>
  );
}

