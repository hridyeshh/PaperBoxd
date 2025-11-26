"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/ui/features/tiptap-editor";

interface DiaryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover?: string;
  initialContent?: string;
  username: string;
  onSave?: () => void;
}

export function DiaryEditorDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  bookAuthor,
  bookCover,
  initialContent = "",
  username,
  onSave,
}: DiaryEditorDialogProps) {
  const [content, setContent] = React.useState(initialContent);
  const [isSaving, setIsSaving] = React.useState(false);

  // Reset content when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setContent(initialContent || "");
    }
  }, [open, initialContent]);

  const handleContentChange = (html: string) => {
    setContent(html);
  };

  const handleSave = async () => {
    // Check if content is empty (Tiptap returns <p></p> for empty content)
    const textContent = content.replace(/<[^>]*>/g, "").trim();
    if (!textContent) {
      toast.error("Please write something before saving");
      return;
    }

    console.log("[DiaryEditor] Attempting to save:", {
      username,
      bookId,
      bookTitle,
      bookAuthor,
      contentLength: content.trim().length,
    });

    setIsSaving(true);
    try {
      const requestBody = {
        bookId,
        content: content.trim(),
        bookTitle,
        bookAuthor,
        bookCover,
      };

      console.log("[DiaryEditor] Request body:", requestBody);

      const response = await fetch(`/api/users/${encodeURIComponent(username)}/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("[DiaryEditor] Response status:", response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("[DiaryEditor] Error response:", error);
        const errorMessage = error.error || error.details || "Failed to save diary entry";
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("[DiaryEditor] Success response:", responseData);

      toast.success("Diary entry saved!");
      onOpenChange(false);
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error("[DiaryEditor] Exception caught:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save diary entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[85vh] sm:max-h-[90vh] p-4 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Write about {bookTitle}</DialogTitle>
          <DialogDescription>
            Share your thoughts, reflections, or notes about this book
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 overflow-y-auto">
          {/* Book Info */}
          <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-muted/50 flex-shrink-0">
            {bookCover && (
              <div className="relative w-12 h-[4.5rem] sm:w-16 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={bookCover}
                  alt={bookTitle}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2">{bookTitle}</h3>
              <p className="text-sm text-muted-foreground">{bookAuthor}</p>
            </div>
          </div>

          {/* Tiptap Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <TiptapEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Start writing your thoughts about this book..."
                editable={true}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !content || content.replace(/<[^>]*>/g, "").trim() === ""}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

