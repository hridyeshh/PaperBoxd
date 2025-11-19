"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Link as LinkIcon,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TiptapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export function TiptapEditor({
  content = "",
  onChange,
  placeholder = "Start writing...",
  editable = true,
  className,
}: TiptapEditorProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [previousLinkUrl, setPreviousLinkUrl] = React.useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 overflow-y-auto",
          "prose-headings:font-semibold",
          "prose-p:my-2",
          "prose-ul:my-2",
          "prose-ol:my-2",
          "prose-li:my-1",
          "prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
          "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg",
          "prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic",
          className
        ),
      },
    },
  });

  const openLinkDialog = React.useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setPreviousLinkUrl(previousUrl);
    setLinkUrl(previousUrl);
    setIsLinkDialogOpen(true);
  }, [editor]);

  const handleLinkSubmit = React.useCallback(() => {
    if (!editor) return;
    
    if (linkUrl.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      // Ensure URL has a protocol, default to https:// if missing
      let url = linkUrl.trim();
      if (url && !url.match(/^https?:\/\//i) && !url.match(/^mailto:/i) && !url.match(/^tel:/i)) {
        url = `https://${url}`;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    
    setIsLinkDialogOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const handleLinkCancel = React.useCallback(() => {
    setIsLinkDialogOpen(false);
    setLinkUrl("");
  }, []);

  React.useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="min-h-[300px] p-4 border rounded-lg bg-background animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 relative">
      {editable && (
        <div className="relative flex flex-wrap gap-1 p-2 border rounded-lg bg-muted/30 z-10">
          {/* Undo/Redo */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          
          {/* Headings */}
          <Dropdown.Root>
            <Dropdown.Trigger
              className={cn(
                "h-8 px-2 rounded-md hover:bg-muted/50 transition-colors",
                (editor.isActive("heading", { level: 1 }) ||
                 editor.isActive("heading", { level: 2 }) ||
                 editor.isActive("heading", { level: 3 })) && "bg-muted"
              )}
              title="Heading"
            >
              <Heading1 className="h-4 w-4" />
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Item
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={editor.isActive("paragraph") ? "bg-muted" : ""}
                  label="Paragraph"
                />
                <Dropdown.Item
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""}
                  icon={Heading1}
                  label="Heading 1"
                />
                <Dropdown.Item
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
                  icon={Heading2}
                  label="Heading 2"
                />
                <Dropdown.Item
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""}
                  icon={Heading3}
                  label="Heading 3"
                />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>

          {/* Text Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bold") && "bg-muted"
            )}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("italic") && "bg-muted"
            )}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("underline") && "bg-muted"
            )}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("strike") && "bg-muted"
            )}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("code") && "bg-muted"
            )}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("highlight") && "bg-muted"
            )}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />

          {/* Subscript/Superscript */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("subscript") && "bg-muted"
            )}
            title="Subscript"
          >
            <SubscriptIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("superscript") && "bg-muted"
            )}
            title="Superscript"
          >
            <SuperscriptIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bulletList") && "bg-muted"
            )}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("orderedList") && "bg-muted"
            )}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Align */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive({ textAlign: "left" }) && "bg-muted"
            )}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive({ textAlign: "center" }) && "bg-muted"
            )}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive({ textAlign: "right" }) && "bg-muted"
            )}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />

          {/* Blockquote, Code Block, Horizontal Rule, Link */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("blockquote") && "bg-muted"
            )}
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("codeBlock") && "bg-muted"
            )}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="h-8 w-8 p-0"
            title="Horizontal Rule"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openLinkDialog}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("link") && "bg-muted"
            )}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden border rounded-lg relative">
        <EditorContent editor={editor} />
      </div>
      
      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{previousLinkUrl ? "Edit Link" : "Add Link"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="text"
                placeholder="https://example.com or any URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLinkSubmit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    handleLinkCancel();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleLinkCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLinkSubmit}
            >
              {previousLinkUrl ? "Update" : "Add"} Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          word-break: break-word;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror-focused {
          outline: none;
        }
      `}</style>
    </div>
  );
}

