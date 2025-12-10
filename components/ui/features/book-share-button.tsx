"use client";

import * as React from "react";
import { Share2, Loader2 } from "lucide-react";
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

export interface BookShareButtonProps extends BookShareCardProps {
  className?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function BookShareButton({
  title,
  author,
  coverUrl,
  username,
  className,
  buttonVariant = "default",
  size = "default",
}: BookShareButtonProps) {
  const [isSharing, setIsSharing] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Wait for image to load before allowing capture
  React.useEffect(() => {
    if (coverUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        // Still allow capture even if image fails
        setImageLoaded(true);
      };
      img.src = coverUrl;
    } else {
      setImageLoaded(true);
    }
  }, [coverUrl]);

  const handleShare = async () => {
    if (!cardRef.current) {
      toast.error("Failed to generate share card");
      return;
    }

    setIsSharing(true);
    try {
      const cardElement = cardRef.current.querySelector(
        '[data-variant="instagram"]'
      ) as HTMLElement;

      if (!cardElement) {
        toast.error("Card element not found");
        return;
      }

      // Wait for all images to load completely
      const images = cardElement.querySelectorAll('img');
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete && img.naturalHeight !== 0) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve(null); // Timeout after 10 seconds
          }, 10000);
          
          img.onload = () => {
            clearTimeout(timeout);
            // Double check the image is actually loaded
            if (img.complete && img.naturalHeight !== 0) {
              resolve(null);
            } else {
              // Wait a bit more
              setTimeout(() => resolve(null), 500);
            }
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            resolve(null); // Continue even if image fails
          };
        });
      });

      await Promise.all(imagePromises);
      
      // Additional wait to ensure everything is fully rendered
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate blob with CORS support
      const blob = await toBlob(cardElement, {
        pixelRatio: 2,
        quality: 1,
        backgroundColor: "#000000",
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
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>Share to Instagram Stories</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 overflow-auto">
            {/* Preview - Centered */}
            <div className="flex justify-center items-center flex-1 min-h-0">
              <div className="border-4 border-border rounded-xl p-6 bg-black shadow-2xl">
                <div 
                  className="scale-[0.3] origin-center" 
                  style={{ transformOrigin: "center center" }}
                >
                  <div data-variant="instagram">
                    <BookShareCard
                      title={title}
                      author={author}
                      coverUrl={coverUrl}
                      username={username}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Share button - Directly below card */}
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleShare}
                disabled={isSharing || !imageLoaded}
                size="lg"
                className="min-w-[240px]"
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
        <div data-variant="instagram">
          <BookShareCard
            title={title}
            author={author}
            coverUrl={coverUrl}
            username={username}
          />
        </div>
      </div>
    </>
  );
}
