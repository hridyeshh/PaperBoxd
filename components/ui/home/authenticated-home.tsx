"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import Image from "next/image";
import { useRouter } from "next/navigation";
import BookLoader from "@/components/ui/features/book-loader";
import { createBookSlug } from "@/lib/utils/book-slug";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

interface BookItem {
  id: string;
  _id?: string;
  title: string;
  authors: string[];
  description: string;
  publishedDate: string;
  cover: string;
  isbn?: string;
  isbn13?: string;
  openLibraryId?: string;
  isbndbId?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  author?: string;
}

interface CurrentlyReadingBook {
  bookId: string;
  title: string;
  cover: string;
  author: string;
  currentPage: number;
  totalPages: number;
  updatedAt: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBook(b: any): BookItem | null {
  const id = b?.id || b?._id;
  if (!id) return null;
  return {
    id,
    _id: b._id || id,
    title: b.title || "Unknown Title",
    authors: Array.isArray(b.authors)
      ? b.authors
      : b.authors
      ? [b.authors]
      : b.author
      ? [b.author]
      : ["Unknown Author"],
    description: b.description || "",
    publishedDate: b.publishedDate || "",
    cover: b.cover || "",
    isbn: b.isbn,
    isbn13: b.isbn13,
    openLibraryId: b.openLibraryId,
    isbndbId: b.isbndbId,
    averageRating: b.averageRating,
    ratingsCount: b.ratingsCount,
    pageCount: b.pageCount,
  };
}

function goToBook(router: ReturnType<typeof useRouter>, book: BookItem | { bookId: string; title: string; isbn?: string; isbn13?: string }) {
  const isCurrentlyReading = "bookId" in book;
  const id = isCurrentlyReading ? book.bookId : (book as BookItem).isbn13 || (book as BookItem).isbn || (book as BookItem).openLibraryId || (book as BookItem).isbndbId || (book as BookItem)._id || book.id;
  const bookId = isCurrentlyReading ? book.bookId : id as string;
  if (!bookId) return router.push(`/b/${createBookSlug(book.title)}`);
  const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
  const isOL = bookId.startsWith("OL") || bookId.startsWith("/works/");
  const isMongo = /^[0-9a-fA-F]{24}$/.test(bookId);
  const isClean = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");
  if (isISBN || isOL || isMongo || isClean) return router.push(`/b/${bookId}`);
  router.push(`/b/${createBookSlug(book.title)}`);
}

// ── Types for progress API response ──────────────────────────────────────────

interface ProgressLastBook {
  book_id: string;
  title: string;
  slug: string;
  author: string;
  cover: string;
  current_page: number;
  total_pages: number;
}

// ── Hero strip ────────────────────────────────────────────────────────────────

function HeroStrip({
  currentBook,
  username,
  todayPages,
  sessions,
  weekBars,
  progressLoading,
}: {
  currentBook: CurrentlyReadingBook | null;
  username: string;
  todayPages: number;
  sessions: number;
  weekBars: number[];
  progressLoading: boolean;
}) {
  const router = useRouter();
  const maxBar = Math.max(...weekBars, 1);
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
  });

  return (
    <section className="relative rounded-2xl overflow-hidden border border-border bg-muted/20 p-7">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right,rgba(100,116,139,.05) 1px,transparent 1px)," +
            "linear-gradient(to bottom,rgba(100,116,139,.05) 1px,transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse at center,#000 30%,transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center,#000 30%,transparent 80%)",
        }}
      />

      <div className="relative grid items-center gap-9" style={{ gridTemplateColumns: "3fr 2fr" }}>
        {/* Left */}
        <div>
          <h1 className={cn(playfair.className, "text-4xl font-semibold tracking-tight leading-[1.05] text-foreground")}>
            Welcome back, {username}.<br />
            <span className="italic font-normal text-2xl text-muted-foreground">
              What are you reading?
            </span>
          </h1>

          {/* Currently reading card */}
          {progressLoading ? (
            <div className="mt-5 bg-background border border-border rounded-2xl p-4 flex gap-4 animate-pulse">
              <div className="rounded-lg bg-muted shrink-0" style={{ width: 72, aspectRatio: "2/3" }} />
              <div className="flex-1 min-w-0 flex flex-col gap-2 justify-center">
                <div className="h-2.5 w-24 bg-muted rounded-full" />
                <div className="h-5 w-3/4 bg-muted rounded-full" />
                <div className="h-3 w-1/3 bg-muted rounded-full" />
                <div className="mt-2 h-1 bg-muted rounded-full w-full" />
              </div>
              <div className="self-center shrink-0 h-9 w-24 bg-muted rounded-full" />
            </div>
          ) : currentBook ? (
            <div
              className="mt-5 bg-background border border-border rounded-2xl p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => goToBook(router, currentBook)}
            >
              <div
                className="relative shrink-0 rounded-lg overflow-hidden shadow-md"
                style={{ width: 72, aspectRatio: "2/3" }}
              >
                {currentBook.cover ? (
                  <Image
                    src={currentBook.cover}
                    alt={currentBook.title}
                    fill
                    className="object-cover"
                    sizes="72px"
                    unoptimized
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-end p-1.5"
                    style={{ background: `hsl(${(currentBook.title.charCodeAt(0) * 7) % 360},35%,45%)` }}
                  >
                    <span className={cn(playfair.className, "text-[10px] text-white/80 font-semibold leading-tight line-clamp-3")}>
                      {currentBook.title}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
                  Currently reading
                </div>
                <div className={cn(playfair.className, "text-xl font-semibold text-foreground mt-1 leading-tight line-clamp-2")}>
                  {currentBook.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{currentBook.author}</div>
                {currentBook.totalPages > 0 && (
                  <div className="mt-3">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((currentBook.currentPage / currentBook.totalPages) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1.5">
                      p.{currentBook.currentPage} of {currentBook.totalPages} ·{" "}
                      {Math.round((currentBook.currentPage / currentBook.totalPages) * 100)}%
                    </div>
                  </div>
                )}
              </div>
              <button
                className="self-center shrink-0 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-85 transition-opacity cursor-pointer"
                onClick={(e) => { e.stopPropagation(); goToBook(router, currentBook); }}
              >
                Log pages
              </button>
            </div>
          ) : (
            <div className="mt-5 bg-background border border-dashed border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="rounded-lg bg-muted shrink-0" style={{ width: 48, aspectRatio: "2/3" }} />
              <div>
                <div className="text-sm font-medium text-foreground">Nothing in progress</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Start a book and it will appear here
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: weekly stats */}
        {progressLoading ? (
          <div className="bg-background border border-border rounded-2xl p-5 self-start animate-pulse">
            <div className="h-2.5 w-16 bg-muted rounded-full mb-4" />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <div className="h-8 w-10 bg-muted rounded-md" />
                <div className="h-2.5 w-16 bg-muted rounded-full mt-2" />
              </div>
              <div>
                <div className="h-8 w-10 bg-muted rounded-md" />
                <div className="h-2.5 w-20 bg-muted rounded-full mt-2" />
              </div>
            </div>
            <div className="h-2.5 w-20 bg-muted rounded-full mb-3" />
            <div className="flex items-end gap-1.5" style={{ height: 36 }}>
              {[0.4, 0.7, 0.3, 1, 0.5, 0.6, 0.2].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-muted" style={{ height: `${Math.round(h * 36)}px` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-background border border-border rounded-2xl p-5 self-start">
            <div className="mb-3.5">
              <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground">
                This week
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={cn(playfair.className, "text-[32px] font-semibold text-foreground leading-none")}>
                  {todayPages}
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-1">pages today</div>
              </div>
              <div>
                <div className={cn(playfair.className, "text-[32px] font-semibold text-foreground leading-none")}>
                  {sessions}
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-1">books logged</div>
              </div>
            </div>

            {/* 7-day bars */}
            <div className="mt-4">
              <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground mb-2">
                Last 7 days
              </div>
              <div className="flex items-end gap-1.5" style={{ height: 36 }}>
                {weekBars.map((v, i) => {
                  // Empty days: 2px ghost line. Active days: scale 10-36px so
                  // even a single page on Monday shows as a visible bar.
                  const height = v > 0 ? Math.max(10, Math.round((v / maxBar) * 36)) : 2;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm transition-all",
                        v > 0 ? "bg-foreground" : "bg-muted opacity-40"
                      )}
                      style={{ height: `${height}px` }}
                      title={v > 0 ? `${v} ${v === 1 ? "page" : "pages"}` : "No activity"}
                    />
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {dayLabels.map((d, i) => (
                  <div key={i} className="flex-1 text-center font-mono text-[10px] text-muted-foreground">{d}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Friends rail ──────────────────────────────────────────────────────────────

interface FriendActivity {
  id: string;
  username: string;
  userName: string;
  userAvatar: string | null;
  action: string;
  bookId: string;
  bookTitle: string;
  bookSlug: string | null;
  timestamp: string;
}

function formatTimeAgo(timestamp: string | Date | undefined | null): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "Just now";
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function avatarHue(username: string): number {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) % 360;
  return h;
}

function FriendsRail({ activities }: { activities: FriendActivity[] }) {
  const router = useRouter();
  if (activities.length === 0) return null;
  const shown = activities.slice(0, 5);

  return (
    <section className="mt-6">
      <div className="flex justify-between items-baseline mb-2.5">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground">
            Your friends · this week
          </div>
          <h2 className={cn(playfair.className, "text-[22px] font-semibold text-foreground mt-0.5")}>
            Between covers.
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3.5 mt-2.5">
        {shown.map((a) => (
          <div
            key={a.id}
            className="bg-muted/25 border border-border rounded-2xl p-3.5 flex flex-col gap-2.5 min-h-[110px] cursor-pointer hover:shadow-sm hover:border-border/60 transition-all"
            onClick={() => router.push(`/u/${a.username}`)}
          >
            <div className="flex items-center gap-2">
              {a.userAvatar ? (
                <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden">
                  <Image src={a.userAvatar} alt={a.username} width={28} height={28} className="object-cover w-full h-full" unoptimized />
                </div>
              ) : (
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{ background: `hsl(${avatarHue(a.username)}, 45%, 55%)` }}
                >
                  {(a.userName || a.username).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-xs font-semibold text-foreground truncate flex-1">
                @{a.username}
              </div>
            </div>
            <div
              className="text-xs text-foreground/75 leading-snug flex-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (a.bookSlug) router.push(`/b/${a.bookSlug}`);
                else router.push(`/b/${a.bookId}`);
              }}
            >
              {a.action}{" "}
              <em className={cn(playfair.className)} style={{ fontStyle: "italic" }}>{a.bookTitle}</em>
            </div>
            <div className="font-mono text-[9.5px] tracking-[0.05em] text-muted-foreground">
              {formatTimeAgo(a.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Horizontal carousel ───────────────────────────────────────────────────────

function BookCard({ book, onClick, width = "w-[130px]" }: { book: BookItem; onClick: () => void; width?: string }) {
  return (
    <div className={cn(width, "shrink-0 cursor-pointer group")} onClick={onClick}>
      <div className="rounded-xl overflow-hidden border border-border/50 bg-background shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
        <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: "2/3" }}>
          {book.cover ? (
            <Image
              src={book.cover}
              alt={book.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="130px"
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0 flex items-end p-2"
              style={{ background: `hsl(${(book.title.charCodeAt(0) * 7) % 360}, 35%, 45%)` }}
            >
              <span className={cn(playfair.className, "text-xs text-white/80 font-semibold leading-tight")}>
                {book.title}
              </span>
            </div>
          )}
        </div>
        <div className="p-2.5 pb-3">
          <div className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</div>
          <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">{book.authors?.[0] || ""}</div>
        </div>
      </div>
    </div>
  );
}

function HomeCarousel({ title, subtitle, books }: { title: string; subtitle?: string; books: BookItem[] }) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  if (books.length === 0) return null;

  return (
    <>
      <section className="bg-background border border-border rounded-2xl p-[18px]">
        <div className="flex justify-between items-baseline mb-3">
          <div>
            <h3 className={cn(playfair.className, "text-lg font-semibold text-foreground")}>{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={() => setShowAll(true)}
            className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer tracking-wide"
          >
            See all →
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onClick={() => goToBook(router, book)}
            />
          ))}
        </div>
      </section>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <DialogTitle className={cn(playfair.className, "text-2xl font-semibold")}>{title}</DialogTitle>
            {subtitle && <DialogDescription className="text-sm">{subtitle}</DialogDescription>}
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  width="w-full"
                  onClick={() => { setShowAll(false); goToBook(router, book); }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const CAROUSEL_TYPES = ["continue-reading", "friends", "recommended", "favorites"] as const;
const CACHE_KEY      = "home_carousel_data_v3";
const CACHE_TS_KEY   = "home_carousel_timestamp_v3";
const CACHE_TTL      = 5 * 60 * 1000;
const STATS_CACHE_KEY = "home_stats_cache_v1";

function readCarouselCache(): { data: Record<string, BookItem[]>; fresh: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!cached || !ts) return null;
    const fresh = Date.now() - parseInt(ts) < CACHE_TTL;
    return { data: JSON.parse(cached), fresh };
  } catch { return null; }
}

function readStatsCache(): { stats: unknown; progress: unknown } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthenticatedHome() {
  const { user, isAuthenticated } = useAuth();
  // Seed from cache so tab-switching back doesn't show loading spinner
  const [carouselData, setCarouselData] = useState<Record<string, BookItem[]>>(
    () => readCarouselCache()?.data ?? {}
  );
  const [loading, setLoading] = useState(() => !readCarouselCache()?.fresh);
  const hasLoadedRef = useRef(false);

  // Stats from /api/home/stats + /api/home/progress
  const [currentlyReading, setCurrentlyReading] = useState<CurrentlyReadingBook[]>([]);
  const [lastLoggedBook, setLastLoggedBook] = useState<ProgressLastBook | null>(null);
  const [todayPages, setTodayPages] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [weekBars, setWeekBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [progressLoading, setProgressLoading] = useState(true);

  const lastFetchRef = useRef(0);
  const hiddenAtRef = useRef(0);

  const applyStats = React.useCallback((stats: unknown, progress: unknown) => {
    if (stats) {
      const s = stats as { currentlyReading?: CurrentlyReadingBook[] };
      const cr: CurrentlyReadingBook[] = s.currentlyReading || [];
      cr.sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
      setCurrentlyReading(cr);
    }
    if (progress) {
      const p = progress as { todayPages?: number; todayBooks?: number; weekBars?: number[]; lastBook?: ProgressLastBook | null };
      setTodayPages(p.todayPages ?? 0);
      setSessions(p.todayBooks ?? 0);
      setWeekBars(p.weekBars ?? [0, 0, 0, 0, 0, 0, 0]);
      setLastLoggedBook(p.lastBook ?? null);
    }
  }, []);

  const fetchStats = React.useCallback(() => {
    if (!isAuthenticated) return;
    // Seed from cache immediately so panel isn't blank on rapid refreshes
    const cached = readStatsCache();
    if (cached) {
      applyStats(cached.stats, cached.progress);
      setProgressLoading(false);
    }
    // Dedupe: don't refetch if a fetch completed within the last 30s
    if (Date.now() - lastFetchRef.current < 30_000) return;
    lastFetchRef.current = Date.now();

    Promise.all([
      fetch("/api/home/stats").then((r) => r.ok ? r.json() : null),
      fetch("/api/home/progress").then((r) => r.ok ? r.json() : null),
    ]).then(([stats, progress]) => {
      if (stats || progress) {
        applyStats(stats, progress);
        try { localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ stats, progress })); } catch { /* ignore */ }
      }
      setProgressLoading(false);
    }).catch(() => { setProgressLoading(false); });
  }, [isAuthenticated, applyStats]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Only refetch on tab-return if user was away for >60s (e.g. just logged pages elsewhere).
  // Short tab switches (code editor, Slack, etc.) are ignored.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        const awayMs = Date.now() - hiddenAtRef.current;
        if (awayMs > 60_000) fetchStats();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchStats]);

  // Discover fallback — shown when personalized carousels are all empty
  const [discoverBooks, setDiscoverBooks] = useState<BookItem[]>([]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/books/landing?limit=20")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.books?.length) setDiscoverBooks((d.books as Parameters<typeof mapBook>[0][]).map(mapBook).filter(Boolean) as BookItem[]);
      })
      .catch(() => {/* non-critical */});
  }, [isAuthenticated]);

  // Friends rail — real activity from followed users in the last 7 days
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  useEffect(() => {
    if (!isAuthenticated || !user?.username) return;
    const BOOK_TYPES = new Set(["added_book", "read", "started_reading", "rated", "liked", "reviewed", "diary_entry"]);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    fetch(`/api/users/${user.username}/activities/following?page=1&pageSize=40`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const acts = (d?.activities ?? []) as Array<Record<string, unknown>>;
        const filtered: FriendActivity[] = acts
          .filter((a) => BOOK_TYPES.has(a.type as string) && a.bookId && a.bookTitle)
          .filter((a) => {
            const t = new Date(a.timestamp as string).getTime();
            return !isNaN(t) && t >= weekAgo;
          })
          .map((a) => ({
            id: a._id as string,
            username: (a.username as string) || "",
            userName: (a.userName as string) || "",
            userAvatar: (a.userAvatar as string | null) ?? null,
            action: (a.action as string) || "",
            bookId: a.bookId as string,
            bookTitle: a.bookTitle as string,
            bookSlug: (a.bookSlug as string | null) ?? null,
            timestamp: a.timestamp as string,
          }))
          .slice(0, 5);
        setFriendActivities(filtered);
      })
      .catch(() => {/* non-critical */});
  }, [isAuthenticated, user?.username]);

  // Fetch carousel data — stale-while-revalidate
  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }

    const cache = readCarouselCache();
    if (cache) {
      setCarouselData(cache.data);
      setLoading(false);
      hasLoadedRef.current = true;
      if (cache.fresh) return; // No refetch needed
      // Stale: refetch in background, but DON'T toggle loading (data already showing)
    }

    const load = async () => {
      if (!cache) setLoading(true);
      const stale = cache?.data ?? {};
      const data: Record<string, BookItem[]> = { ...stale };
      let anyFetched = false;
      await Promise.all(
        CAROUSEL_TYPES.map(async (type) => {
          try {
            const res = await fetch(`/api/books/personalized?type=${type}&limit=20`);
            if (res.status === 429 || res.status === 503) return; // keep stale
            if (res.ok) {
              data[type] = ((await res.json()).books || []).map(mapBook).filter(Boolean);
              anyFetched = true;
            }
          } catch { /* keep stale */ }
        }),
      );
      setCarouselData(data);
      if (anyFetched && typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
      }
      setLoading(false);
      hasLoadedRef.current = true;
    };
    load();
  }, [isAuthenticated]);


  if (loading && Object.keys(carouselData).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BookLoader size="md" speed="fast" loadingText="Loading…" />
      </div>
    );
  }

  // Prefer the most recently logged book today; fall back to most recently updated in progress
  const currentBook: CurrentlyReadingBook | null = lastLoggedBook
    ? {
        bookId: lastLoggedBook.book_id,
        title: lastLoggedBook.title,
        cover: lastLoggedBook.cover,
        author: lastLoggedBook.author,
        currentPage: lastLoggedBook.current_page,
        totalPages: lastLoggedBook.total_pages,
        updatedAt: null,
      }
    : (currentlyReading[0] ?? null);
  // Go returns one recommendation pool — "recommended" is the full pool,
  // "friends"/"favorites" are subsets filtered by reason. Dedupe so each book
  // appears in at most one carousel. Priority: friends > favorites > recommended.
  const rawFriends    = carouselData["friends"] ?? [];
  const rawRecommend  = carouselData["recommended"] ?? [];
  const rawFavorites  = carouselData["favorites"] ?? [];

  const used = new Set<string>();
  const dedupe = (list: BookItem[]) => {
    const out: BookItem[] = [];
    for (const b of list) {
      const key = b.id || b._id;
      if (!key || used.has(key)) continue;
      used.add(key);
      out.push(b);
    }
    return out;
  };

  const friendBooks = dedupe(rawFriends);
  const favBooks    = dedupe(rawFavorites);
  const recBooks    = dedupe(rawRecommend);
  const username    = user?.username || (user?.name ? user.name.split(" ")[0] : "") || "there";

  return (
    <div className="w-full px-8 pb-16 pt-6">
      <HeroStrip
        currentBook={currentBook}
        username={username}
        todayPages={todayPages}
        sessions={sessions}
        weekBars={weekBars}
        progressLoading={progressLoading}
      />

      <FriendsRail activities={friendActivities} />

      <div className="flex flex-col gap-4 mt-6">
        {friendBooks.length > 0 && (
          <HomeCarousel
            title="Your friends are liking these"
            subtitle="Books people you follow added this week."
            books={friendBooks}
          />
        )}
        {recBooks.length > 0 && (
          <HomeCarousel
            title="Worth your shelf"
            subtitle="Hand-picked picks we think you'll love."
            books={recBooks}
          />
        )}
        {favBooks.length > 0 && (
          <HomeCarousel
            title="Because you read…"
            subtitle="Quiet, melancholy, a little odd."
            books={favBooks}
          />
        )}
        {/* Discover surface: always show if personalized data is thin */}
        {discoverBooks.length > 0 && (friendBooks.length + recBooks.length + favBooks.length) < 8 && (
          <HomeCarousel
            title="Discover"
            subtitle="New arrivals and reader favourites."
            books={discoverBooks.filter((b) => !used.has(b.id || b._id || ""))}
          />
        )}
      </div>
    </div>
  );
}
