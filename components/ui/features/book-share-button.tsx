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

  // State to hold the final Base64 string
  const [imgDataUrl, setImgDataUrl] = React.useState<string | null>(null);
  const [isPreparing, setIsPreparing] = React.useState(true);

  // 1. Pre-load the image as Base64 immediately
  React.useEffect(() => {
    if (!coverUrl) {
      setIsPreparing(false);
      return;
    }

    // If already data URL, just use it
    if (coverUrl.startsWith('data:')) {
      setImgDataUrl(coverUrl);
      setIsPreparing(false);
      return;
    }

    setIsPreparing(true);
    // Fetch via our proxy
    fetch(`/api/image-proxy?url=${encodeURIComponent(coverUrl)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Proxy failed");
        const text = await res.text();
        setImgDataUrl(text); // This is the massive Base64 string
      })
      .catch((err) => {
        console.error("Image load failed", err);
        // Fallback to original URL so at least something shows (might have CORS issues)
        setImgDataUrl(coverUrl);
      })
      .finally(() => {
        setIsPreparing(false);
      });
  }, [coverUrl]);

  const handleShare = async () => {
    if (!cardRef.current) {
      toast.error("Capture element missing");
      return;
    }

    setIsSharing(true);
    // Longer timeout toast because mobile capture can be slow
    const toastId = toast.loading("Generating Story...");

    try {
      const cardElement = cardRef.current.querySelector(
        '[data-variant="instagram"]'
      ) as HTMLElement;

      if (!cardElement) throw new Error("Element not found");

      // 2. WAIT for the image to be fully rendered in the hidden DOM
      // Even though we have the base64 string, the <img> tag needs a split second to paint it
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 3. Generate Image with SAFARI-SAFE settings
      const blob = await toBlob(cardElement, {
        width: 1080,
        height: 1920,
        // CRITICAL FIXES FOR MOBILE:
        skipFonts: true, // Prevents CORS errors on custom fonts
        skipAutoScale: true, // Prevents weird scaling on retina screens
        pixelRatio: 1, // Keep it at 1.0. 1080p is already high res enough. High ratio crashes mobile memory.
        cacheBust: true,
      });

      if (!blob) throw new Error("Failed to generate image blob");

      // 4. Create File
      const file = new File([blob], "paperboxd-story.png", { type: "image/png" });

      // 5. Share
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Reading ${title}`,
        });
        toast.success("Opened Instagram!", { id: toastId });
        setShowDialog(false);
      } else {
        // Desktop Fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `paperboxd-${title.slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Image downloaded!", { id: toastId });
        setShowDialog(false);
      }

    } catch (error) {
      console.error("Share error:", error);
      toast.error("Could not generate image. Try screenshotting instead.", { id: toastId });
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

        <DialogContent className="max-w-[95vw] h-[90vh] overflow-hidden p-0 flex flex-col bg-zinc-950 border-zinc-800">
          <DialogHeader className="px-6 py-4 border-b border-white/10 bg-zinc-900/50">
            <DialogTitle className="text-white">Preview Story</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6 bg-black">

            {/* PREVIEW CONTAINER */}
            <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
              <div
                className="origin-center shadow-2xl border border-white/10 rounded-lg overflow-hidden"
                style={{
                  transform: "scale(0.20)",
                  width: "1080px",
                  height: "1920px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {/* Visual Preview (Visible to user) */}
                <BookShareCard
                  title={title}
                  author={author}
                  // Pass the fetched base64 if ready, otherwise fallback
                  coverUrl={imgDataUrl || coverUrl}
                  username={username}
                />
              </div>
            </div>

            <div className="w-full px-6 pb-6">
              <Button
                onClick={handleShare}
                // Disable button until the Base64 image is actually ready
                disabled={isSharing || isPreparing}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold h-14 rounded-full text-lg shadow-lg shadow-purple-900/20 disabled:opacity-50"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : isPreparing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading Cover...
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
          This is what html-to-image actually photographs.
          We conditionally render it ONLY when we have data to prevent capturing blank/loading states.
      */}
      {showDialog && (
        <div
          ref={cardRef}
          className="fixed top-0 left-[-2000px] z-[-1]"
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
      )}
    </>
  );
}
