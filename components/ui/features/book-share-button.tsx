"use client";

import * as React from "react";
import { Share2, Loader2, Instagram } from "lucide-react";
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

  // Pre-fetch the Base64 image
  React.useEffect(() => {
    if (coverUrl) {
      setImageLoaded(false);
      // If it's already a data URL, good to go
      if (coverUrl.startsWith('data:')) {
        setImgDataUrl(coverUrl);
        setImageLoaded(true);
        return;
      }

      // Fetch via proxy
      fetch(`/api/image-proxy?url=${encodeURIComponent(coverUrl)}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch proxy");
          return res.text();
        })
        .then(dataUrl => {
          setImgDataUrl(dataUrl);
          setImageLoaded(true);
        })
        .catch(err => {
          console.error("Failed to load image via proxy", err);
          setImageLoaded(true); // Allow sharing even if image fails (shows No Cover)
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
    const toastId = toast.loading("Preparing for Instagram...");

    try {
      const cardElement = cardRef.current.querySelector(
        '[data-variant="instagram"]'
      ) as HTMLElement;

      if (!cardElement) {
        throw new Error("Card element not found");
      }

      // 1. Wait for the image to exist in the DOM
      // Since we are using Base64, it renders fast, but we double check.
      const images = cardElement.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // proceed anyway
          });
        })
      );

      // 2. Small delay to ensure layout is stable
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Generate Image
      const blob = await toBlob(cardElement, {
        pixelRatio: 1.5, // 1.5 is enough for 1080p, keeps file size manageable
        quality: 0.9,
        // MATCH THE COMPONENT DIMENSIONS EXACTLY
        width: 1080,
        height: 1920,
      });

      if (!blob) throw new Error("Failed to generate blob");

      // 4. Create File
      const file = new File([blob], "paperboxd-story.png", { type: "image/png" });

      // 5. Share
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Check out ${title}`,
        });
        toast.success("Opened Instagram!", { id: toastId });
        setShowDialog(false);
      } else {
        // Fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `paperboxd-story.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Image downloaded!", { id: toastId });
        setShowDialog(false);
      }

    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to share", { id: toastId });
    } finally {
      setIsSharing(false);
    }
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
        
        <DialogContent className="max-w-[95vw] h-[90vh] overflow-hidden p-0 flex flex-col bg-black border-zinc-800 [&>button]:text-white [&>button]:hover:text-white [&>button]:opacity-100 [&>button]:hover:opacity-80">
          <DialogHeader className="px-6 py-4 border-b border-white/10 bg-zinc-900/50">
            <DialogTitle className="text-white">Preview Story</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6 bg-zinc-950 overflow-auto">
            
            {/* Preview Container - Scaled Down */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-0 overflow-visible">
              <div 
                className="relative"
                style={{ 
                  // Scale to fit: 1080px * 0.18 = ~194px wide, fits mobile screens
                  transform: "scale(0.18)",
                  transformOrigin: "center center",
                  width: "1080px",
                  height: "1920px",
                }}
              >
                {/* We render a "Visible" version just for preview */}
                <BookShareCard
                  title={title}
                  author={author}
                  coverUrl={imgDataUrl || coverUrl}
                  username={username}
                />
              </div>
            </div>

            <div className="w-full px-6 pb-6">
              <Button
                onClick={handleShare}
                disabled={isSharing || !imageLoaded}
                size="lg"
                className="w-full bg-black hover:bg-black/90 text-white font-bold h-14 rounded-full text-lg border border-white/20"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Instagram className="h-5 w-5 mr-2" />
                    Share to Instagram
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HIDDEN CAPTURE CONTAINER 
        Must be visible to DOM but hidden from user. 
        'fixed left-[200vw]' pushes it off-screen without hiding it from html-to-image.
      */}
      <div
        ref={cardRef}
        className="fixed top-0 left-[200vw]" 
        style={{ width: '1080px', height: '1920px' }}
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
