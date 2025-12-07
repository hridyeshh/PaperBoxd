"use client";

import * as React from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toBlob } from "html-to-image";
import { Button } from "@/components/ui/primitives/button";
import { BookShareCard, BookShareCardProps } from "./book-share-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/primitives/dialog";

export interface BookShareButtonProps extends Omit<BookShareCardProps, "variant"> {
  className?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  cardVariant?: "aura" | "critic" | "polaroid";
}

export function BookShareButton({
  title,
  author,
  coverUrl,
  rating,
  pageCount,
  cardVariant = "aura",
  className,
  buttonVariant = "default",
  size = "default",
}: BookShareButtonProps) {
  const [isSharing, setIsSharing] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [selectedVariant, setSelectedVariant] = React.useState<
    "aura" | "critic" | "polaroid"
  >(cardVariant || "aura");
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Wait for image to load before allowing capture
  React.useEffect(() => {
    if (coverUrl && cardRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageLoaded(true); // Allow capture even if image fails
      };
      img.src = coverUrl;
    } else {
      setImageLoaded(true);
    }
  }, [coverUrl]);

  const handleShare = async (variant: "aura" | "critic" | "polaroid") => {
    if (!cardRef.current) {
      toast.error("Failed to generate share card");
      return;
    }

    setIsSharing(true);
    try {
      // Find the card element for the selected variant
      const cardElement = cardRef.current.querySelector(
        `[data-variant="${variant}"]`
      ) as HTMLElement;

      if (!cardElement) {
        toast.error("Card element not found");
        return;
      }

      // Wait a bit more to ensure everything is rendered
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate blob
      const blob = await toBlob(cardElement, {
        pixelRatio: 2,
        quality: 1,
        backgroundColor: variant === "aura" ? "#000000" : variant === "critic" ? "#18181b" : "#f5f1e8",
        cacheBust: true,
      });

      if (!blob) {
        toast.error("Failed to generate image");
        return;
      }

      // Create file from blob
      const file = new File([blob], `${title}-share.png`, {
        type: "image/png",
      });

      // Try Web Share API (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Check out ${title}`,
            text: `I'm reading ${title}${author ? ` by ${author}` : ""} on Paperboxd!`,
          });
          toast.success("Shared successfully!");
          setShowDialog(false);
        } catch (err) {
          // User cancelled or error - fall through to download
          if ((err as Error).name !== "AbortError") {
            console.error("Share error:", err);
          }
          // Fall through to download
          downloadImage(blob);
        }
      } else {
        // Fallback to download (desktop)
        downloadImage(blob);
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}-share.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Image downloaded!");
    setShowDialog(false);
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button
            variant={buttonVariant}
            size={size}
            className={className}
            onClick={() => setShowDialog(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Book Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Variant selector */}
            <div className="flex gap-3 justify-center">
              {(["aura", "critic", "polaroid"] as const).map((variant) => (
                <Button
                  key={variant}
                  variant={selectedVariant === variant ? "default" : "outline"}
                  onClick={() => setSelectedVariant(variant)}
                  className="capitalize"
                >
                  {variant}
                </Button>
              ))}
            </div>

            {/* Preview */}
            <div className="flex justify-center overflow-auto max-h-[60vh]">
              <div className="border-2 border-border rounded-lg p-4 bg-muted/50">
                <div className="scale-[0.35] origin-top-left" style={{ transformOrigin: "top left" }}>
                  <div data-variant={selectedVariant}>
                    <BookShareCard
                      title={title}
                      author={author}
                      coverUrl={coverUrl}
                      rating={rating}
                      pageCount={pageCount}
                      variant={selectedVariant}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Share button */}
            <div className="flex justify-center">
              <Button
                onClick={() => handleShare(selectedVariant)}
                disabled={isSharing || !imageLoaded}
                size="lg"
                className="min-w-[200px]"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share to Instagram Stories
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden container for capture - off-screen */}
      <div
        ref={cardRef}
        className="fixed -left-[9999px] -top-[9999px] pointer-events-none"
        aria-hidden="true"
      >
        {(["aura", "critic", "polaroid"] as const).map((variant) => (
          <div key={variant} data-variant={variant}>
            <BookShareCard
              title={title}
              author={author}
              coverUrl={coverUrl}
              rating={rating}
              pageCount={pageCount}
              variant={variant}
            />
          </div>
        ))}
      </div>
    </>
  );
}
