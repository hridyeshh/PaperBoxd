"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { Trophy, BookOpen, FileText, Flame, Users, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Header } from "@/components/ui/layout/header-with-search";
import { HomeLayoutHeader } from "@/components/ui/layout/home-layout-header";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
});

// ── Comic speed lines (precomputed, static — no re-render cost) ───────────────
// 26 lines fanning downward from top-center, alternating thick/thin like real comic action lines.
const SPEED_LINES = Array.from({ length: 26 }, (_, i) => {
  const t = i / 25;
  const angle = Math.PI * 0.07 + t * Math.PI * 0.86; // 12.6° → 154.8°
  const len = 2100;
  return {
    x2: Math.round(720 + Math.cos(angle) * len),
    y2: Math.round(-70 + Math.sin(angle) * len),
    thick: i % 5 === 2,
  };
});

// ── Types ─────────────────────────────────────────────────────────────────────

type LeaderboardEntry = {
  user_id: string;
  username: string;
  books_read: number;
  pages_read: number;
  diary_entries: number;
  genres_explored: number;
  total_xp: number;
  level: number;
  current_streak: number;
  xp_rank: number | null;
  books_rank: number | null;
  pages_rank: number | null;
  diary_rank: number | null;
  streak_rank: number | null;
  genres_rank: number | null;
  level_name: string;
  level_badge: string;
};

type Tab = "global" | "books" | "pages" | "streak" | "diary" | "friends";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  ["#3a7bd5", "#1a1a5e"],
  ["#b85c38", "#7a3820"],
  ["#5a8050", "#2d4a27"],
  ["#a8893f", "#5c4a1a"],
  ["#6b4c9a", "#3a2060"],
  ["#2a7d8a", "#143a42"],
  ["#c0392b", "#7a1a14"],
  ["#16a085", "#0d5a4a"],
];

function avatarGradient(username: string): string {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff;
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function fmtXP(xp: number | undefined | null): string {
  const n = xp ?? 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getStatForTab(entry: LeaderboardEntry, tab: Tab): { value: number; label: string } {
  switch (tab) {
    case "books":  return { value: entry.books_read,     label: "books"   };
    case "pages":  return { value: entry.pages_read,     label: "pages"   };
    case "streak": return { value: entry.current_streak, label: "day streak" };
    case "diary":  return { value: entry.diary_entries,  label: "entries" };
    default:       return { value: entry.total_xp,       label: "XP"      };
  }
}

// ── Medal config ──────────────────────────────────────────────────────────────

const MEDAL = {
  1: {
    color:    "oklch(0.68 0.11 78)",
    border:   "oklch(0.68 0.11 78 / 0.45)",
    bg:       "oklch(0.68 0.11 78 / 0.07)",
    ring:     "0 0 0 2.5px oklch(0.68 0.11 78), 0 6px 28px oklch(0.68 0.11 78 / 0.22)",
    topPad:   "pt-0",
    numSize:  "2.75rem",
    statSize: "1.5rem",
  },
  2: {
    color:    "oklch(0.68 0.015 0)",
    border:   "oklch(0.68 0.015 0 / 0.35)",
    bg:       "oklch(0.68 0.015 0 / 0.05)",
    ring:     undefined,
    topPad:   "pt-10",
    numSize:  "2rem",
    statSize: "1.125rem",
  },
  3: {
    color:    "oklch(0.60 0.07 50)",
    border:   "oklch(0.60 0.07 50 / 0.32)",
    bg:       "oklch(0.60 0.07 50 / 0.05)",
    ring:     undefined,
    topPad:   "pt-16",
    numSize:  "2rem",
    statSize: "1.125rem",
  },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function AvatarCircle({
  username,
  size = 40,
  className,
  style,
}: {
  username: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        background: avatarGradient(username),
        fontSize: size * 0.35,
        ...style,
      }}
    >
      {initials(username)}
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  tab,
  onClick,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  tab: Tab;
  onClick: () => void;
}) {
  const stat = getStatForTab(entry, tab);
  const m = MEDAL[rank];

  return (
    <div className={m.topPad}>
      <button
        onClick={onClick}
        className="group relative flex w-full flex-col items-center rounded-2xl border p-5 text-center transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl"
        style={{ borderColor: m.border, background: m.bg }}
      >
        {/* Trophy icon for rank 1 */}
        {rank === 1 && (
          <Trophy className="mb-1 h-6 w-6" style={{ color: m.color }} />
        )}

        {/* Large rank number */}
        <div
          className="mb-3 font-mono font-black leading-none"
          style={{ fontSize: m.numSize, color: m.color }}
        >
          {rank}
        </div>

        {/* Avatar */}
        <AvatarCircle
          username={entry.username}
          size={rank === 1 ? 72 : 60}
          className="mb-2.5"
          style={m.ring ? { boxShadow: m.ring } : undefined}
        />

        {/* Username */}
        <p className="text-sm font-bold leading-tight tracking-tight">{entry.username}</p>

        {/* Primary stat */}
        <p
          className="mt-2.5 font-mono font-black leading-none"
          style={{ fontSize: m.statSize, color: m.color }}
        >
          {tab === "global" ? fmtXP(stat.value) : stat.value.toLocaleString()}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {stat.label}
        </p>

        {/* Level name */}
        <div className="mt-3 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {entry.level_name}
        </div>
      </button>
    </div>
  );
}

function LeaderboardRow({
  entry,
  index,
  tab,
  isMe,
  onClick,
}: {
  entry: LeaderboardEntry;
  index: number;
  tab: Tab;
  isMe: boolean;
  onClick: () => void;
}) {
  const displayRank = index + 1;
  const stat = getStatForTab(entry, tab);

  return (
    <button
      onClick={onClick}
      className={cn(
        "grid w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-100",
        "border-b border-border last:border-b-0",
        "hover:bg-muted/60",
      )}
      style={{
        gridTemplateColumns: "44px 1fr auto auto auto",
        ...(isMe ? { background: "oklch(0.52 0.18 25 / 0.05)" } : {}),
        animationName: "lb-row-in",
        animationDuration: "0.3s",
        animationTimingFunction: "ease-out",
        animationFillMode: "both",
        animationDelay: `${Math.min(index * 40, 600)}ms`,
      }}
    >
      {/* Rank number */}
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "font-mono font-bold",
            displayRank <= 10 ? "text-sm text-foreground" : "text-sm text-muted-foreground",
          )}
        >
          {displayRank}
        </span>
      </div>

      {/* User */}
      <div className="flex min-w-0 items-center gap-2.5">
        <AvatarCircle username={entry.username} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold leading-tight">{entry.username}</span>
            {isMe && (
              <span className="flex-shrink-0 rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide bg-foreground text-background">
                You
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{entry.level_name}</span>
        </div>
      </div>

      {/* Streak */}
      <div className="hidden min-w-[72px] items-center justify-end gap-1 sm:flex">
        <Flame className="h-3.5 w-3.5" style={{ color: "oklch(0.52 0.18 25)" }} />
        <span className="font-mono text-sm font-semibold" style={{ color: "oklch(0.52 0.18 25)" }}>
          {entry.current_streak}d
        </span>
      </div>

      {/* Books */}
      <div className="hidden min-w-[64px] items-center justify-end gap-1 md:flex">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-sm font-medium text-muted-foreground">{entry.books_read}</span>
      </div>

      {/* Primary stat */}
      <div className="min-w-[72px] text-right">
        <span className="font-mono text-base font-semibold leading-none tracking-tight">
          {tab === "global" ? fmtXP(stat.value) : stat.value.toLocaleString()}
        </span>
        {tab === "global" && (
          <span className="ml-0.5 font-mono text-[10px] font-medium text-muted-foreground">xp</span>
        )}
      </div>
    </button>
  );
}

function ColumnHeaders({ tab }: { tab: Tab }) {
  return (
    <div
      className="grid items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5"
      style={{ gridTemplateColumns: "44px 1fr auto auto auto" }}
    >
      <span className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">#</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Reader</span>
      <span className="hidden min-w-[72px] text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:block">Streak</span>
      <span className="hidden min-w-[64px] text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:block">Books</span>
      <span className="min-w-[72px] text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {tab === "books" ? "Books" : tab === "pages" ? "Pages" : tab === "streak" ? "Streak" : tab === "diary" ? "Entries" : "XP"}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      {/* Podium skeleton */}
      <div className="mb-8 grid grid-cols-3 items-end gap-3">
        <div className="pt-10">
          <div className="h-52 animate-pulse rounded-2xl border border-border bg-muted/40" />
        </div>
        <div className="pt-0">
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/40" />
        </div>
        <div className="pt-16">
          <div className="h-44 animate-pulse rounded-2xl border border-border bg-muted/40" />
        </div>
      </div>
      {/* Row skeletons */}
      <div className="overflow-hidden rounded-2xl border border-border">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0"
          >
            <div className="h-4 w-7 animate-pulse rounded bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="hidden h-4 w-14 animate-pulse rounded bg-muted sm:block" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [tab, setTab] = React.useState<Tab>("global");
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = React.useState<LeaderboardEntry | null>(null);
  const [cookieStreak, setCookieStreak] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Cache key per tab for stale-while-revalidate
  const lbCacheKey = `pb_lb_${tab}`;

  // Load cached entries immediately on tab change
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(lbCacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as { list: LeaderboardEntry[] };
        if (Array.isArray(cached.list) && cached.list.length > 0) {
          setEntries(cached.list);
          setIsLoading(false); // show stale data immediately, fetch in background
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  React.useEffect(() => {
    setIsLoading(true);
    setError(null);

    const url =
      tab === "friends"
        ? "/api/leaderboard/friends"
        : `/api/leaderboard?tab=${tab}`;

    fetch(url)
      .then((r) => {
        if (r.status === 429 || r.status === 503) {
          // Keep showing cached entries — don't clear
          setIsLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const list: LeaderboardEntry[] = (data.leaderboard ?? []) as LeaderboardEntry[];
        setEntries(list);
        // Persist for next load / rate-limit fallback
        try { localStorage.setItem(lbCacheKey, JSON.stringify({ list, ts: Date.now() })); } catch { /* ignore */ }
      })
      .catch(() => {
        // Keep existing entries visible on network error
        if (entries.length === 0) setError("Failed to load leaderboard");
      })
      .finally(() => setIsLoading(false));
  }, [tab]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/leaderboard/me")
      .then((r) => r.json())
      .then((data) => setMyStats(data as LeaderboardEntry))
      .catch(() => null);
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated || !user?.username) return;
    fetch(`/api/users/${encodeURIComponent(user.username)}/streak`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && typeof data.streak === "number") setCookieStreak(data.streak); })
      .catch(() => null);
  }, [isAuthenticated, user?.username]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; requiresAuth?: boolean }[] = [
    { id: "global",  label: "All-time",  icon: <Trophy className="h-3.5 w-3.5" /> },
    { id: "books",   label: "By Books",  icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "pages",   label: "By Pages",  icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "streak",  label: "By Streak", icon: <Flame className="h-3.5 w-3.5" /> },
    { id: "diary",   label: "By Diary",  icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "friends", label: "Friends",   icon: <Users className="h-3.5 w-3.5" />, requiresAuth: true },
  ];

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Podium order: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder: (0 | 1 | 2)[] = top3.length === 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];
  const podiumRanks: (1 | 2 | 3)[] = top3.length === 3 ? [2, 1, 3] : top3.length === 2 ? [2, 1] : [1];

  const handleUserClick = (username: string) => router.push(`/u/${username}`);

  const myXpRank = myStats?.xp_rank;

  return (
    <main className="relative min-h-screen bg-background leaderboard-page">
      {/* Comic speed lines — fixed, behind all content */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full text-[#c24036] opacity-[0.032] dark:opacity-[0.048]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMin slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {SPEED_LINES.map(({ x2, y2, thick }, i) => (
          <line
            key={i}
            x1="720"
            y1="-70"
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth={thick ? "1.8" : "0.7"}
          />
        ))}
      </svg>

      <div className="flex min-h-screen flex-col">
        {isMobile ? (
          <Header minimalMobile={isMobile} />
        ) : (
          <HomeLayoutHeader />
        )}

        <div className="flex-1 mt-16">
          <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-10 sm:px-6 lg:px-8">

            {/* ── Page heading ── */}
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h1 className={cn("text-5xl font-bold tracking-tight text-foreground md:text-6xl", playfair.className)}>
                  The Reading Order
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  ranked by reading devotion
                </p>
              </div>
              {isAuthenticated && myStats && (
                <div className="hidden flex-col items-end sm:flex flex-shrink-0">
                  <span
                    className="font-mono text-3xl font-black leading-none tabular-nums"
                    style={{ color: "oklch(0.52 0.18 25)" }}
                  >
                    #{myXpRank ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">your rank</span>
                </div>
              )}
            </div>

            {/* ── Tabs (pill segmented control) ── */}
            <div className="mb-8 flex overflow-x-auto rounded-2xl border border-border bg-muted/30 p-1 gap-0.5 scrollbar-hide">
              {tabs.map(({ id, label, icon, requiresAuth }) => {
                const disabled = requiresAuth && !isAuthenticated;
                const isActive = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (disabled) { router.push("/auth"); return; }
                      setTab(id);
                    }}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 whitespace-nowrap",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                      disabled && "opacity-50",
                    )}
                  >
                    {icon}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── Loading ── */}
            {isLoading && <LoadingSkeleton />}

            {/* ── Error ── */}
            {!isLoading && error && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="font-semibold text-foreground">Failed to load</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            )}

            {/* ── Empty ── */}
            {!isLoading && !error && entries.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Trophy className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">
                  {tab === "friends" ? "No friends on the board yet" : "No data yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === "friends"
                    ? "Follow some readers to see how you stack up."
                    : "Start reading to claim your spot."}
                </p>
              </div>
            )}

            {/* ── Podium (top 3) ── */}
            {!isLoading && !error && top3.length > 0 && (
              <div
                className={cn(
                  "mb-8 grid items-end gap-3",
                  top3.length === 3 ? "grid-cols-3" : top3.length === 2 ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto",
                )}
              >
                {podiumOrder.map((entryIdx, posIdx) => {
                  const entry = top3[entryIdx];
                  if (!entry) return null;
                  const rank = podiumRanks[posIdx] as 1 | 2 | 3;
                  return (
                    <PodiumCard
                      key={entry.user_id}
                      entry={entry}
                      rank={rank}
                      tab={tab}
                      onClick={() => handleUserClick(entry.username)}
                    />
                  );
                })}
              </div>
            )}

            {/* ── Ranked list (4th onwards) ── */}
            {!isLoading && !error && rest.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <ColumnHeaders tab={tab} />
                {rest.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.user_id}
                    entry={entry}
                    index={i + 3}
                    tab={tab}
                    isMe={myStats?.user_id === entry.user_id}
                    onClick={() => handleUserClick(entry.username)}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Sticky your-rank footer ── */}
      {isAuthenticated && myStats && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-10 bg-gradient-to-t from-background via-background/92 to-transparent">
          <div className="mx-auto max-w-4xl">
            <div
              className={cn(
                "flex items-center gap-4 rounded-2xl px-5 py-4 shadow-xl",
                "bg-foreground text-background dark:bg-card dark:text-foreground dark:border dark:border-border",
              )}
            >
              {/* Rank */}
              <div className="flex flex-col items-center flex-shrink-0">
                <span className="font-mono text-2xl font-black leading-none tabular-nums">
                  {myXpRank ?? "—"}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest opacity-55">
                  rank
                </span>
              </div>

              <div className="h-9 w-px bg-white/15 dark:bg-border flex-shrink-0" />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">{user?.username}</p>
                <p className="text-xs opacity-60">
                  {myStats.level_name} · {fmtXP(myStats.total_xp)} XP
                </p>
              </div>

              {/* Stats */}
              <div className="hidden items-center gap-5 sm:flex">
                <div className="text-center">
                  <p className="font-mono text-base font-semibold leading-none tabular-nums">{myStats.books_read}</p>
                  <p className="text-[10px] font-medium uppercase tracking-widest opacity-55">books</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-base font-semibold leading-none tabular-nums">{(cookieStreak ?? myStats.current_streak)}d</p>
                  <p className="text-[10px] font-medium uppercase tracking-widest opacity-55">streak</p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push(`/u/${user?.username}`)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                  "bg-white/12 hover:bg-white/20",
                  "dark:bg-muted dark:text-foreground dark:hover:bg-muted/80",
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                View profile
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
