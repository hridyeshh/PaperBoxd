"use client";

import * as React from "react";
import { Heart, Loader2, Lock, Repeat2, Share, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";
import { ShareImageDialog } from "@/components/ui/features/book-share-button";
import { ThoughtAvatar, ThoughtBookChip, relativeTime, useThoughtToggles } from "@/components/ui/profile/thought-row";
import { cn } from "@/lib/utils";
import { thoughtShareImageUrl, type Thought } from "@/lib/thoughts";

/** Callers from the activity feed only know part of a thought; the thread fetch fills the rest. */
type ThoughtSeed = Partial<Thought> & { id: string; content?: string };

interface DiaryEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ThoughtSeed;
  /** Author's username when the seed doesn't carry one. */
  username: string;
  isOwnProfile?: boolean;
  /** Focus the "Add to thread" box on open. */
  focusComposer?: boolean;
  /** A like, repost, follow-up or delete happened — the caller should refetch. */
  onLikeChange?: () => void;
  onDelete?: () => void;
}

function fromSeed(seed: ThoughtSeed, username: string): Thought {
  return {
    authorUsername: username,
    authorName: username,
    authorAvatar: null,
    bookId: null,
    bookTitle: null,
    bookAuthor: null,
    bookCover: null,
    bookSlug: null,
    subject: null,
    isPrivate: false,
    rating: null,
    likesCount: 0,
    isLiked: false,
    repostsCount: 0,
    isReposted: false,
    threadRootId: null,
    threadCount: 0,
    repostedBy: null,
    canEdit: false,
    createdAt: "",
    updatedAt: "",
    ...Object.fromEntries(Object.entries(seed).filter(([, v]) => v !== undefined)),
    content: seed.content ?? "",
  } as Thought;
}

/** Plain text from the composer → the paragraph HTML every other thought is stored as. */
function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function DiaryEntryDialog({
  open,
  onOpenChange,
  entry,
  username,
  focusComposer = false,
  onLikeChange,
  onDelete,
}: DiaryEntryDialogProps) {
  // Callers pass `entry` inline, so its identity changes every render; the
  // thread is keyed on the id and re-seeded only when that changes.
  const seed = fromSeed(entry, username);
  const seedRef = React.useRef(seed);
  seedRef.current = seed;
  const [thread, setThread] = React.useState<Thought[]>([seed]);
  const [loading, setLoading] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [sharing, setSharing] = React.useState<{ thought: Thought; label?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Thought | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  const author = thread[0]?.authorUsername || seed.authorUsername;
  const canContinue = thread[0]?.canEdit ?? false;

  React.useEffect(() => {
    if (!open || !seed.id) return;
    let cancelled = false;
    setThread([seedRef.current]);
    setDraft("");
    setConfirmDelete(null);
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(seed.authorUsername)}/thoughts/${encodeURIComponent(seed.id)}/thread`)
      .then((res) => (res.ok ? res.json() : null)) // on failure keep the seed on screen
      .then((data: { thoughts?: Thought[] } | null) => {
        if (!cancelled && data?.thoughts?.length) setThread(data.thoughts);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, seed.id, seed.authorUsername]);

  React.useEffect(() => {
    if (open && focusComposer && canContinue) composerRef.current?.focus();
  }, [open, focusComposer, canContinue]);

  const post = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(author)}/thoughts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textToHtml(text), threadParentId: thread[thread.length - 1].id }),
      });
      const data = (await res.json().catch(() => ({}))) as Thought & { error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't add to thread");
      setDraft("");
      setThread((t) => [...t, data]);
      onLikeChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add to thread");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (t: Thought) => {
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(author)}/thoughts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thoughtId: t.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Couldn't delete");
      }
      const isFirst = t.id === thread[0].id;
      toast.success(isFirst ? "Thread deleted" : "Thought deleted");
      if (isFirst) {
        onOpenChange(false);
        onDelete?.();
      } else {
        setThread((all) => all.filter((x) => x.id !== t.id));
        onLikeChange?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  const first = thread[0];
  const isThread = thread.length > 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-xl flex-col gap-0 p-0">
          <DialogHeader className="border-b border-border px-5 py-3.5">
            <DialogTitle className="text-base">{isThread ? "Thread" : "Thought"}</DialogTitle>
            <DialogDescription className="sr-only">
              {first.authorName}&apos;s {isThread ? "thread" : "thought"}
              {first.bookTitle ? ` about ${first.bookTitle}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 pt-4">
            {thread.map((t, i) => (
              <ThreadItem
                key={t.id}
                thought={t}
                isFirst={i === 0}
                hasNext={i < thread.length - 1 || canContinue}
                onShare={() => setSharing({ thought: t, label: isThread ? `${i + 1}/${thread.length}` : undefined })}
                onDelete={() => setConfirmDelete(t)}
                onChange={() => onLikeChange?.()}
              />
            ))}
            {loading && thread.length === 1 && (
              <div className="flex justify-center pb-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading thread" />
              </div>
            )}

            {canContinue && (
              <div className="flex gap-3 pb-4">
                <ThoughtAvatar thought={first} />
                <div className="min-w-0 flex-1">
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
                    }}
                    rows={draft ? 3 : 1}
                    maxLength={5000}
                    placeholder="Add to this thread…"
                    aria-label="Add to this thread"
                    className="w-full resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="flex items-center justify-between border-t border-border/70 pt-2">
                    <span className="text-xs text-muted-foreground">
                      {first.isPrivate ? "Private, like the rest of the thread" : "Joins the thread under the same book"}
                    </span>
                    <Button size="sm" className="rounded-full" onClick={post} disabled={!draft.trim() || posting}>
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {confirmDelete && (
            <div className="flex items-center justify-between gap-3 border-t border-border bg-destructive/5 px-5 py-3">
              <p className="text-sm text-foreground">
                {confirmDelete.id === first.id && isThread
                  ? "Delete the first thought? The whole thread goes with it."
                  : "Delete this thought? This can't be undone."}
              </p>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(confirmDelete)}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {sharing && (
        <ShareImageDialog
          open={!!sharing}
          onOpenChange={(o) => !o && setSharing(null)}
          imageUrl={thoughtShareImageUrl(sharing.thought, sharing.label)}
          shareTitle={`A thought by @${sharing.thought.authorUsername}`}
        />
      )}
    </>
  );
}

function ThreadItem({
  thought,
  isFirst,
  hasNext,
  onShare,
  onDelete,
  onChange,
}: {
  thought: Thought;
  isFirst: boolean;
  hasNext: boolean;
  onShare: () => void;
  onDelete: () => void;
  onChange: () => void;
}) {
  const t = useThoughtToggles(thought, onChange);

  return (
    <div className="flex gap-3">
      {/* Avatar column with the line that joins a thread */}
      <div className="flex flex-col items-center">
        <ThoughtAvatar thought={thought} />
        {hasNext && <span className="my-1 w-0.5 flex-1 rounded-full bg-border" aria-hidden />}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <header className="flex items-baseline gap-1.5 text-sm">
          <span className="truncate font-semibold text-foreground">{thought.authorName}</span>
          <span className="truncate text-muted-foreground">@{thought.authorUsername}</span>
          {thought.createdAt && (
            <>
              <span className="text-muted-foreground" aria-hidden>·</span>
              <time dateTime={thought.createdAt} className="shrink-0 text-muted-foreground">{relativeTime(thought.createdAt)}</time>
            </>
          )}
          {thought.isPrivate && (
            <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden /> Private
            </span>
          )}
        </header>

        {isFirst && thought.subject && !thought.bookTitle && (
          <p className="mt-0.5 text-sm font-semibold text-foreground">{thought.subject}</p>
        )}

        <div
          className="prose prose-sm mt-1 max-w-none break-words text-[15px] leading-relaxed text-foreground dark:prose-invert prose-p:my-2"
          dangerouslySetInnerHTML={{ __html: thought.content }}
        />

        {isFirst && <ThoughtBookChip thought={thought} />}

        <div className="mt-2 flex items-center gap-5">
          <button
            type="button"
            onClick={t.toggleRepost}
            disabled={t.isOwn || thought.isPrivate}
            aria-pressed={t.isReposted}
            aria-label={t.isReposted ? "Undo repost" : "Repost"}
            className={cn(
              "-ml-2 flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[13px] tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40",
              t.isReposted && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            <Repeat2 className="h-[18px] w-[18px]" />
            {t.repostsCount > 0 && t.repostsCount}
          </button>
          <button
            type="button"
            onClick={t.toggleLike}
            aria-pressed={t.isLiked}
            aria-label={t.isLiked ? "Unlike" : "Like"}
            className={cn(
              "-ml-2 flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[13px] tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground",
              t.isLiked && "text-rose-600 dark:text-rose-400",
            )}
          >
            <Heart className={cn("h-[18px] w-[18px]", t.isLiked && "fill-current")} />
            {t.likesCount > 0 && t.likesCount}
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share to story"
            className="-ml-2 flex min-h-9 items-center rounded-full px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Share className="h-[18px] w-[18px]" />
          </button>
          {thought.canEdit && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete"
              className="ml-auto flex min-h-9 items-center rounded-full px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
