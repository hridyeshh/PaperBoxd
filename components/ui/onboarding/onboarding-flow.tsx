"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, Upload, ChevronRight, BookOpen, SkipForward } from "lucide-react";
import { Pinyon_Script, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/primitives/input";
import { Button } from "@/components/ui/primitives/button";
import { Label } from "@/components/ui/primitives/label";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

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

const TEMPO_OPTIONS = [
  { id: "casual", label: "Casual", sub: "1–3 books / month" },
  { id: "regular", label: "Regular", sub: "About 1 / week" },
  { id: "voracious", label: "Voracious", sub: "Multiple per week" },
];

const STAGE_LABELS = ["Sign up", "Set up", "Aha"];

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "username" | "genres" | "tempo" | "aha-loading" | "aha-reveal";

type AhaBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stageForStep(step: Step): number {
  return step === "aha-loading" || step === "aha-reveal" ? 2 : 1;
}

function subStepForStep(step: Step): number {
  if (step === "username") return 1;
  if (step === "genres") return 2;
  return 3;
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
  const inSetup = step === "username" || step === "genres" || step === "tempo";

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
          Step {sub} of 3
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

// ── Step: Tempo + Import ──────────────────────────────────────────────────────

function TempoStep({
  onNext,
  tempo,
  setTempo,
}: {
  onNext: (file: File | null) => void;
  tempo: string;
  setTempo: (t: string) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleNext = async () => {
    if (!tempo) return;
    setImporting(true);
    onNext(file);
  };

  return (
    <motion.div
      key="tempo"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.32, 0, 0.16, 1] }}
    >
      <h2 className={cn("text-3xl font-bold text-white mb-2", playfair.className)}>
        How fast do you read?
      </h2>
      <p className="text-sm text-white/50 mb-6">
        Helps us pace recommendations for your schedule.
      </p>

      <div className="space-y-2 mb-8">
        {TEMPO_OPTIONS.map((opt) => {
          const active = tempo === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTempo(opt.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all",
                active
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/8 hover:border-white/20"
              )}
            >
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className={cn("text-xs mt-0.5", active ? "text-black/60" : "text-white/40")}>
                  {opt.sub}
                </p>
              </div>
              {active && <Check className="w-4 h-4 text-black/70 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Goodreads import */}
      <div className="mb-8 rounded-xl border border-white/8 bg-white/3 p-4">
        <p className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1">
          Optional
        </p>
        <p className="text-sm text-white/80 font-medium mb-1">Import from Goodreads</p>
        <p className="text-xs text-white/40 mb-3">
          Export your library from Goodreads and upload the CSV — we&apos;ll add your books automatically.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
            file
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:text-white/70"
          )}
        >
          {file ? (
            <><Check className="w-3.5 h-3.5" />{file.name}</>
          ) : (
            <><Upload className="w-3.5 h-3.5" />Choose CSV file</>
          )}
        </button>
      </div>

      <Button
        onClick={handleNext}
        disabled={!tempo || importing}
        className={cn(
          "w-full h-11 rounded-full font-medium text-sm",
          "bg-white text-black hover:bg-white/90",
          "disabled:bg-white/10 disabled:text-white/30",
        )}
      >
        {importing ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Building your profile...</>
        ) : (
          <><span>Get my recommendations</span><ChevronRight className="w-4 h-4 ml-1" /></>
        )}
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
  const [tempo, setTempo] = React.useState("regular");
  const [ahaBook, setAhaBook] = React.useState<AhaBook | null>(null);
  const [ahaPool, setAhaPool] = React.useState<AhaBook[]>([]);
  const [ahaIdx, setAhaIdx] = React.useState(0);
  const [isAdding, setIsAdding] = React.useState(false);

  // Distribute covers across 4 columns
  const col1 = BOOK_COVERS.slice(0, 6);
  const col2 = BOOK_COVERS.slice(5, 12);
  const col3 = BOOK_COVERS.slice(11, 18);
  const col4 = BOOK_COVERS.slice(17, 24);

  const handleUsernameNext = (uname: string) => {
    setUsername(uname);
    setStep("genres");
  };

  const handleGenresNext = () => {
    setStep("tempo");
  };

  const handleTempoNext = async (file: File | null) => {
    setStep("aha-loading");

    try {
      // Save genres first so the recommendation engine has them before we query it
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genres, authors: [] }),
      });

      // Build the aha recommendation request (multipart so CSV travels with genres)
      const ahaFd = new FormData();
      ahaFd.append("genres", JSON.stringify(genres));
      if (file) ahaFd.append("file", file);

      // Fetch aha recommendation and (optionally) import Goodreads shelf in parallel
      const parallelTasks: Promise<unknown>[] = [
        fetch("/api/onboarding/aha", { method: "POST", body: ahaFd }),
      ];

      if (file) {
        const importFd = new FormData();
        importFd.append("file", file);
        parallelTasks.push(
          fetch("/api/import/goodreads", { method: "POST", body: importFd })
            .then(async (r) => {
              if (r.ok) {
                const d = await r.json();
                if (d.imported > 0) toast.success(`Imported ${d.imported} books from Goodreads`);
              }
            })
            .catch(() => {})
        );
      }

      const [ahaRes] = await Promise.all(parallelTasks) as [Response, ...unknown[]];
      const ahaData = await ahaRes.json();
      const books: AhaBook[] = (ahaData.books || []).filter(
        (b: AhaBook) => b.cover && b.title
      );

      if (books.length > 0) {
        setAhaPool(books);
        setAhaBook(books[0]);
        setAhaIdx(0);
        setStep("aha-reveal");
      } else {
        onComplete();
      }
    } catch {
      toast.error("Something went wrong. Taking you home.");
      onComplete();
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
      onComplete();
    }
  };

  const handleShowAnother = () => {
    if (ahaPool.length === 0) { onComplete(); return; }
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
            {step === "tempo" && (
              <TempoStep
                key="tempo"
                onNext={handleTempoNext}
                tempo={tempo}
                setTempo={setTempo}
              />
            )}
            {step === "aha-loading" && <AhaLoadingStep key="aha-loading" />}
            {step === "aha-reveal" && ahaBook && (
              <AhaRevealStep
                key="aha-reveal"
                book={ahaBook}
                onAddToShelf={handleAddToShelf}
                onShowAnother={handleShowAnother}
                onSkip={onComplete}
                isAdding={isAdding}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
