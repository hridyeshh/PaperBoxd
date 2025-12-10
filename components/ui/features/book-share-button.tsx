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
  children?: React.ReactNode;
  asCustomButton?: boolean;
}

export function BookShareButton({
  title,
  author,
  coverUrl,
  username,
  className,
  buttonVariant = "default",
  size = "default",
  children,
  asCustomButton = false,
}: BookShareButtonProps) {
  const [isSharing, setIsSharing] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imgDataUrl, setImgDataUrl] = React.useState<string | null>(null);

  // Wait for image to load before allowing capture
  // Use proxy URL to avoid CORS issues
  React.useEffect(() => {
    if (coverUrl) {
      setImageLoaded(false);
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(coverUrl)}`;

      fetch(proxyUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              setImgDataUrl(reader.result as string);
              setImageLoaded(true);
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error("Failed to load image via proxy", err);
          // Fallback to original URL if proxy fails, though likelihood of capture failure is high
          setImageLoaded(true);
        });
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
        width: 1600, // Explicitly set width matching component
        height: 1200, // Explicitly set height matching component
        // Force visibility in the clone
        style: {
          display: "block",
          visibility: "visible",
          opacity: "1",
          transform: "none", // Ensure no transforms affect the clone
        },
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
          {asCustomButton && children ? (
            <div onClick={() => setShowDialog(true)} className={className}>
              {children}
            </div>
          ) : (
            <Button
              variant={buttonVariant}
              size={size}
              className={className}
              onClick={() => setShowDialog(true)}
            >
              {children || (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </>
              )}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[95vh] overflow-hidden p-0 flex flex-col bg-black sm:bg-background">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border sm:border-border border-white/10 sm:border-border">
            <DialogTitle className="text-base sm:text-lg text-white sm:text-foreground">Share to Instagram Stories</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 gap-4 sm:gap-6 overflow-auto bg-black sm:bg-transparent">
            {/* Preview - Centered and Responsive */}
            <div className="flex justify-center items-center flex-1 min-h-0 w-full">
              <div className="border-2 sm:border-4 border-transparent sm:border-border rounded-lg sm:rounded-xl p-2 sm:p-4 bg-black shadow-2xl overflow-hidden flex items-center justify-center">
                <div
                  className="scale-[0.15] sm:scale-[0.2] md:scale-[0.25] lg:scale-[0.3] origin-center"
                  style={{ transformOrigin: "center center" }}
                >
                  <div data-variant="instagram">
                    <BookShareCard
                      title={title}
                      author={author}
                      coverUrl={imgDataUrl || coverUrl}
                      username={username}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Share button - Directly below card, responsive */}
            <div className="flex justify-center pt-2 w-full px-4">
              <Button
                onClick={handleShare}
                disabled={isSharing || !imageLoaded}
                size="lg"
                className="min-w-[180px] sm:min-w-[240px] w-full sm:w-auto text-sm sm:text-base bg-white text-black hover:bg-white/90 sm:bg-primary sm:text-primary-foreground sm:hover:bg-primary/90"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                    <span className="sm:hidden">Generating</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Share to Instagram Stories</span>
                    <span className="sm:hidden">Share Stories</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden container for capture - off-screen but full size */}
      <div
        ref={cardRef}
        className="fixed top-0 left-[100vw] pointer-events-none opacity-0"
        aria-hidden="true"
      >
        <div data-variant="instagram">
          <BookShareCard
            title={title}
            author={author}
            coverUrl={imgDataUrl || coverUrl}
            username={username}
          />
        </div>
      </div>
    </>
  );
}
