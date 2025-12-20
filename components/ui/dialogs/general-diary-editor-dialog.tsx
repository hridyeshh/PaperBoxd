"use client";
import { API_BASE_URL } from '@/lib/api/client';

import * as React from "react";
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

  // Reset content when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setContent(initialContent || "");
      if (!initialContent) {
        setSubject("");
      }
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

    console.log("[GeneralDiaryEditor] Attempting to save:", {
      username,
      contentLength: content.trim().length,
    });

    setIsSaving(true);
    try {
      const requestBody: {
        content: string;
        subject?: string;
      } = {
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

      const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(username)}/diary`, {
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
        let errorDetails: { error?: string; details?: string; message?: string; validationErrors?: Record<string, string> } | null = null;
        
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
        } catch {
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
      <DialogContent className="rounded-3xl max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[85vh] sm:max-h-[90vh] p-4 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Write</DialogTitle>
          <DialogDescription>
            Share your thoughts, reflections, or anything you&apos;d like to write about
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 overflow-y-auto">
          {/* Subject Input */}
          <div className="flex flex-col gap-2 flex-shrink-0">
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

          {/* Tiptap Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <TiptapEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Start writing your thoughts..."
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

