"use client";

import * as React from "react";
import Image from "next/image";
import { Globe, Lock, Plus, Check, X, ChevronLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";
import { Input } from "@/components/ui/primitives/input";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

interface BookCoverItem {
  id?: string;
  cover?: string;
  thumbnail?: string;
  volumeInfo?: {
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface ReadingList {
  id: string;
  title: string;
  description?: string;
  booksCount: number;
  books: BookCoverItem[];
  isPublic: boolean;
  createdAt: string;
}

function getCover(book: BookCoverItem): string | null {
  return (
    book.cover ||
    book.thumbnail ||
    book.volumeInfo?.imageLinks?.thumbnail ||
    book.volumeInfo?.imageLinks?.smallThumbnail ||
    null
  );
}

interface AddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  bookId: string;
  isbndbId?: string;
  openLibraryId?: string;
  bookTitle?: string;
}

type View = "lists" | "create";

export function AddToListDialog({
  open,
  onOpenChange,
  username,
  bookId,
  isbndbId,
  openLibraryId,
  bookTitle,
}: AddToListDialogProps) {
  const [view, setView] = React.useState<View>("lists");
  const [lists, setLists] = React.useState<ReadingList[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [addingTo, setAddingTo] = React.useState<string | null>(null);
  const [addedTo, setAddedTo] = React.useState<Set<string>>(new Set());

  // Create form
  const [newTitle, setNewTitle] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const fetchLists = React.useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/lists`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setLists(data.lists || []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [username]);

  React.useEffect(() => {
    if (open) {
      setView("lists");
      setAddedTo(new Set());
      fetchLists();
    }
  }, [open, fetchLists]);

  const handleAddToList = async (list: ReadingList) => {
    if (addedTo.has(list.id) || addingTo === list.id) return;
    setAddingTo(list.id);
    try {
      const body: Record<string, string> = { action: "add" };
      if (bookId) body.bookId = bookId;
      if (isbndbId) body.isbndbId = isbndbId;
      if (openLibraryId) body.openLibraryId = openLibraryId;

      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(list.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.status === 409) {
        toast.info(`Already in "${list.title}"`);
        setAddedTo((prev) => new Set(prev).add(list.id));
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add book");
      }

      setAddedTo((prev) => new Set(prev).add(list.id));
      toast.success(`Added to "${list.title}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add book to list");
    } finally {
      setAddingTo(null);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: "",
          isPublic: !isPrivate,
          books: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create list");

      toast.success(`"${newTitle.trim()}" created`);
      setNewTitle("");
      setIsPrivate(false);
      // Refresh lists then go back to list view
      await fetchLists();
      setView("lists");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2">
            {view === "create" && (
              <button
                onClick={() => setView("lists")}
                className="text-muted-foreground hover:text-foreground transition mr-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className={cn(playfair.className, "text-lg font-bold leading-tight")}>
              {view === "lists" ? "Add to list" : "Create a new list"}
            </DialogTitle>
          </div>
          {bookTitle && view === "lists" && (
            <p
              className={cn(playfair.className, "text-xs text-muted-foreground mt-0.5 truncate")}
              style={{ fontStyle: "italic" }}
            >
              {bookTitle}
            </p>
          )}
        </DialogHeader>

        {/* ── Body ── */}
        <div className="px-5 pb-5 pt-4">

          {/* ── LIST VIEW ── */}
          {view === "lists" && (
            <>
              {/* Create new button */}
              <button
                onClick={() => setView("create")}
                className="w-full flex items-center gap-3 px-3 py-2.5 mb-3 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition"
              >
                <div className="w-9 h-[52px] rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="font-semibold">Create a new list</span>
              </button>

              {/* Divider */}
              {lists.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[0.625rem] uppercase tracking-widest text-muted-foreground font-semibold">
                    Your lists
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Lists */}
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No lists yet</p>
                  <p className="text-xs text-muted-foreground/70">Create one above to get started</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "none" }}>
                  {lists.map((list) => {
                    const covers = list.books.slice(0, 3);
                    const isAdded = addedTo.has(list.id);
                    const isAdding = addingTo === list.id;

                    return (
                      <button
                        key={list.id}
                        onClick={() => handleAddToList(list)}
                        disabled={isAdding}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left",
                          isAdded
                            ? "border-[#b85c38]/40 bg-[#b85c38]/5"
                            : "border-border hover:border-border/70 hover:bg-muted/50"
                        )}
                      >
                        {/* Cover stack */}
                        <div className="relative w-9 h-[52px] flex-shrink-0">
                          {covers.length > 0 ? (
                            covers.map((book, i) => {
                              const src = getCover(book);
                              return src ? (
                                <div
                                  key={i}
                                  className="absolute rounded overflow-hidden border border-background"
                                  style={{
                                    width: 28,
                                    height: 40,
                                    top: i * 4,
                                    left: i * 3,
                                    zIndex: covers.length - i,
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                                  }}
                                >
                                  <Image src={src} alt="" fill className="object-cover" unoptimized />
                                </div>
                              ) : null;
                            })
                          ) : (
                            <div className="w-9 h-[52px] rounded-lg bg-muted flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {list.isPublic ? (
                              <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="text-sm font-semibold truncate">{list.title}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {list.booksCount} book{list.booksCount !== 1 ? "s" : ""}
                          </div>
                        </div>

                        {/* State icon */}
                        <div className="flex-shrink-0">
                          {isAdding ? (
                            <div className="h-5 w-5 rounded-full border-2 border-[#b85c38] border-t-transparent animate-spin" />
                          ) : isAdded ? (
                            <div className="h-5 w-5 rounded-full bg-[#b85c38] flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center">
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── CREATE VIEW ── */}
          {view === "create" && (
            <form onSubmit={handleCreateList} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  List name
                </label>
                <Input
                  autoFocus
                  placeholder="e.g. Books for 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={80}
                  className="focus-visible:border-foreground dark:focus-visible:border-white"
                />
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between px-3 py-2.5 border border-border rounded-xl">
                <div className="flex items-center gap-2">
                  {isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm font-semibold">{isPrivate ? "Private" : "Public"}</div>
                    <div className="text-xs text-muted-foreground">
                      {isPrivate ? "Only you can see this list" : "Anyone can see this list"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isPrivate}
                  onClick={() => setIsPrivate((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                    isPrivate ? "bg-muted" : "bg-[#b85c38]"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                      isPrivate ? "translate-x-0" : "translate-x-5"
                    )}
                  />
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setView("lists")}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isCreating}
                  className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isCreating ? "Creating…" : "Create list"}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
