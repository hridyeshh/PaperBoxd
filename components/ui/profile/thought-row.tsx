"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Lock, MessageSquarePlus, Repeat2, Share, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { thoughtPlainText, type Thought } from "@/lib/thoughts";

// ── Toggles ───────────────────────────────────────────────────────────────────

/**
 * Like + repost state for one thought, optimistic with rollback. Rows and the
 * thread dialog share it so a toggle in one reads the same as in the other.
 */
export function useThoughtToggles(thought: Thought, onChange?: (next: Thought) => void) {
  const { user } = useAuth();
  const [state, setState] = React.useState({
    isLiked: thought.isLiked,
    likesCount: thought.likesCount,
    isReposted: thought.isReposted,
    repostsCount: thought.repostsCount,
  });

  React.useEffect(() => {
    setState({
      isLiked: thought.isLiked,
      likesCount: thought.likesCount,
      isReposted: thought.isReposted,
      repostsCount: thought.repostsCount,
    });
  }, [thought.id, thought.isLiked, thought.likesCount, thought.isReposted, thought.repostsCount]);

  const isOwn = !!user && user.username?.toLowerCase() === thought.authorUsername.toLowerCase();
  const canRepost = !!user && !isOwn && !thought.isPrivate;

  const send = async (kind: "like" | "repost", on: boolean) => {
    const res = await fetch(
      `/api/users/${encodeURIComponent(thought.authorUsername)}/thoughts/${encodeURIComponent(thought.id)}/${kind}`,
      { method: on ? "POST" : "DELETE" },
    );
    const body = (await res.json().catch(() => ({}))) as { error?: string; likes_count?: number; reposts_count?: number };
    if (!res.ok && res.status !== 409) throw new Error(body.error || "Something went wrong");
    return body;
  };

  const toggleLike = async () => {
    if (!user) return toast.info("Sign in to like thoughts");
    const prev = state;
    const on = !prev.isLiked;
    setState({ ...prev, isLiked: on, likesCount: Math.max(0, prev.likesCount + (on ? 1 : -1)) });
    try {
      const body = await send("like", on);
      const next = { ...prev, isLiked: on, likesCount: body.likes_count ?? prev.likesCount + (on ? 1 : -1) };
      setState(next);
      onChange?.({ ...thought, ...next });
    } catch (e) {
      setState(prev);
      toast.error(e instanceof Error ? e.message : "Couldn't update like");
    }
  };

  const toggleRepost = async () => {
    if (!user) return toast.info("Sign in to repost thoughts");
    if (!canRepost) return;
    const prev = state;
    const on = !prev.isReposted;
    setState({ ...prev, isReposted: on, repostsCount: Math.max(0, prev.repostsCount + (on ? 1 : -1)) });
    try {
      const body = await send("repost", on);
      const next = { ...prev, isReposted: on, repostsCount: body.reposts_count ?? prev.repostsCount + (on ? 1 : -1) };
      setState(next);
      onChange?.({ ...thought, ...next });
      if (on) toast.success("Reposted to your profile");
    } catch (e) {
      setState(prev);
      toast.error(e instanceof Error ? e.message : "Couldn't repost");
    }
  };

  return { ...state, isOwn, canRepost, toggleLike, toggleRepost };
}

// ── Pieces ────────────────────────────────────────────────────────────────────

export function relativeTime(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const s = Math.max(0, (Date.now() - then.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(then.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  });
}

export function ThoughtAvatar({ thought, size = 40 }: { thought: Thought; size?: number }) {
  return (
    <Link
      href={`/u/${encodeURIComponent(thought.authorUsername)}`}
      onClick={(e) => e.stopPropagation()}
      className="block shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border"
      style={{ width: size, height: size }}
      aria-label={`${thought.authorName}'s profile`}
    >
      {thought.authorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thought.authorAvatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
          {thought.authorName[0]?.toUpperCase()}
        </span>
      )}
    </Link>
  );
}

export function ThoughtBookChip({ thought }: { thought: Thought }) {
  if (!thought.bookTitle) return null;
  const inner = (
    <>
      <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded-[3px] bg-muted">
        {thought.bookCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thought.bookCover} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-foreground">{thought.bookTitle}</span>
        {thought.bookAuthor && <span className="block truncate text-xs text-muted-foreground">{thought.bookAuthor}</span>}
      </span>
      {thought.rating ? (
        <span className="flex shrink-0 items-center gap-0.5" aria-label={`${thought.rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn("h-3 w-3", i < thought.rating! ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40")} />
          ))}
        </span>
      ) : null}
    </>
  );
  const cls = "mt-3 flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 p-2 pr-3 transition-colors hover:bg-muted/60";
  return thought.bookSlug || thought.bookId ? (
    <Link href={`/b/${encodeURIComponent(thought.bookSlug || thought.bookId!)}`} onClick={(e) => e.stopPropagation()} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function ActionButton({
  label,
  count,
  active,
  activeClass,
  disabled,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  activeClass?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "group/action -ml-2 flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[13px] tabular-nums text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        active && activeClass,
      )}
    >
      {children}
      {count !== undefined && <span className="min-w-[1ch]">{count > 0 ? count : ""}</span>}
    </button>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

export type ThoughtRowProps = {
  thought: Thought;
  onOpen: (thought: Thought) => void;
  /** Own thoughts only: open the thread with the composer focused. */
  onContinue?: (thought: Thought) => void;
  onShare: (thought: Thought) => void;
  onChange?: (next: Thought) => void;
};

export function ThoughtRow({ thought, onOpen, onContinue, onShare, onChange }: ThoughtRowProps) {
  const { user } = useAuth();
  const t = useThoughtToggles(thought, onChange);
  const text = React.useMemo(() => thoughtPlainText(thought.content), [thought.content]);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(thought)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(thought);
        }
      }}
      className="cursor-pointer border-b border-border/70 px-1 py-4 transition-colors hover:bg-muted/25 focus-visible:bg-muted/30 focus-visible:outline-none sm:px-3"
    >
      {thought.repostedBy && (
        <p className="mb-1.5 flex items-center gap-1.5 pl-[26px] text-xs font-medium text-muted-foreground">
          <Repeat2 className="h-3.5 w-3.5" aria-hidden />
          {user?.username?.toLowerCase() === thought.repostedBy.username.toLowerCase()
            ? "You"
            : thought.repostedBy.name || thought.repostedBy.username}{" "}
          reposted
        </p>
      )}

      <div className="flex gap-3">
        <ThoughtAvatar thought={thought} />

        <div className="min-w-0 flex-1">
          <header className="flex items-baseline gap-1.5 text-sm">
            <span className="truncate font-semibold text-foreground">{thought.authorName}</span>
            <span className="truncate text-muted-foreground">@{thought.authorUsername}</span>
            <span className="text-muted-foreground" aria-hidden>·</span>
            <time dateTime={thought.createdAt} className="shrink-0 text-muted-foreground">
              {relativeTime(thought.createdAt)}
            </time>
            {thought.isPrivate && (
              <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground" title="Only you can see this">
                <Lock className="h-3 w-3" aria-hidden /> Private
              </span>
            )}
          </header>

          {thought.subject && !thought.bookTitle && (
            <p className="mt-0.5 text-sm font-semibold text-foreground">{thought.subject}</p>
          )}

          <p className="mt-1 line-clamp-6 whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground">
            {text}
          </p>

          <ThoughtBookChip thought={thought} />

          {thought.threadCount > 0 && (
            <p className="mt-2.5 text-[13px] font-medium text-primary">
              Show this thread · {thought.threadCount} more
            </p>
          )}

          <div className="mt-2 flex max-w-sm items-center justify-between">
            {t.isOwn && onContinue ? (
              <ActionButton label="Add to thread" onClick={() => onContinue(thought)}>
                <MessageSquarePlus className="h-[18px] w-[18px]" />
              </ActionButton>
            ) : (
              <span className="w-9" />
            )}
            <ActionButton
              label={t.isReposted ? "Undo repost" : t.isOwn ? "You can't repost your own thought" : "Repost"}
              count={t.repostsCount}
              active={t.isReposted}
              activeClass="text-emerald-600 dark:text-emerald-400"
              disabled={!!t.isOwn || thought.isPrivate}
              onClick={t.toggleRepost}
            >
              <Repeat2 className="h-[18px] w-[18px]" />
            </ActionButton>
            <ActionButton
              label={t.isLiked ? "Unlike" : "Like"}
              count={t.likesCount}
              active={t.isLiked}
              activeClass="text-rose-600 dark:text-rose-400"
              onClick={t.toggleLike}
            >
              <Heart className={cn("h-[18px] w-[18px] transition-transform group-active/action:scale-90", t.isLiked && "fill-current")} />
            </ActionButton>
            <ActionButton label="Share" onClick={() => onShare(thought)}>
              <Share className="h-[18px] w-[18px]" />
            </ActionButton>
          </div>
        </div>
      </div>
    </article>
  );
}
