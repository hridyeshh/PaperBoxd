"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { Trophy, Zap, BookOpen, FileText, Flame, Users, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Header } from "@/components/ui/layout/header-with-search";
import { DesktopSidebar } from "@/components/ui/layout/desktop-sidebar";
import { MinimalDesktopHeader } from "@/components/ui/layout/minimal-desktop-header";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
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
    case "books":    return { value: entry.books_read, label: "books" };
    case "pages":    return { value: entry.pages_read, label: "pages" };
    case "streak":   return { value: entry.current_streak, label: "day streak" };
    case "diary":    return { value: entry.diary_entries, label: "entries" };
    default:         return { value: entry.total_xp, label: "XP" };
  }
}

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
  isFirst,
  tab,
  onClick,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  isFirst?: boolean;
  tab: Tab;
  onClick: () => void;
}) {
  const stat = getStatForTab(entry, tab);
  const medalColors = {
    1: { bg: "rgba(168,137,63,.10)", border: "#a8893f", text: "#a8893f", dark: { bg: "rgba(212,176,106,.12)", text: "#d4b06a" } },
    2: { bg: "rgba(138,133,128,.10)", border: "#8a8580", text: "#8a8580", dark: { bg: "rgba(184,179,173,.10)", text: "#b8b3ad" } },
    3: { bg: "rgba(156,106,62,.10)", border: "#9c6a3e", text: "#9c6a3e", dark: { bg: "rgba(192,133,96,.10)", text: "#c08560" } },
  }[rank];

  const rankLabels = { 1: "1st", 2: "2nd", 3: "3rd" };
  const avatarSize = isFirst ? 72 : 60;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-center rounded-2xl border p-5 text-center transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-xl",
        "border-border bg-card",
        isFirst && "border-[rgba(168,137,63,.25)] bg-gradient-to-b from-[rgba(168,137,63,.08)] to-card dark:from-[rgba(212,176,106,.12)] dark:to-card",
      )}
    >
      {/* Medal + rank label */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2", playfair.className)}
          style={{
            background: medalColors.bg,
            borderColor: medalColors.border,
            color: medalColors.text,
            fontWeight: 700,
            fontSize: "0.875rem",
          }}
        >
          {rank}
        </div>
        <span
          className={cn("text-sm text-muted-foreground", playfair.className)}
          style={{ fontStyle: "italic" }}
        >
          {rankLabels[rank]}
        </span>
      </div>

      {/* Avatar */}
      <AvatarCircle
        username={entry.username}
        size={avatarSize}
        className="mb-2.5"
        style={
          isFirst
            ? {
                boxShadow: "0 0 0 2px #a8893f, 0 8px 24px rgba(168,137,63,.25)",
              }
            : undefined
        }
      />

      {/* Name / handle */}
      <p className="text-sm font-bold leading-tight tracking-tight">{entry.username}</p>
      <p className="mb-3 mt-0.5 text-xs text-muted-foreground">@{entry.username}</p>

      {/* Primary stat */}
      <p
        className={cn("font-mono font-semibold leading-none tracking-tight", isFirst ? "text-2xl" : "text-xl")}
      >
        {tab === "global" ? fmtXP(stat.value) : stat.value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {stat.label}
      </p>

      {/* Level badge */}
      <div className="mt-3 flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1">
        <span className="text-xs">{entry.level_badge}</span>
        <span
          className={cn("text-xs font-semibold text-muted-foreground", playfair.className)}
          style={{ fontStyle: "italic" }}
        >
          {entry.level_name}
        </span>
      </div>
    </button>
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
        "grid w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-100",
        "border-b border-border last:border-b-0",
        isMe
          ? "bg-[rgba(184,92,56,.06)] hover:bg-[rgba(184,92,56,.09)] dark:bg-[rgba(217,127,90,.08)] dark:hover:bg-[rgba(217,127,90,.12)]"
          : "hover:bg-muted/60",
      )}
      style={{ gridTemplateColumns: "44px 1fr auto auto auto" }}
    >
      {/* Rank */}
      <div className="flex items-center justify-center">
        <span className="font-mono text-sm font-semibold text-muted-foreground">
          {displayRank}
        </span>
      </div>

      {/* User */}
      <div className="flex min-w-0 items-center gap-2.5">
        <AvatarCircle username={entry.username} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold leading-tight">
              {entry.username}
            </span>
            {isMe && (
              <span className="flex-shrink-0 rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide bg-foreground text-background">
                You
              </span>
            )}
          </div>
          <span
            className={cn("text-xs text-muted-foreground", playfair.className)}
            style={{ fontStyle: "italic" }}
          >
            {entry.level_badge} {entry.level_name}
          </span>
        </div>
      </div>

      {/* Streak — hidden on very small screens */}
      <div className="hidden min-w-[72px] items-center justify-end gap-1 sm:flex">
        <Flame className="h-3.5 w-3.5 text-[#b85c38] dark:text-[#d97f5a]" />
        <span className="font-mono text-sm font-semibold text-[#b85c38] dark:text-[#d97f5a]">
          {entry.current_streak}d
        </span>
      </div>

      {/* Books — hidden on mobile */}
      <div className="hidden min-w-[64px] items-center justify-end gap-1 md:flex">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-sm font-medium text-muted-foreground">
          {entry.books_read}
        </span>
      </div>

      {/* Primary stat (XP or tab-specific) */}
      <div className="min-w-[72px] text-right">
        <span className="font-mono text-base font-semibold leading-none tracking-tight">
          {tab === "global" ? fmtXP(stat.value) : stat.value.toLocaleString()}
        </span>
        <span className="ml-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          {tab === "global" ? "xp" : ""}
        </span>
      </div>
    </button>
  );
}

function ColumnHeaders({ tab }: { tab: Tab }) {
  return (
    <div
      className="grid items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5"
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [tab, setTab] = React.useState<Tab>("global");
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = React.useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch leaderboard data when tab changes
  React.useEffect(() => {
    setIsLoading(true);
    setError(null);

    const url =
      tab === "friends"
        ? "/api/leaderboard/friends"
        : `/api/leaderboard?tab=${tab}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const list: LeaderboardEntry[] = (data.leaderboard ?? []) as LeaderboardEntry[];
        setEntries(list);
      })
      .catch(() => setError("Failed to load leaderboard"))
      .finally(() => setIsLoading(false));
  }, [tab]);

  // Fetch my stats once when authenticated
  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/leaderboard/me")
      .then((r) => r.json())
      .then((data) => setMyStats(data as LeaderboardEntry))
      .catch(() => null);
  }, [isAuthenticated]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; requiresAuth?: boolean }[] = [
    { id: "global", label: "All-time", icon: <Trophy className="h-3.5 w-3.5" /> },
    { id: "books", label: "By Books", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "pages", label: "By Pages", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "streak", label: "By Streak", icon: <Flame className="h-3.5 w-3.5" /> },
    { id: "diary", label: "By Diary", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "friends", label: "Friends", icon: <Users className="h-3.5 w-3.5" />, requiresAuth: true },
  ];

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder: (0 | 1 | 2)[] = top3.length === 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];
  const podiumRanks: (1 | 2 | 3)[] = top3.length === 3 ? [2, 1, 3] : top3.length === 2 ? [2, 1] : [1];

  const myRankInList = myStats
    ? entries.findIndex((e) => e.user_id === myStats.user_id)
    : -1;

  const handleUserClick = (username: string) => {
    router.push(`/u/${username}`);
  };

  const myXpRank = myStats?.xp_rank;

  return (
    <main className="relative min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        {isMobile ? (
          <Header minimalMobile={isMobile} />
        ) : (
          <>
            <DesktopSidebar />
            <MinimalDesktopHeader />
          </>
        )}

        <div className={cn("flex-1", isMobile ? "mt-16" : "mt-16")}>
          <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">

            {/* ── Page heading ── */}
            <div className="mb-6">
              <h1
                className={cn("text-4xl font-bold tracking-tight text-foreground md:text-5xl", playfair.className)}
              >
                The Reading Order
              </h1>
              <p
                className={cn("mt-1 text-base text-muted-foreground", playfair.className)}
                style={{ fontStyle: "italic" }}
              >
                ranked by reading devotion
              </p>
            </div>

            {/* ── Tabs ── */}
            <div className="mb-6 flex gap-0 overflow-x-auto border-b border-border scrollbar-hide">
              {tabs.map(({ id, label, icon, requiresAuth }) => {
                const disabled = requiresAuth && !isAuthenticated;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (disabled) {
                        router.push("/auth");
                        return;
                      }
                      setTab(id);
                    }}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-150 whitespace-nowrap",
                      tab === id
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
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
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">Loading leaderboard…</p>
              </div>
            )}

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
                      isFirst={rank === 1}
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
        <div className={cn(
          "fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-8",
          "bg-gradient-to-t from-background via-background/90 to-transparent",
          "",
        )}>
          <div className="mx-auto max-w-4xl">
            <div
              className={cn(
                "flex items-center gap-4 rounded-2xl px-5 py-4 shadow-xl",
                "bg-foreground text-background dark:bg-card dark:text-foreground dark:border dark:border-border",
              )}
            >
              {/* Rank disc */}
              <div className="flex flex-col items-center">
                <span
                  className={cn("text-2xl font-bold leading-none", playfair.className)}
                  style={{ opacity: 1 }}
                >
                  {myXpRank ?? "—"}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest opacity-60"
                >
                  rank
                </span>
              </div>

              <div className="h-9 w-px bg-white/15 dark:bg-border flex-shrink-0" />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">{user?.username}</p>
                <p className="text-xs opacity-65">
                  {myStats.level_badge} {myStats.level_name} · {fmtXP(myStats.total_xp)} XP
                </p>
              </div>

              {/* Stats */}
              <div className="hidden items-center gap-4 sm:flex">
                <div className="text-center">
                  <p className="font-mono text-base font-semibold leading-none">{myStats.books_read}</p>
                  <p className="text-[10px] font-medium uppercase tracking-widest opacity-60">books</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-base font-semibold leading-none">{myStats.current_streak}d</p>
                  <p className="text-[10px] font-medium uppercase tracking-widest opacity-60">streak</p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push(`/u/${user?.username}`)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold",
                  "bg-white/12 hover:bg-white/20 transition-colors",
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
