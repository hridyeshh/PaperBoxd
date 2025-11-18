"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bold, Italic, Underline, List, ListOrdered, Save, X } from "lucide-react";
import { toast } from "sonner";

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
  const editorRef = React.useRef<HTMLDivElement>(null);

  // Update content when initialContent changes (for editing existing entries)
  React.useEffect(() => {
    if (open && initialContent) {
      setContent(initialContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = initialContent;
      }
    } else if (open && !initialContent) {
      setContent("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    }
  }, [open, initialContent]);

  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleContentChange();
    }
  };

  const handleSave = async () => {
    if (!content || content.trim() === "" || content === "<br>") {
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Write about {bookTitle}</DialogTitle>
          <DialogDescription>
            Share your thoughts, reflections, or notes about this book
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Book Info */}
          <div className="flex gap-4 p-4 rounded-lg border bg-muted/50">
            {bookCover && (
              <div className="relative w-16 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={bookCover}
                  alt={bookTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2">{bookTitle}</h3>
              <p className="text-sm text-muted-foreground">{bookAuthor}</p>
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex gap-2 p-2 border rounded-lg bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText("bold")}
              className="h-8 w-8 p-0"
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText("italic")}
              className="h-8 w-8 p-0"
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText("underline")}
              className="h-8 w-8 p-0"
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText("insertUnorderedList")}
              className="h-8 w-8 p-0"
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText("insertOrderedList")}
              className="h-8 w-8 p-0"
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          {/* Rich Text Editor */}
          <div className="flex-1 flex flex-col overflow-hidden border rounded-lg">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
                handleContentChange();
              }}
              className="flex-1 p-4 overflow-y-auto focus:outline-none min-h-[300px] prose prose-sm dark:prose-invert max-w-none"
              style={{
                wordBreak: "break-word",
              }}
              data-placeholder="Start writing your thoughts about this book..."
            />
          </div>

          <style jsx>{`
            [contenteditable][data-placeholder]:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
            }
          `}</style>
        </div>

        <DialogFooter>
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
            disabled={isSaving || !content || content.trim() === "" || content === "<br>"}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

