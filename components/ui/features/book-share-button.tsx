"use client";

import * as React from "react";
import { Share2, Loader2, Instagram } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/primitives/dialog";

// We DO NOT import BookShareCard here. 
// We use the API image for everything to ensure 100% consistency.

export interface BookShareButtonProps {
  title: string;
  author?: string;
  coverUrl?: string;
  username?: string;
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
  const [isImageLoading, setIsImageLoading] = React.useState(true);

  // 1. Construct the API URL. This is the "Source of Truth" for the image.
  const shareImageUrl = `/api/og/share?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author || '')}&cover=${encodeURIComponent(coverUrl || '')}&username=${encodeURIComponent(username || '')}`;

  // Reset loading state when dialog opens
  React.useEffect(() => {
    if (showDialog) {
      setIsImageLoading(true);
    }
  }, [showDialog]);

  const handleShare = async () => {
    setIsSharing(true);
    const toastId = toast.loading("Downloading high-quality card...");

    try {
      // 2. Fetch the generated image from Vercel
      const response = await fetch(shareImageUrl);
      if (!response.ok) throw new Error("Generation failed");
      const blob = await response.blob();

      // 3. Create file for Instagram
      const file = new File([blob], "paperboxd-story.png", { type: "image/png" });

      // 4. Share or Download
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Check out ${title}`,
        });
        toast.success("Opened Share Sheet!", { id: toastId });
        setShowDialog(false);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `paperboxd-story.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Image downloaded!", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to share", { id: toastId });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        {asCustomButton && children ? (
          <div onClick={() => setShowDialog(true)} className={className}>{children}</div>
        ) : (
          <Button variant={buttonVariant} size={size} className={className} onClick={() => setShowDialog(true)}>
            {children || <><Share2 className="h-4 w-4 mr-2" /> Share</>}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-white/10 bg-zinc-900/50 absolute top-0 w-full z-10 backdrop-blur-md">
          <DialogTitle className="text-white">Instagram Preview</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col items-center justify-center bg-black pt-16 pb-24 relative w-full h-full">
          {/* LIVE PREVIEW 
              We display the ACTUAL image the server generated. 
              If this looks good, the share will look identical.
          */}
          <div className="relative h-full w-full flex items-center justify-center p-4">
            {/* Loading Spinner - shown while image is loading */}
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                <Loader2 className="h-12 w-12 text-white animate-spin" />
              </div>
            )}
            
            {/* Image - hidden until loaded */}
            <img 
              src={shareImageUrl} 
              alt="Story Preview" 
              className={`max-h-full max-w-full object-contain shadow-2xl rounded-lg transition-opacity duration-300 ${
                isImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ aspectRatio: '9/16' }}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          </div>

          <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black via-black to-transparent">
            <Button
              onClick={handleShare}
              disabled={isSharing}
              size="lg"
              className="w-full bg-white hover:bg-white/90 text-black font-bold h-14 rounded-full text-lg shadow-lg"
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
  );
}