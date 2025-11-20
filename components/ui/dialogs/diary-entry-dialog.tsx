"use client";

import * as React from "react";
import Image from "next/image";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface DiaryEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: {
    id: string;
    bookId?: string | null;
    bookTitle?: string | null;
    bookAuthor?: string | null;
    bookCover?: string | null;
    subject?: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
    likes?: string[];
    isLiked?: boolean;
    likesCount?: number;
  };
  username: string;
  isOwnProfile?: boolean;
  onLikeChange?: () => void;
  onDelete?: () => void;
}

export function DiaryEntryDialog({
  open,
  onOpenChange,
  entry,
  username,
  isOwnProfile = false,
  onLikeChange,
  onDelete,
}: DiaryEntryDialogProps) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = React.useState(entry.isLiked || false);
  const [likesCount, setLikesCount] = React.useState(entry.likesCount || entry.likes?.length || 0);
  const [isLiking, setIsLiking] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const isMobile = useIsMobile();

  // Update state when entry prop changes
  React.useEffect(() => {
    setIsLiked(entry.isLiked || false);
    setLikesCount(entry.likesCount || entry.likes?.length || 0);
  }, [entry.id, entry.isLiked, entry.likesCount, entry.likes]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!session?.user?.id) {
      toast.info("Please sign in to like diary entries");
      return;
    }

    const wasLiked = isLiked;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    setIsAnimating(true);
    setIsLiking(true);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/diary/${entry.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        // Revert on error
        setIsLiked(wasLiked);
        setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
        
        // Try to get error details
        let errorMessage = `Failed to toggle like (${response.status})`;
        const responseClone = response.clone();
        
        try {
          const errorData = await responseClone.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error("[DiaryEntryDialog] Like API error:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            entryId: entry.id,
            entryIdType: typeof entry.id,
            username,
          });
        } catch (parseError) {
          // If JSON parsing fails, try to get text response
          try {
            const textResponseClone = response.clone();
            const text = await textResponseClone.text();
            console.error("[DiaryEntryDialog] Like API error (text response):", {
              status: response.status,
              statusText: response.statusText,
              text,
              entryId: entry.id,
              entryIdType: typeof entry.id,
              username,
            });
            errorMessage = text || errorMessage;
          } catch (textError) {
            console.error("[DiaryEntryDialog] Like API error (failed to parse):", {
              status: response.status,
              statusText: response.statusText,
              parseError,
              textError,
              entryId: entry.id,
              entryIdType: typeof entry.id,
              username,
            });
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Trigger refresh immediately to sync with server state
      if (onLikeChange) {
        try {
          await onLikeChange();
        } catch (callbackError) {
          console.error("[DiaryEntryDialog] Error in onLikeChange callback:", callbackError);
        }
      }

      // Reset animation after delay
      setTimeout(() => {
        setIsAnimating(false);
      }, 800);
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
      setIsAnimating(false);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      // For book entries, use bookId; for general entries, use entry id
      const requestBody = entry.bookId 
        ? { bookId: entry.bookId }
        : { entryId: entry.id };

      console.log('[DiaryEntryDialog] Deleting entry:', requestBody);

      const response = await fetch(`/api/users/${encodeURIComponent(username)}/diary`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || "Failed to delete entry";
        console.error('[DiaryEntryDialog] Delete error:', { status: response.status, error: errorData });
        throw new Error(errorMessage);
      }

      toast.success("Diary entry deleted");
      onOpenChange(false);
      
      if (onDelete) {
        try {
          await onDelete();
        } catch (callbackError) {
          console.error("[DiaryEntryDialog] Error in onDelete callback:", callbackError);
        }
      }
    } catch (error) {
      console.error("Error deleting diary entry:", error);
      toast.error("Failed to delete diary entry");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-h-[85vh] flex flex-col p-0",
        isMobile ? "max-w-[95vw] w-full" : "max-w-2xl"
      )}>
        <DialogHeader className={cn(
          "pb-3",
          isMobile ? "px-3 pt-3" : "px-4 pt-4"
        )}>
          <DialogTitle className={cn(isMobile ? "text-base" : "text-lg")}>
            {entry.bookTitle || ((entry.subject && entry.subject.trim()) ? entry.subject : "Your notes")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {entry.bookAuthor ? entry.bookAuthor : (entry.bookTitle ? null : "You")}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "flex-1 flex overflow-hidden pb-4",
          entry.bookCover ? (isMobile ? 'flex-col gap-3' : 'gap-4') : '',
          isMobile ? "px-3" : "px-4"
        )}>
          {/* Book Cover - Left Side (only show if book exists) */}
          {entry.bookCover && (
            <div className={cn(
              "flex-shrink-0",
              isMobile ? "w-24 mx-auto" : "w-32"
            )}>
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={entry.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
                  alt={entry.bookTitle ? `${entry.bookTitle} cover` : "Book cover"}
                  fill
                  className="object-cover"
                  sizes={isMobile ? "96px" : "128px"}
                  quality={100}
                  unoptimized={entry.bookCover?.includes('isbndb.com') || entry.bookCover?.includes('images.isbndb.com') || entry.bookCover?.includes('covers.isbndb.com') || true}
                />
              </div>
            </div>
          )}

          {/* Content - Right Side */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 text-sm"
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />
            </div>

            {/* Footer with date, delete button (if owner), and like button */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground">
                  {entry.updatedAt !== entry.createdAt ? `Updated ${entry.updatedAt}` : entry.createdAt}
                </div>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>

              {/* Animated Like Button */}
              <motion.div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={isLiking}
                  className="flex items-center gap-2 relative overflow-visible"
                >
                  {/* Heart icon with animation */}
                  <motion.div
                    className="relative"
                    animate={
                      isAnimating
                        ? {
                            scale: [1, 1.3, 0.9, 1.1, 1],
                            rotate: [0, -10, 10, -5, 0],
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.6,
                      ease: "easeInOut",
                    }}
                  >
                    <Heart
                      className={`h-5 w-5 transition-all duration-300 ${
                        isLiked
                          ? "fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                          : "text-muted-foreground hover:text-red-400"
                      }`}
                    />

                    {/* Pulsing glow effect when liked */}
                    <AnimatePresence>
                      {isLiked && isAnimating && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-red-500"
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6 }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Like count with animation */}
                  <motion.span
                    className="text-sm font-medium"
                    key={likesCount}
                    initial={{ scale: 1 }}
                    animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {likesCount}
                  </motion.span>
                </Button>

                {/* Floating heart particles when liked */}
                <AnimatePresence>
                  {isLiked && isAnimating && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute top-0 left-1/2 pointer-events-none"
                          initial={{
                            x: -10,
                            y: 0,
                            opacity: 1,
                            scale: 0.5,
                          }}
                          animate={{
                            x: -10 + (Math.random() - 0.5) * 60,
                            y: -50 - Math.random() * 30,
                            opacity: 0,
                            scale: 0.3 + Math.random() * 0.4,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.8,
                            delay: i * 0.05,
                            ease: "easeOut",
                          }}
                        >
                          <Heart
                            className="h-3 w-3 fill-red-500 text-red-500"
                            style={{
                              filter: "drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))",
                            }}
                          />
                        </motion.div>
                      ))}
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Diary Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this diary entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

