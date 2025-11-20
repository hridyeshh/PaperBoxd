"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";

interface Genre {
  id: string;
  name: string;
  description: string;
}

interface OnboardingQuestionnaireProps {
  onComplete?: () => void;
}

export function OnboardingQuestionnaire({ onComplete }: OnboardingQuestionnaireProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = React.useState<"genres" | "authors">("genres");
  const [genres, setGenres] = React.useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = React.useState<string[]>([]);
  const [favoriteAuthors, setFavoriteAuthors] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fetchingGenres, setFetchingGenres] = React.useState(true);

  // Fetch genres on mount
  React.useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch("/api/onboarding");
        if (response.ok) {
          const data = await response.json();
          setGenres(data.genres || []);
        } else {
          // Fallback to hardcoded genres if API fails
          const fallbackGenres = [
            { id: 'fiction', name: 'Fiction', description: 'Literary and contemporary fiction' },
            { id: 'mystery', name: 'Mystery', description: 'Detective stories and whodunits' },
            { id: 'thriller', name: 'Thriller', description: 'Suspenseful page-turners' },
            { id: 'romance', name: 'Romance', description: 'Love stories and relationships' },
            { id: 'science-fiction', name: 'Science Fiction', description: 'Futuristic and speculative' },
            { id: 'fantasy', name: 'Fantasy', description: 'Magic and mythical worlds' },
            { id: 'horror', name: 'Horror', description: 'Scary and supernatural' },
            { id: 'historical', name: 'Historical Fiction', description: 'Stories set in the past' },
            { id: 'biography', name: 'Biography', description: 'True stories of real people' },
            { id: 'self-help', name: 'Self-Help', description: 'Personal development' },
            { id: 'business', name: 'Business', description: 'Business and economics' },
            { id: 'non-fiction', name: 'Non-Fiction', description: 'True stories and factual' },
            { id: 'young-adult', name: 'Young Adult', description: 'Books for teens and young adults' },
            { id: 'classics', name: 'Classics', description: 'Timeless literary works' },
            { id: 'poetry', name: 'Poetry', description: 'Verse and poetic works' },
          ];
          setGenres(fallbackGenres);
        }
      } catch (error) {
        console.error("Failed to fetch genres:", error);
        // Use fallback genres
        const fallbackGenres = [
          { id: 'fiction', name: 'Fiction', description: 'Literary and contemporary fiction' },
          { id: 'mystery', name: 'Mystery', description: 'Detective stories and whodunits' },
          { id: 'thriller', name: 'Thriller', description: 'Suspenseful page-turners' },
          { id: 'romance', name: 'Romance', description: 'Love stories and relationships' },
          { id: 'science-fiction', name: 'Science Fiction', description: 'Futuristic and speculative' },
          { id: 'fantasy', name: 'Fantasy', description: 'Magic and mythical worlds' },
          { id: 'horror', name: 'Horror', description: 'Scary and supernatural' },
          { id: 'historical', name: 'Historical Fiction', description: 'Stories set in the past' },
          { id: 'biography', name: 'Biography', description: 'True stories of real people' },
          { id: 'self-help', name: 'Self-Help', description: 'Personal development' },
          { id: 'business', name: 'Business', description: 'Business and economics' },
          { id: 'non-fiction', name: 'Non-Fiction', description: 'True stories and factual' },
          { id: 'young-adult', name: 'Young Adult', description: 'Books for teens and young adults' },
          { id: 'classics', name: 'Classics', description: 'Timeless literary works' },
          { id: 'poetry', name: 'Poetry', description: 'Verse and poetic works' },
        ];
        setGenres(fallbackGenres);
      } finally {
        setFetchingGenres(false);
      }
    };

    fetchGenres();
  }, []);

  const handleGenreToggle = (genreId: string) => {
    if (selectedGenres.includes(genreId)) {
      setSelectedGenres(selectedGenres.filter((id) => id !== genreId));
    } else {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  };

  const handleContinueFromGenres = () => {
    if (selectedGenres.length === 0) {
      toast.error("Please select at least one genre");
      return;
    }
    setStep("authors");
  };

  const handleSubmit = async () => {
    if (selectedGenres.length === 0) {
      toast.error("Please select at least one genre");
      return;
    }

    setLoading(true);

    try {
      const authors = favoriteAuthors
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const genreNames = selectedGenres.map(
        (id) => genres.find((g) => g.id === id)?.name || id
      );

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genres: genreNames,
          authors,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      toast.success("Preferences saved! Let's find you some great books.");
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingGenres) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "w-full mx-auto",
        isMobile ? "max-w-[95vw]" : "max-w-2xl"
      )}
    >
      <div className={cn(
        "rounded-xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-sm",
        isMobile ? "p-4" : "p-8"
      )}>
        {/* Header */}
        <div className={cn("text-center", isMobile ? "mb-6" : "mb-8")}>
          <div className={cn(
            "inline-flex items-center justify-center rounded-full bg-primary/10",
            isMobile ? "w-12 h-12 mb-3" : "w-16 h-16 mb-4"
          )}>
            {step === "genres" ? (
              <BookOpen className={cn("text-primary", isMobile ? "w-6 h-6" : "w-8 h-8")} />
            ) : (
              <Sparkles className={cn("text-primary", isMobile ? "w-6 h-6" : "w-8 h-8")} />
            )}
          </div>
          <h2 className={cn("font-bold mb-2", isMobile ? "text-xl" : "text-2xl")}>
            {step === "genres" ? "What genres do you love?" : "Who are your favorite authors?"}
          </h2>
          <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
            {step === "genres"
              ? "Select at least one genre to help us recommend books you'll enjoy"
              : "Tell us about authors you love (optional, you can add more later)"}
          </p>
        </div>

        {/* Progress indicator */}
        <div className={cn(isMobile ? "mb-4" : "mb-6")}>
          <div className="flex items-center justify-center gap-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                step === "genres" ? (isMobile ? "w-10 bg-primary" : "w-12 bg-primary") : (isMobile ? "w-5 bg-primary/50" : "w-6 bg-primary/50")
              )}
            />
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                step === "authors" ? (isMobile ? "w-10 bg-primary" : "w-12 bg-primary") : (isMobile ? "w-5 bg-muted" : "w-6 bg-muted")
              )}
            />
          </div>
        </div>

        {/* Genres Step */}
        {step === "genres" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(isMobile ? "space-y-4" : "space-y-6")}
          >
            <div className={cn(
              "grid gap-2 overflow-y-auto pr-2",
              isMobile ? "grid-cols-2 max-h-[300px]" : "grid-cols-2 md:grid-cols-3 max-h-[400px]"
            )}>
              {genres.map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleGenreToggle(genre.id)}
                    className={cn(
                      "relative rounded-lg border-2 text-left transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background",
                      isMobile ? "p-3" : "p-4"
                    )}
                  >
                    {isSelected && (
                      <div className={cn("absolute", isMobile ? "top-1.5 right-1.5" : "top-2 right-2")}>
                        <Check className={cn("text-primary", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                      </div>
                    )}
                    <div className={cn("font-semibold mb-1", isMobile ? "text-xs" : "text-sm")}>{genre.name}</div>
                    <div className={cn("text-muted-foreground", isMobile ? "text-[10px] leading-tight" : "text-xs")}>{genre.description}</div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleContinueFromGenres}
              className="w-full"
              disabled={selectedGenres.length === 0}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Authors Step */}
        {step === "authors" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(isMobile ? "space-y-4" : "space-y-6")}
          >
            <div className="space-y-2">
              <Label htmlFor="authors" className={cn(isMobile ? "text-sm" : "")}>
                Favorite Authors (Optional)
              </Label>
              <Input
                id="authors"
                placeholder="e.g., J.K. Rowling, Stephen King, Jane Austen"
                value={favoriteAuthors}
                onChange={(e) => setFavoriteAuthors(e.target.value)}
                className="w-full"
              />
              <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                Separate multiple authors with commas. You can skip this and add them later.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("genres")}
                className="flex-1"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

