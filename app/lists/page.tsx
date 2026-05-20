"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/layout/header-with-search";
import { DesktopSidebar } from "@/components/ui/layout/desktop-sidebar";
import { MinimalDesktopHeader } from "@/components/ui/layout/minimal-desktop-header";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { BookOpen, Globe, Lock, Plus, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { toast } from "sonner";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
});

interface BookCover {
  id?: string;
  _id?: string;
  cover?: string;
  thumbnail?: string;
  volumeInfo?: {
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
  };
}

interface ReadingList {
  id: string;
  title: string;
  description?: string;
  booksCount: number;
  books: BookCover[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

function getCoverUrl(book: BookCover): string | null {
  const img = (book as { volumeInfo?: { imageLinks?: Record<string, string> } })?.volumeInfo?.imageLinks;
  return (
    (book as { cover?: string })?.cover ||
    (book as { thumbnail?: string })?.thumbnail ||
    img?.large ||
    img?.medium ||
    img?.thumbnail ||
    img?.smallThumbnail ||
    img?.small ||
    img?.extraLarge ||
    null
  );
}

export default function ListsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [lists, setLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create list form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push("/auth"); return; }

    const fetchLists = async () => {
      if (!user?.username) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${encodeURIComponent(user.username)}/lists`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof data.error === "string"
            ? data.error
            : (data.error as { message?: string } | undefined)?.message ?? `Failed to load lists (${res.status})`;
          throw new Error(msg);
        }
        setLists(data.lists || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lists");
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [isAuthenticated, authLoading, user, router]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !user?.username) return;
    try {
      setIsCreating(true);
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newListName.trim(), description: "", isPublic: !isPrivate, books: [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create list");

      const created = data?.list ?? data;
      const listId = created?._id ?? created?.id ?? created?.list_id ?? null;

      setNewListName("");
      setIsPrivate(false);
      setShowCreateForm(false);
      toast.success("List created");

      if (listId) router.push(`/u/${user.username}/lists/${listId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex min-h-screen flex-col">
          {isMobile ? <Header minimalMobile={isMobile} /> : <><DesktopSidebar /><MinimalDesktopHeader /></>}
          <div className={cn("flex flex-1 items-center justify-center", isMobile ? "mt-16" : "mt-16")}>
            <TetrisLoading size="md" speed="fast" loadingText="Loading lists…" />
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        {isMobile ? <Header minimalMobile={isMobile} /> : <><DesktopSidebar /><MinimalDesktopHeader /></>}

        <div className={cn("flex-1", isMobile ? "mt-16" : "mt-16")}>
          <div className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8 md:pb-8">

            {/* ── Page heading ── */}
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-[#b85c38]" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#b85c38]">
                    Collections
                  </span>
                </div>
                <h1 className={cn("text-4xl font-bold tracking-tight text-foreground md:text-5xl", playfair.className)}>
                  Your Lists
                </h1>
                <p
                  className={cn("mt-1.5 text-base text-muted-foreground", playfair.className)}
                  style={{ fontStyle: "italic" }}
                >
                  curated collections, organised by you
                </p>
              </div>

              {/* New list button */}
              <button
                type="button"
                onClick={() => setShowCreateForm((v) => !v)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  showCreateForm
                    ? "bg-muted text-foreground"
                    : "bg-[#b85c38] text-white hover:bg-[#a04e30]"
                )}
              >
                {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showCreateForm ? "Cancel" : "New list"}
              </button>
            </div>

            {/* ── Inline create form ── */}
            {showCreateForm && (
              <form
                onSubmit={handleCreateList}
                className="mb-6 rounded-2xl border border-border bg-card p-5"
              >
                <p className={cn("mb-4 text-base font-semibold", playfair.className)}>
                  Create a new list
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    placeholder="List name…"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    autoFocus
                    maxLength={100}
                    className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-[#b85c38] focus:ring-1 focus:ring-[#b85c38]/30"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="accent-[#b85c38] h-4 w-4 rounded"
                    />
                    Private
                  </label>
                  <button
                    type="submit"
                    disabled={!newListName.trim() || isCreating}
                    className="rounded-lg bg-[#b85c38] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a04e30] disabled:opacity-50"
                  >
                    {isCreating ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Error ── */}
            {error && (
              <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/8 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* ── Empty state ── */}
            {lists.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
                <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className={cn("text-lg font-semibold text-foreground", playfair.className)}>
                  No lists yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Create your first reading list to organise books you love, want to read, or want to share.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-[#b85c38] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a04e30] transition"
                >
                  <Plus className="h-4 w-4" />
                  Create your first list
                </button>
              </div>
            ) : (
              /* ── Lists grid ── */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lists.map((list) => (
                  <Link
                    key={list.id}
                    href={`/u/${user?.username}/lists/${list.id}`}
                    className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Book cover stack */}
                    <div className="mb-4 grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((i) => {
                        const book = list.books?.[i];
                        const coverUrl = book ? getCoverUrl(book) : null;
                        return (
                          <div
                            key={i}
                            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted"
                          >
                            {coverUrl && (
                              <Image
                                src={coverUrl}
                                alt=""
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="(max-width: 640px) 33vw, 100px"
                                unoptimized
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Title + visibility */}
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3
                        className={cn(
                          "flex-1 truncate text-base font-bold leading-tight tracking-tight text-foreground",
                          playfair.className
                        )}
                      >
                        {list.title}
                      </h3>
                      <span
                        className="mt-0.5 flex-shrink-0 text-muted-foreground"
                        title={list.isPublic ? "Public" : "Private"}
                      >
                        {list.isPublic
                          ? <Globe className="h-3.5 w-3.5" />
                          : <Lock className="h-3.5 w-3.5" />}
                      </span>
                    </div>

                    {list.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                        {list.description}
                      </p>
                    )}

                    {/* Book count */}
                    <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="font-mono">{list.booksCount}</span>
                      <span>{list.booksCount === 1 ? "book" : "books"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
