"use client";

import React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/primitives/dialog";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// ── Types ─────────────────────────────────────────────────────────────────────

type ShelfBook = {
  id?: string;
  bookId?: string;
  title?: string;
  cover?: string;
  author?: string;
  authors?: string[];
};

type UserList = {
  id: string;
  title: string;
  bookCount: number;
};

// ── Book sheet panel ──────────────────────────────────────────────────────────

function BookSheetPanel({
  open,
  onClose,
  title,
  fetchUrl,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fetchUrl: string;
}) {
  const router = useRouter();
  const [books, setBooks] = React.useState<ShelfBook[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(fetchUrl)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json) setBooks(json.books || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, fetchUrl]);

  function getBookId(b: ShelfBook): string | null {
    return b.bookId || b.id || null;
  }

  function getTitle(b: ShelfBook): string {
    return b.title || "Unknown title";
  }

  function getCover(b: ShelfBook): string {
    return b.cover || "";
  }

  function getAuthor(b: ShelfBook): string {
    if (b.author) return b.author;
    return Array.isArray(b.authors) ? b.authors[0] || "" : "";
  }

  function handleClick(b: ShelfBook) {
    const id = getBookId(b);
    if (id) router.push(`/b/${id}`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className={`text-xl font-semibold ${playfair.className}`}>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 animate-pulse">
                  <div className="w-full rounded-xl bg-muted" style={{ aspectRatio: "2/3" }} />
                  <div className="h-3.5 w-4/5 rounded bg-muted" />
                  <div className="h-3 w-3/5 rounded bg-muted/60" />
                </div>
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="py-16 text-center">
              <div className={`text-base text-muted-foreground ${playfair.className} italic`}>Nothing here yet.</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {books.map((b, i) => {
                const cover = getCover(b);
                const bookTitle = getTitle(b);
                return (
                  <button
                    key={getBookId(b) || i}
                    type="button"
                    onClick={() => handleClick(b)}
                    className="group flex flex-col text-left cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {cover ? (
                      <div className="relative w-full overflow-hidden rounded-xl border border-border/40 shadow-sm group-hover:border-border/70 transition-colors" style={{ aspectRatio: "2/3" }}>
                        <Image
                          src={cover}
                          alt={bookTitle}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 30vw, 180px"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        className="w-full rounded-xl border border-border/40 shadow-sm"
                        style={{ aspectRatio: "2/3", background: `hsl(${(bookTitle.charCodeAt(0) * 7) % 360},30%,40%)` }}
                      />
                    )}
                    <div className="mt-2.5 px-0.5">
                      <div className={`text-[13px] font-semibold text-foreground leading-snug line-clamp-2 ${playfair.className}`}>{bookTitle}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{getAuthor(b)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── New list dialog ───────────────────────────────────────────────────────────

function NewListDialog({
  open,
  onClose,
  username,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  onCreated: (list: UserList) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) { setTitle(""); setIsPrivate(false); setError(""); }
  }, [open]);

  async function handleCreate(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!title.trim()) { setError("Please enter a name."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: "", isPublic: !isPrivate }),
      });
      if (res.ok) {
        const json = await res.json();
        const created: UserList = {
          id: json.id || json.listId || json._id || "",
          title: json.title || title.trim(),
          bookCount: 0,
        };
        onCreated(created);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setError((err as { error?: string }).error || "Failed to create list.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new list</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="px-1 py-2 flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            placeholder="List name…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none w-fit">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Private list
          </label>
          {error && <div className="text-xs text-destructive">{error}</div>}
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

type SheetKey = "liked" | "tbr" | "finished" | null;

export function HomeSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const [shelfCounts, setShelfCounts] = React.useState<{ reading: number; tbr: number; finished: number } | null>(null);
  const [lists, setLists] = React.useState<UserList[]>([]);

  const [openSheet, setOpenSheet] = React.useState<SheetKey>(null);
  const [newListOpen, setNewListOpen] = React.useState(false);

  // Fetch shelf counts from home stats
  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/home/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.shelfCounts) setShelfCounts(json.shelfCounts); })
      .catch(() => {});
  }, [isAuthenticated]);

  // Fetch lists directly (authed endpoint)
  React.useEffect(() => {
    if (!isAuthenticated || !user?.username) return;
    fetch(`/api/users/${encodeURIComponent(user.username)}/lists`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!json) return;
        const raw: UserList[] = (json.ownLists || json.lists || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (l: any) => ({
            id: l.id || l._id || l.listId || "",
            title: l.title || "Untitled",
            bookCount: l.bookCount ?? l.booksCount ?? l.book_count ?? 0,
          })
        );
        setLists(raw);
      })
      .catch(() => {});
  }, [isAuthenticated, user?.username]);

  const shelves = [
    {
      label: "Liked",
      count: null as number | null,
      sheet: "liked" as SheetKey,
      fetchUrl: `/api/users/${user?.username}/books?type=liked&limit=50`,
      sheetTitle: "Liked books",
    },
    {
      label: "Procrastination wall",
      count: shelfCounts?.tbr ?? null,
      sheet: "tbr" as SheetKey,
      fetchUrl: `/api/users/${user?.username}/books?type=tbr&limit=50`,
      sheetTitle: "Want to read",
    },
    {
      label: "Finished",
      count: shelfCounts?.finished ?? null,
      sheet: "finished" as SheetKey,
      fetchUrl: `/api/users/${user?.username}/books?type=bookshelf&limit=50`,
      sheetTitle: "Finished books",
    },
  ];

  const activeShelf = shelves.find((s) => s.sheet === openSheet);

  return (
    <>
      <aside
        className={cn(
          "hidden md:block fixed left-0 z-[90] w-[220px]",
          "border-r border-border bg-background",
          "overflow-y-auto",
        )}
        style={{ top: 64, height: "calc(100vh - 64px)" }}
      >
        <div className="px-[18px] py-6">
          {/* Your shelves */}
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground px-2.5 mb-2">
            Your shelves
          </div>

          {shelves.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setOpenSheet(s.sheet)}
              className={cn(
                "flex w-full items-center justify-between px-2.5 py-[7px] rounded-lg text-[13.5px] transition-colors text-left cursor-pointer",
                "text-foreground hover:bg-muted/60",
              )}
            >
              <span>{s.label}</span>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {s.count !== null ? s.count : ""}
              </span>
            </button>
          ))}

          {/* Your lists */}
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground px-2.5 mt-6 mb-2">
            Your lists
          </div>

          {lists.length > 0 ? (
            lists.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  if (user?.username) {
                    router.push(`/u/${user.username}/lists/${l.id}`);
                  }
                }}
                disabled={!user?.username}
                className={cn(
                  "flex w-full items-center justify-between px-2.5 py-[7px] rounded-lg text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors text-left cursor-pointer disabled:pointer-events-none disabled:opacity-50",
                  pathname.includes(l.id) && "bg-muted text-foreground",
                )}
              >
                <span className="truncate max-w-[140px]">{l.title}</span>
                <span className="font-mono text-[10px] ml-1 shrink-0">{l.bookCount}</span>
              </button>
            ))
          ) : (
            <div className="px-2.5 py-2 text-xs text-muted-foreground">No lists yet</div>
          )}

          {/* New list button */}
          <button
            type="button"
            onClick={() => setNewListOpen(true)}
            className="mt-4 w-full px-3 py-2 rounded-lg border border-dashed border-border text-[12.5px] text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors text-left cursor-pointer"
          >
            + New list
          </button>
        </div>
      </aside>

      {/* Shelf book panels */}
      {activeShelf && (
        <BookSheetPanel
          open={openSheet !== null}
          onClose={() => setOpenSheet(null)}
          title={activeShelf.sheetTitle}
          fetchUrl={activeShelf.fetchUrl}
        />
      )}

      {/* New list dialog */}
      {user?.username && (
        <NewListDialog
          open={newListOpen}
          onClose={() => setNewListOpen(false)}
          username={user.username}
          onCreated={(list) => setLists((prev) => [list, ...prev])}
        />
      )}
    </>
  );
}
