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
    console.log('[Share] Starting share process');
    setIsSharing(true);
    const toastId = toast.loading("Generating high-quality image...");

    try {
      // 1. Construct the API URL
      console.log('[Share] Constructing params:', { title, author, coverUrl, username });
      const params = new URLSearchParams({
        title: title,
        author: author || '',
        cover: coverUrl || '', // Pass the ORIGINAL url, the server will fetch it
        username: username || '',
      });
      
      const apiUrl = `/api/og/share?${params.toString()}`;
      const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${apiUrl}` : apiUrl;
      console.log('[Share] API URL:', apiUrl);
      console.log('[Share] Full URL:', fullUrl);
      
      // 2. Fetch the generated PNG from Vercel with retry logic
      let blob: Blob | null = null;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          console.log(`[Share] Fetch attempt ${retries + 1}/${maxRetries}`);
          console.log('[Share] Full URL:', window.location.origin + apiUrl);
          
          const response = await fetch(apiUrl, {
            cache: 'no-store', // Prevent caching issues
            method: 'GET',
            headers: {
              'Accept': 'image/png',
            },
          }).catch((fetchError) => {
            console.error('[Share] Fetch error details:', {
              message: fetchError.message,
              name: fetchError.name,
              stack: fetchError.stack,
            });
            throw fetchError;
          });
          
          console.log('[Share] Response status:', response.status, response.statusText);
          console.log('[Share] Response headers:', {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length'),
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unable to read error');
            console.error('[Share] Response error:', errorText);
            throw new Error(`Generation failed: ${response.status} - ${errorText}`);
          }
          
          const fetchedBlob = await response.blob();
          console.log('[Share] Blob received:', {
            size: fetchedBlob.size,
            type: fetchedBlob.type,
          });

          // Verify blob is valid and has content
          if (fetchedBlob && fetchedBlob.size > 0) {
            blob = fetchedBlob;
            console.log('[Share] Blob validated successfully');
            break; // Success, exit retry loop
          } else {
            console.error('[Share] Empty or invalid blob:', {
              size: fetchedBlob?.size,
              type: fetchedBlob?.type,
            });
            throw new Error("Empty blob received");
          }
        } catch (error) {
          console.error(`[Share] Fetch attempt ${retries + 1} failed:`, error);
          console.error(`[Share] Error details:`, {
            name: (error as Error)?.name,
            message: (error as Error)?.message,
            cause: (error as Error)?.cause,
            stack: (error as Error)?.stack,
          });
          retries++;
          if (retries >= maxRetries) {
            console.error('[Share] Max retries reached, throwing error');
            throw error;
          }
          // Wait before retry (exponential backoff)
          const waitTime = 500 * retries;
          console.log(`[Share] Waiting ${waitTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      if (!blob || blob.size === 0) {
        console.error('[Share] Final blob validation failed:', {
          blobExists: !!blob,
          blobSize: blob?.size,
        });
        throw new Error("Failed to generate valid image");
      }

      // 3. Small delay to ensure blob is fully ready
      console.log('[Share] Waiting 100ms for blob to be ready');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 4. Create File for Sharing (blob is guaranteed to be non-null after the check above)
      const file = new File([blob!], "story.png", { type: "image/png" });
      console.log('[Share] File created:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // 5. Verify file is shareable
      console.log('[Share] Checking share capabilities:', {
        hasNavigatorShare: !!navigator.share,
        hasCanShare: !!navigator.canShare,
      });

      if (!navigator.share) {
        console.error('[Share] Web Share API not supported');
        throw new Error("Web Share API not supported");
      }

      const canShareResult = navigator.canShare?.({ files: [file] });
      console.log('[Share] canShare result:', canShareResult);
      
      if (!canShareResult) {
        console.error('[Share] File cannot be shared');
        throw new Error("File cannot be shared");
      }

      // 6. Share
      console.log('[Share] Attempting to share file');
          await navigator.share({
            files: [file],
        title: `Reading ${title}`,
      });
      
      console.log('[Share] Share successful');
      toast.success("Opened Instagram!", { id: toastId });
          setShowDialog(false);
    } catch (error) {
      console.error("[Share] Share error caught:", error);
      console.error("[Share] Error details:", {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
      });
      
      // If share fails, try fallback download
      try {
        console.log("[Share] Attempting fallback download");
        const params = new URLSearchParams({
          title: title,
          author: author || '',
          cover: coverUrl || '',
          username: username || '',
        });
        
        const response = await fetch(`/api/og/share?${params.toString()}`);
        console.log("[Share] Fallback fetch status:", response.status);
        
        if (response.ok) {
          const blob = await response.blob();
          console.log("[Share] Fallback blob received:", {
            size: blob.size,
            type: blob.type,
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `paperboxd-story.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log("[Share] Fallback download successful");
          toast.error("Share failed, but image downloaded", { id: toastId });
        } else {
          console.error("[Share] Fallback fetch failed:", response.status);
          toast.error("Failed to generate image", { id: toastId });
      }
      } catch (fallbackError) {
        console.error("[Share] Fallback error:", fallbackError);
        toast.error("Failed to generate image", { id: toastId });
      }
    } finally {
      console.log("[Share] Share process completed");
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
