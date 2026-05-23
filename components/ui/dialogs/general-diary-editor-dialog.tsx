"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/primitives/dialog";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/ui/features/tiptap-editor";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

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

  React.useEffect(() => {
    if (open) {
      setContent(initialContent || "");
      setSubject("");
    }
  }, [open, initialContent]);

  const isEmpty = !content || content.replace(/<[^>]*>/g, "").trim() === "";

  const handleSave = async () => {
    if (isEmpty) {
      toast.error("Write something before saving");
      return;
    }

    setIsSaving(true);
    try {
      const body: { content: string; subject?: string } = { content: content.trim() };
      if (subject.trim()) body.subject = subject.trim();

      const res = await fetch(`/api/users/${encodeURIComponent(username)}/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string; details?: string };
        throw new Error(err.error || err.details || `Failed to save (${res.status})`);
      }

      toast.success("Diary entry saved");
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save diary entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[88vh] p-0 flex flex-col overflow-hidden rounded-2xl gap-0">
        <DialogTitle className="sr-only">Write diary entry</DialogTitle>
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
            New entry
          </div>
          <h2 className={cn(playfair.className, "text-[22px] font-semibold text-foreground leading-tight")}>
            What&apos;s on your mind?
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col gap-0 min-h-0 overflow-y-auto">
          {/* Subject */}
          <div className="px-7 pt-5 pb-3 flex-shrink-0">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (optional)"
              maxLength={200}
              className={cn(
                "w-full bg-transparent text-[15px] font-medium text-foreground",
                "placeholder:text-muted-foreground/50",
                "border-0 outline-none ring-0 focus:outline-none",
              )}
            />
          </div>

          {/* Divider */}
          <div className="mx-7 h-px bg-border flex-shrink-0" />

          {/* Editor */}
          <div className="flex-1 px-4 py-4 min-h-[260px]">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing…"
              editable={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-border bg-muted/20 flex items-center justify-between flex-shrink-0">
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {isEmpty ? "Nothing written yet" : "Ready to save"}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isEmpty}
              className="px-5 py-2 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving…" : "Save entry"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
