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

interface GeneralDiaryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  username: string;
  onSave?: () => void;
}

export function GeneralDiaryEditorDialog({
  open,
  onOpenChange,
  initialContent = "",
  username,
  onSave,
}: GeneralDiaryEditorDialogProps) {
  const [content, setContent] = React.useState(initialContent);
  const [subject, setSubject] = React.useState("");
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
      setSubject("");
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

    console.log("[GeneralDiaryEditor] Attempting to save:", {
      username,
      contentLength: content.trim().length,
    });

    setIsSaving(true);
    try {
      const requestBody: any = {
        content: content.trim(),
        // No bookId - this is a general diary entry
      };

      // Only add subject if it's not empty
      if (subject && subject.trim()) {
        requestBody.subject = subject.trim();
      }

      console.log("[GeneralDiaryEditor] Request body:", requestBody);
      console.log("[GeneralDiaryEditor] Subject value:", subject);
      console.log("[GeneralDiaryEditor] Subject in request:", requestBody.subject);

      const response = await fetch(`/api/users/${encodeURIComponent(username)}/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("[GeneralDiaryEditor] Response status:", response.status);
      console.log("[GeneralDiaryEditor] Response ok:", response.ok);
      console.log("[GeneralDiaryEditor] Response statusText:", response.statusText);

      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();

      if (!response.ok) {
        let errorMessage = `Failed to save diary entry (${response.status})`;
        let errorDetails: any = null;
        
        try {
          const error = await responseClone.json();
          console.error("[GeneralDiaryEditor] Error response (JSON):", error);
          errorDetails = error;
          
          // Build a more detailed error message
          if (error.error) {
            errorMessage = error.error;
          }
          if (error.details) {
            errorMessage += `: ${error.details}`;
          }
          if (error.validationErrors) {
            const validationMessages = Object.values(error.validationErrors).join(', ');
            errorMessage += ` (${validationMessages})`;
          }
          if (error.message && !errorMessage.includes(error.message)) {
            errorMessage += ` - ${error.message}`;
          }
        } catch (parseError) {
          // If JSON parsing fails, try to get text response
          try {
            const text = await responseClone.text();
            console.error("[GeneralDiaryEditor] Error response (text):", text);
            errorMessage = text || errorMessage;
          } catch (textError) {
            console.error("[GeneralDiaryEditor] Failed to parse error response:", textError);
            errorMessage = `Server error (${response.status}): ${response.statusText || 'Unknown error'}`;
          }
        }
        
        console.error("[GeneralDiaryEditor] Full error details:", {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          errorMessage,
        });
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("[GeneralDiaryEditor] Success response:", responseData);
      console.log("[GeneralDiaryEditor] Saved entry subject:", responseData.entry?.subject);
      console.log("[GeneralDiaryEditor] Subject sent in request:", subject);

      toast.success("Diary entry saved!");
      onOpenChange(false);
      if (onSave) {
        try {
          await onSave();
        } catch (callbackError) {
          console.error("[GeneralDiaryEditor] Error in onSave callback:", callbackError);
        }
      }
    } catch (error) {
      console.error("[GeneralDiaryEditor] Exception caught:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save diary entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Write</DialogTitle>
          <DialogDescription>
            Share your thoughts, reflections, or anything you'd like to write about
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Subject Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="subject" className="text-sm font-medium text-foreground">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter a subject for your note..."
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-0 focus:border-border"
              maxLength={200}
            />
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
              data-placeholder="Start writing your thoughts..."
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

