"use client";

import * as React from "react";
import { Share2, Loader2, Instagram } from "lucide-react";
import { toast } from "sonner";
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

  // State to hold the final Base64 string for preview
  const [imgDataUrl, setImgDataUrl] = React.useState<string | null>(null);
  const [isPreparing, setIsPreparing] = React.useState(true);

  // Pre-load the image as Base64 for preview only
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
    // Fetch via our proxy for preview
    fetch(`/api/image-proxy?url=${encodeURIComponent(coverUrl)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Proxy failed");
        const text = await res.text();
        setImgDataUrl(text);
      })
      .catch((err) => {
        console.error("Image load failed", err);
        setImgDataUrl(coverUrl);
      })
      .finally(() => {
        setIsPreparing(false);
      });
  }, [coverUrl]);

  const handleShare = async () => {
    setIsSharing(true);
    const toastId = toast.loading("Generating high-quality image...");

    try {
      // 1. Construct the API URL
      const params = new URLSearchParams({
        title: title,
        author: author || '',
        cover: coverUrl || '', // Pass the ORIGINAL url, the server will fetch it
        username: username || '',
      });
      
      // 2. Fetch the generated PNG from Vercel
      const response = await fetch(`/api/og/share?${params.toString()}`);
      if (!response.ok) throw new Error("Generation failed");
      
      const blob = await response.blob();

      // 3. Create File for Sharing
      const file = new File([blob], "story.png", { type: "image/png" });

      // 4. Share
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Reading ${title}`,
        });
        toast.success("Opened Instagram!", { id: toastId });
        setShowDialog(false);
      } else {
        // Fallback Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `paperboxd-story.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Downloaded!", { id: toastId });
        setShowDialog(false);
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to generate image", { id: toastId });
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

        <DialogContent className="max-w-[95vw] h-[90vh] overflow-hidden p-0 flex flex-col bg-zinc-950 border-zinc-800 [&>button]:text-white [&>button]:hover:text-white [&>button]:opacity-100 [&>button]:hover:opacity-80">
          <DialogHeader className="px-6 py-4 border-b border-white/10 bg-zinc-900/50">
            <DialogTitle className="text-white">Preview Story</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6 bg-black">

            {/* PREVIEW CONTAINER */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
              {/* Wrapper that establishes the "physical" size of the scaled element 
                  1080 * 0.2 = 216px
                  1920 * 0.2 = 384px
              */}
              <div
                className="relative"
                style={{ width: '216px', height: '384px' }}
              >
                <div
                  className="origin-top-left shadow-2xl border border-white/10 rounded-lg overflow-hidden"
                  style={{
                    transform: "scale(0.20)",
                    width: "1080px",
                    height: "1920px",
                    display: "flex", // Keep this to ensure internal layout works
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
            </div>

            <div className="w-full px-6 pb-6">
              <Button
                onClick={handleShare}
                // Disable button until the Base64 image is actually ready
                disabled={isSharing || isPreparing}
                size="lg"
                className="w-full bg-white hover:bg-white/90 text-black font-bold h-14 rounded-full text-lg border border-black/20 disabled:opacity-50"
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

    </>
  );
}
