"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, Upload, ChevronRight, BookOpen, SkipForward, Search, UserPlus } from "lucide-react";
import { Pinyon_Script, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/primitives/input";
import { Button } from "@/components/ui/primitives/button";
import { Label } from "@/components/ui/primitives/label";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

const pinyonScript = Pinyon_Script({ weight: "400", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

// ── Book covers for background ────────────────────────────────────────────────

const BOOK_COVERS = [
  "https://covers.openlibrary.org/b/isbn/9780439708180-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780061935466-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781451626650-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780385490818-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781451673319-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780307454546-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780316769174-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780307387899-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781594631931-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780679745587-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780156027328-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780618640157-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780486415871-L.jpg",
];

// ── Genres ────────────────────────────────────────────────────────────────────

const GENRES = [
  { id: "fiction", label: "Fiction" },
  { id: "mystery", label: "Mystery" },
  { id: "thriller", label: "Thriller" },
  { id: "romance", label: "Romance" },
  { id: "science-fiction", label: "Sci-Fi" },
  { id: "fantasy", label: "Fantasy" },
  { id: "horror", label: "Horror" },
  { id: "historical", label: "Historical" },
  { id: "biography", label: "Biography" },
  { id: "self-help", label: "Self-Help" },
  { id: "business", label: "Business" },
  { id: "non-fiction", label: "Non-Fiction" },
  { id: "young-adult", label: "Young Adult" },
  { id: "classics", label: "Classics" },
  { id: "poetry", label: "Poetry" },
];

const MAX_PICKS = 4; // Top 4 — same cap as favourites on the profile

const STAGE_LABELS = ["Sign up", "Set up", "Aha"];

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "username" | "genres" | "books" | "readers" | "aha-loading" | "aha-reveal";

type AhaBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

type SuggestedReader = {
  id: string;
  username: string;
  name?: string;
  avatar_url?: string;
  books_read_count: number;
  reason: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stageForStep(step: Step): number {
  return step === "aha-loading" || step === "aha-reveal" ? 2 : 1;
}

function subStepForStep(step: Step): number {
  if (step === "username") return 1;
  if (step === "genres") return 2;
  if (step === "books") return 3;
  return 4;
}

// Search results come back in Google-volumes shape from /api/books/search.
type SearchItem = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: Record<string, string | undefined>;
  };
};

function searchItemToBook(item: SearchItem): AhaBook | null {
  const title = item.volumeInfo?.title ?? "";
  const links = item.volumeInfo?.imageLinks ?? {};
  const cover = links.thumbnail ?? links.smallThumbnail ?? links.medium ?? "";
  if (!item.id || !title) return null;
  return { id: item.id, title, author: item.volumeInfo?.authors?.[0] ?? "", cover };
}

// ── Background cover columns ──────────────────────────────────────────────────

function CoverColumn({
  direction,
  speed,
  covers,
}: {
  direction: "up" | "down";
  speed: number;
  covers: string[];
}) {
  const doubled = [...covers, ...covers];
  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className={
          direction === "up" ? "animate-auth-scroll-up" : "animate-auth-scroll-down"
        }
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((src, i) => (
          <div
            key={i}
            className="w-full mb-2 rounded-md overflow-hidden"
            style={{ aspectRatio: "2/3" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              loading={i < 8 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stage pill header ─────────────────────────────────────────────────────────

function StageHeader({ step }: { step: Step }) {
  const active = stageForStep(step);
  const sub = subStepForStep(step);
  const inSetup = step === "username" || step === "genres" || step === "books" || step === "readers";

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {STAGE_LABELS.map((label, i) => {
          const isDone = i < active;
          const isCurrent = i === active;
          return (
            <React.Fragment key={label}>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  isDone
                    ? "bg-white/10 text-white/50"
                    : isCurrent
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/30"
                )}
              >
                {isDone ? <Check className="w-3 h-3" /> : null}
                {label}
              </div>
              {i < STAGE_LABELS.length - 1 && (
                <div className="w-4 h-px bg-white/20" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {inSetup && (
        <p className="text-[11px] text-white/30 tracking-wider uppercase font-medium">
          Step {sub} of 4
        </p>
      )}
    </div>
  );
}

// ── Step: Username ─────────────────────────────────────────────────────────────

function UsernameStep({
  onNext,
}: {
  onNext: (username: string) => void;
}) {
  const { refreshUser } = useAuth();
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const validate = (v: string) =>
    /^[a-z0-9_-]{3,30}$/.test(v);

  React.useEffect(() => {
    if (!value) { setStatus("idle"); return; }
    if (!validate(value)) { setStatus("invalid"); return; }
    setStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(value)}`
        );
        const data = await res.json();
        setStatus(data.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "available" || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users/set-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set username");
      await new Promise<void>((resolve) => { refreshUser(); setTimeout(resolve, 300); });
      onNext(data.username || value);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set username");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusIcon = () => {
    if (status === "checking") return <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />;
    if (status === "available") return <Check className="w-3.5 h-3.5 text-emerald-400" />;
    return null;
  };

  const statusText = () => {
    if (status === "taken") return <span className="text-rose-400">Already taken</span>;
    if (status === "invalid") return <span className="text-white/40">3–30 chars, lowercase, _ or -</span>;
    if (status === "available") return <span className="text-emerald-400">Available!</span>;
    return null;
  };

  return (
    <motion.div
      key="username"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.32, 0, 0.16, 1] }}
    >
      <h2
        className={cn(
          "text-3xl font-bold text-white mb-2",
          playfair.className
        )}
      >
        Pick your handle
      </h2>
      <p className="text-sm text-white/50 mb-8">
        This is how others will find and follow you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-white/70 text-xs uppercase tracking-wider">
            Username
          </Label>
          <div className="relative">
            <Input
              id="username"
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="yourhandle"
              disabled={isSubmitting}
              className={cn(
                "bg-white/5 border-white/10 text-white placeholder:text-white/20",
                "focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0",
                "pr-8",
                status === "taken" && "border-rose-500/50",
                status === "available" && "border-emerald-500/40",
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {statusIcon()}
            </div>
          </div>
          <div className="text-xs h-4">{statusText()}</div>
        </div>

        <Button
          type="submit"
          disabled={status !== "available" || isSubmitting}
          className={cn(
            "w-full h-11 rounded-full font-medium text-sm",
            "bg-white text-black hover:bg-white/90",
            "disabled:bg-white/10 disabled:text-white/30",
          )}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Setting up...</>
          ) : (
            <><span>Continue</span><ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </form>
    </motion.div>
  );
}

// ── Step: Genres ──────────────────────────────────────────────────────────────

function GenresStep({
  onNext,
  selected,
  setSelected,
}: {
  onNext: () => void;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      key="genres"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.32, 0, 0.16, 1] }}
    >
      <h2 className={cn("text-3xl font-bold text-white mb-2", playfair.className)}>
        What do you love?
      </h2>
      <p className="text-sm text-white/50 mb-6">
        Pick at least 3 genres — we&apos;ll use these to find books you&apos;ll actually read.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {GENRES.map((g) => {
          const active = selected.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150",
                active
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
              )}
            >
              {active && <Check className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
              {g.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/30">
          {selected.length}/15 selected {selected.length < 3 ? `(${3 - selected.length} more needed)` : ""}
        </span>
      </div>

      <Button
        onClick={onNext}
        disabled={selected.length < 3}
        className={cn(
          "w-full h-11 rounded-full font-medium text-sm",
          "bg-white text-black hover:bg-white/90",
          "disabled:bg-white/10 disabled:text-white/30",
        )}
      >
        <span>Continue</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}

// ── Step: Books you love ──────────────────────────────────────────────────────
//
// Up to four books the reader already loves. Each pick becomes a favourite
// (Top 4 on the profile) and a `read` shelf entry, which is the signal the
// recommendation engine actually ranks on — so the aha reveal that follows is
// personal, not just genre-flavoured.

function BooksStep({
  suggestions,
  loadingSuggestions,
  picks,
  setPicks,
  onNext,
  onImport,
}: {
  suggestions: AhaBook[];
  loadingSuggestions: boolean;
  picks: AhaBook[];
  setPicks: React.Dispatch<React.SetStateAction<AhaBook[]>>;
  onNext: () => void;
  onImport: (file: File) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<AhaBook[]>([]);
  const [searching, setSearching] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Debounced search; the newest request wins.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}&maxResults=8`);
        const data = await res.json();
        if (cancelled) return;
        const items: SearchItem[] = data.items ?? [];
        setResults(items.map(searchItemToBook).filter((b): b is AhaBook => !!b));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const isPicked = (id: string) => picks.some((p) => p.id === id);
  const toggle = (book: AhaBook) => {
    setPicks((prev) => {
      if (prev.some((p) => p.id === book.id)) return prev.filter((p) => p.id !== book.id);
      if (prev.length >= MAX_PICKS) {
        toast.message(`That's your top ${MAX_PICKS} — remove one to swap.`);
        return prev;
      }
      track("onboarding_book_selected", { title: book.title, source: query ? "search" : "suggested" });
      return [...prev, book];
    });
    setQuery("");
  };

  const grid = query.trim().length >= 2 ? results : suggestions;

  return (
    <motion.div
      key="books"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.32, 0, 0.16, 1] }}
    >
      <h2 className={cn("text-3xl font-bold text-white mb-2", playfair.className)}>
        Books you love
      </h2>
      <p className="text-sm text-white/50 mb-5">
        Pick up to {MAX_PICKS}. They become your Top 4 and teach us your taste.
      </p>

      {/* Picks tray */}
      <div className="flex gap-2 mb-5 min-h-[72px]">
        {Array.from({ length: MAX_PICKS }).map((_, i) => {
          const b = picks[i];
          return b ? (
            <button
              key={b.id}
              type="button"
              onClick={() => toggle(b)}
              title={`Remove ${b.title}`}
              className="relative w-12 h-[72px] rounded-md overflow-hidden ring-2 ring-white shadow-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div key={i} className="w-12 h-[72px] rounded-md border border-dashed border-white/15 bg-white/[0.03]" />
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a title or author"
          className="pl-9 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-white/40" />}
      </div>

      {/* Suggestions / results */}
      <div className="grid grid-cols-4 gap-2 mb-6 min-h-[120px]">
        {loadingSuggestions && grid.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-md bg-white/5 animate-pulse" style={{ aspectRatio: "2/3" }} />
          ))
        ) : (
          grid.slice(0, 12).map((b) => {
            const active = isPicked(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(b)}
                title={`${b.title}${b.author ? ` — ${b.author}` : ""}`}
                className={cn(
                  "relative rounded-md overflow-hidden transition-all",
                  active ? "ring-2 ring-white scale-[0.97]" : "ring-1 ring-white/10 hover:ring-white/40"
                )}
                style={{ aspectRatio: "2/3" }}
              >
                {b.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.cover} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-white/5 p-1.5 text-[10px] leading-tight text-white/60 text-left">
                    {b.title}
                  </div>
                )}
                {active && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <Button
        onClick={onNext}
        className={cn(
          "w-full h-11 rounded-full font-medium text-sm",
          "bg-white text-black hover:bg-white/90",
        )}
      >
        <span>{picks.length > 0 ? "Continue" : "Skip for now"}</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>

      {/* Goodreads import — secondary path, same step */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full text-center text-xs text-white/30 hover:text-white/50 py-3 transition-colors"
      >
        <Upload className="w-3 h-3 inline mr-1 -mt-0.5" />
        Import your Goodreads library instead
      </button>
    </motion.div>
  );
}

// ── Step: Readers to follow ───────────────────────────────────────────────────
//
// The feed is empty until you follow someone. Suggestions come from
// /users/suggested with a server-authored reason so the same explanation
// shows on every platform.

function ReadersStep({
  readers,
  loading,
  followed,
  onFollow,
  onNext,
}: {
  readers: SuggestedReader[];
  loading: boolean;
  followed: Set<string>;
  onFollow: (r: SuggestedReader) => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      key="readers"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.32, 0, 0.16, 1] }}
    >
      <h2 className={cn("text-3xl font-bold text-white mb-2", playfair.className)}>
        Readers to follow
      </h2>
      <p className="text-sm text-white/50 mb-6">
        Your home fills up with what they read, finish and write.
      </p>

      <div className="space-y-2 mb-6 min-h-[160px]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))
        ) : readers.length === 0 ? (
          <p className="text-sm text-white/40 py-6 text-center">
            You&apos;re early — no readers to suggest yet. You can find people from search any time.
          </p>
        ) : (
          readers.map((r) => {
            const done = followed.has(r.username);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/60 uppercase">
                      {(r.name || r.username).slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{r.name || r.username}</p>
                  <p className="text-xs text-white/40 truncate">
                    {r.reason}
                    {r.books_read_count > 0 ? ` · ${r.books_read_count} read` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={done}
                  onClick={() => onFollow(r)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    done
                      ? "bg-white/10 text-white/50"
                      : "bg-white text-black hover:bg-white/90"
                  )}
                >
                  {done ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                  {done ? "Following" : "Follow"}
                </button>
              </div>
            );
          })
        )}
      </div>

      <Button
        onClick={onNext}
        className={cn(
          "w-full h-11 rounded-full font-medium text-sm",
          "bg-white text-black hover:bg-white/90",
        )}
      >
        <span>{followed.size > 0 ? "Continue" : "Skip for now"}</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}

// ── Step: Aha Loading ─────────────────────────────────────────────────────────

function AhaLoadingStep() {
  const messages = [
    "Mapping your taste...",
    "Scanning 5M+ books...",
    "Weighing your picks...",
    "Almost there...",
  ];
  const [msgIdx, setMsgIdx] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % messages.length);
    }, 1200);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <motion.div
      key="aha-loading"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: [0.32, 0, 0.16, 1] }}
      className="flex flex-col items-center justify-center text-center py-12"
    >
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-white/60" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border border-white/20 animate-ping opacity-30" />
      </div>

      <h2 className={cn("text-3xl font-bold text-white mb-3", playfair.className)}>
        Finding your book
      </h2>

      <AnimatePresence mode="wait">
        <motion.p
          key={msgIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-white/50"
        >
          {messages[msgIdx]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Step: Aha Reveal ──────────────────────────────────────────────────────────

function AhaRevealStep({
  book,
  onAddToShelf,
  onShowAnother,
  onSkip,
  isAdding,
}: {
  book: AhaBook;
  onAddToShelf: () => void;
  onShowAnother: () => void;
  onSkip: () => void;
  isAdding: boolean;
}) {
  return (
    <motion.div
      key="aha-reveal"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.32, 0, 0.16, 1] }}
    >
      <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">
        Your first recommendation
      </p>
      <h2 className={cn("text-3xl font-bold text-white mb-8", playfair.className)}>
        We think you&apos;ll love this.
      </h2>

      <div className="flex gap-5 mb-8">
        {/* Book cover */}
        <div
          className="flex-shrink-0 rounded-lg overflow-hidden shadow-2xl"
          style={{ width: 100, height: 150 }}
        >
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white/20" />
            </div>
          )}
        </div>

        {/* Book info */}
        <div className="flex flex-col justify-center">
          <h3 className={cn("text-xl font-semibold text-white leading-tight mb-1", playfair.className)}>
            {book.title}
          </h3>
          <p className="text-sm text-white/50">{book.author}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={onAddToShelf}
          disabled={isAdding}
          className={cn(
            "w-full h-11 rounded-full font-medium text-sm",
            "bg-white text-black hover:bg-white/90",
            "disabled:bg-white/10 disabled:text-white/30",
          )}
        >
          {isAdding ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</>
          ) : (
            "Save to my shelves"
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={onShowAnother}
          className="w-full h-11 rounded-full text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium"
        >
          Show me another
        </Button>

        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-xs text-white/30 hover:text-white/50 py-2 transition-colors"
        >
          <SkipForward className="w-3 h-3 inline mr-1 -mt-0.5" />
          Skip to home
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Flow ─────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = React.useState<Step>(
    user?.username ? "genres" : "username"
  );
  const [username, setUsername] = React.useState(user?.username || "");
  const [genres, setGenres] = React.useState<string[]>([]);
  const [suggestions, setSuggestions] = React.useState<AhaBook[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [picks, setPicks] = React.useState<AhaBook[]>([]);
  const [readers, setReaders] = React.useState<SuggestedReader[]>([]);
  const [loadingReaders, setLoadingReaders] = React.useState(false);
  const [followed, setFollowed] = React.useState<Set<string>>(new Set());
  const [ahaBook, setAhaBook] = React.useState<AhaBook | null>(null);
  const [ahaPool, setAhaPool] = React.useState<AhaBook[]>([]);
  const [ahaIdx, setAhaIdx] = React.useState(0);
  const [isAdding, setIsAdding] = React.useState(false);
  const startedAt = React.useRef(Date.now());

  React.useEffect(() => {
    track("onboarding_started", { entry_step: user?.username ? "genres" : "username" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Distribute covers across 4 columns
  const col1 = BOOK_COVERS.slice(0, 6);
  const col2 = BOOK_COVERS.slice(5, 12);
  const col3 = BOOK_COVERS.slice(11, 18);
  const col4 = BOOK_COVERS.slice(17, 24);

  const finish = React.useCallback(
    (extra: Record<string, unknown> = {}) => {
      track("onboarding_completed", {
        books_selected: picks.length,
        people_followed: followed.size,
        genres: genres.length,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
        ...extra,
      });
      onComplete();
    },
    [picks.length, followed.size, genres.length, onComplete]
  );

  const handleUsernameNext = (uname: string) => {
    setUsername(uname);
    setStep("genres");
  };

  // Genres are saved as soon as they're chosen so (a) the picker suggestions
  // and every later recommendation call are genre-aware, and (b) a reader
  // who bails after this step is still onboarded rather than bounced back.
  const handleGenresNext = async () => {
    setStep("books");
    setLoadingSuggestions(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genres, authors: [] }),
      });
      const fd = new FormData();
      fd.append("genres", JSON.stringify(genres));
      fd.append("limit", "12");
      const res = await fetch("/api/onboarding/aha", { method: "POST", body: fd });
      const data = await res.json();
      setSuggestions((data.books || []).filter((b: AhaBook) => b.cover && b.title));
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Goodreads import from the books step: kicks off in the background, the
  // reader keeps going. The picks step still works either way.
  const handleImport = (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    toast.message("Importing your Goodreads library…");
    fetch("/api/import/goodreads", { method: "POST", body: fd })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          toast.error(d.error || "Import failed — you can retry from your profile");
          return;
        }
        // Never report a partial import as a clean success: a 500-book library
        // that lands 40 used to say "Imported 40 books" and nothing else.
        const notes: string[] = [];
        if (d.failed > 0) {
          notes.push(
            d.rateLimited
              ? `${d.failed} hit a rate limit — retry from your profile`
              : `${d.failed} couldn't be saved — retry from your profile`,
          );
        }
        if (d.notFound > 0) notes.push(`${d.notFound} aren't on Paperboxd yet`);
        if (d.truncated) notes.push(`only the first ${d.processed} of ${d.total} rows were read`);

        if (d.imported > 0) {
          toast.success(`Imported ${d.imported} ${d.imported === 1 ? "book" : "books"} from Goodreads`, {
            description: notes.length ? notes.join(" · ") : undefined,
            duration: notes.length ? 8000 : 4000,
          });
        } else {
          toast.error("Nothing could be imported", {
            description: notes.length ? notes.join(" · ") : "Your CSV had no rows we could match.",
            duration: 8000,
          });
        }
      })
      .catch(() => toast.error("Import failed — you can retry from your profile"));
  };

  // Persist picks: favourite (Top 4) + read shelf entry. Fire all in parallel;
  // a failure on one book must not block the rest or the flow.
  const handleBooksNext = async () => {
    setStep("readers");
    setLoadingReaders(true);
    // display_order = pick order, so the Top 4 reads in the order they chose.
    const save = picks.map(async (b, i) => {
      const post = (payload: Record<string, unknown>) =>
        fetch(`/api/users/${encodeURIComponent(username)}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: b.id, ...payload }),
        }).catch(() => {});
      await post({ type: "bookshelf", status: "read" });
      await post({ type: "favorite", displayOrder: i + 1 });
    });
    const load = fetch("/api/onboarding/suggested-readers?limit=6")
      .then((r) => r.json())
      .then((d) => setReaders(d.users ?? []))
      .catch(() => setReaders([]));
    await Promise.all([...save, load]);
    setLoadingReaders(false);
  };

  const handleFollow = async (r: SuggestedReader) => {
    setFollowed((prev) => new Set(prev).add(r.username));
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(r.username)}/follow`, { method: "POST" });
      if (!res.ok) throw new Error();
      track("onboarding_reader_followed", { username: r.username, reason: r.reason });
    } catch {
      setFollowed((prev) => {
        const next = new Set(prev);
        next.delete(r.username);
        return next;
      });
      toast.error(`Couldn't follow ${r.name || r.username}`);
    }
  };

  const handleReadersNext = async () => {
    setStep("aha-loading");
    try {
      const fd = new FormData();
      fd.append("genres", JSON.stringify(genres));
      const res = await fetch("/api/onboarding/aha", { method: "POST", body: fd });
      const data = await res.json();
      const pickedIds = new Set(picks.map((p) => p.id));
      const books: AhaBook[] = (data.books || []).filter(
        (b: AhaBook) => b.cover && b.title && !pickedIds.has(b.id)
      );
      if (books.length > 0) {
        setAhaPool(books);
        setAhaBook(books[0]);
        setAhaIdx(0);
        setStep("aha-reveal");
      } else {
        finish({ aha: "none" });
      }
    } catch {
      toast.error("Something went wrong. Taking you home.");
      finish({ aha: "error" });
    }
  };

  const handleAddToShelf = async () => {
    if (!ahaBook) return;
    setIsAdding(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/books`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: ahaBook.id, type: "tbr" }),
        }
      );
      if (res.ok) {
        toast.success("Added to your shelves!");
      }
    } catch {
      // Silent fail — don't block navigation
    } finally {
      setIsAdding(false);
      finish({ aha: "saved" });
    }
  };

  const handleShowAnother = () => {
    if (ahaPool.length === 0) { finish({ aha: "none" }); return; }
    const next = (ahaIdx + 1) % ahaPool.length;
    setAhaIdx(next);
    setAhaBook(ahaPool[next]);
  };

  return (
    <main
      className="fixed inset-0 flex overflow-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Left panel: scrolling cover mosaic */}
      <div
        className="relative hidden lg:block flex-shrink-0 overflow-hidden"
        style={{ width: "52%", background: "#080808" }}
      >
        <div className="absolute inset-0 flex gap-2 px-2">
          <CoverColumn direction="up" speed={55} covers={col1} />
          <CoverColumn direction="down" speed={70} covers={col2} />
          <CoverColumn direction="up" speed={44} covers={col3} />
          <CoverColumn direction="down" speed={62} covers={col4} />
        </div>
        {/* Fades */}
        <div className="absolute inset-x-0 top-0 h-28 pointer-events-none z-10"
          style={{ background: "linear-gradient(to bottom, #080808, transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-52 pointer-events-none z-10"
          style={{ background: "linear-gradient(to top, #080808, transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-24 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, transparent, #080808)" }} />

        {/* Wordmark */}
        <div className="absolute bottom-8 left-8 z-20 select-none">
          <p className={cn("text-[2.4rem] leading-none text-white", pinyonScript.className)}>
            PaperBoxd
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/30 font-medium">
            Your reading universe
          </p>
        </div>
      </div>

      {/* Right panel: form content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile wordmark */}
          <div className="mb-6 lg:hidden text-center select-none">
            <p className={cn("text-[2.2rem] leading-none text-white", pinyonScript.className)}>
              PaperBoxd
            </p>
          </div>

          <StageHeader step={step} />

          <AnimatePresence mode="wait">
            {step === "username" && (
              <UsernameStep key="username" onNext={handleUsernameNext} />
            )}
            {step === "genres" && (
              <GenresStep
                key="genres"
                onNext={handleGenresNext}
                selected={genres}
                setSelected={setGenres}
              />
            )}
            {step === "books" && (
              <BooksStep
                key="books"
                suggestions={suggestions}
                loadingSuggestions={loadingSuggestions}
                picks={picks}
                setPicks={setPicks}
                onNext={handleBooksNext}
                onImport={handleImport}
              />
            )}
            {step === "readers" && (
              <ReadersStep
                key="readers"
                readers={readers}
                loading={loadingReaders}
                followed={followed}
                onFollow={handleFollow}
                onNext={handleReadersNext}
              />
            )}
            {step === "aha-loading" && <AhaLoadingStep key="aha-loading" />}
            {step === "aha-reveal" && ahaBook && (
              <AhaRevealStep
                key="aha-reveal"
                book={ahaBook}
                onAddToShelf={handleAddToShelf}
                onShowAnother={handleShowAnother}
                onSkip={() => finish({ aha: "skipped" })}
                isAdding={isAdding}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
