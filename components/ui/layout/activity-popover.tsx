"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ArrowRight, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { Button } from "@/components/ui/primitives/button";
import { DiaryEntryDialog } from "@/components/ui/dialogs/diary-entry-dialog";
import { DEFAULT_AVATAR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ActivityEntry = {
  id: string;
  name: string;
  username?: string;
  userAvatar?: string;
  action: string;
  detail: string;
  timeAgo: string;
  cover: string | null;
  bookTitle?: string | null;
  type?: string;
  diaryEntryId?: string;
  bookId?: string | null;
  bookAuthor?: string | null;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  isLiked?: boolean;
  likesCount?: number;
  isGeneralEntry?: boolean;
  listId?: string;
  listTitle?: string;
  sharedByUsername?: string;
  listBooksCount?: number;
};

type ActivityFromAPI = {
  _id?: string | { toString(): string };
  type: string;
  userName?: string;
  username?: string;
  userAvatar?: string;
  timestamp?: string | Date;
  bookId?: string | null;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  bookCover?: string | null;
  rating?: number;
  diaryEntryId?: string;
  content?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  isLiked?: boolean;
  likesCount?: number;
  isGeneralEntry?: boolean;
  subject?: string | null;
  listId?: string;
  listTitle?: string;
  listCover?: string;
  listBooksCount?: number;
  sharedByUsername?: string;
  action?: string;
  detail?: string | null;
};

type DiaryEntryData = {
  id: string;
  bookId?: string | null;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  bookCover?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  likesCount?: number;
};

function formatTimeAgo(timestamp: string | Date | undefined | null): string {
  if (!timestamp) return "Some time ago";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "Some time ago";
  const diffMs = Date.now() - d.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "Some time ago";
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatActivity(activity: ActivityFromAPI): { action: string; bookTitle?: string } {
  if (activity.action !== undefined) {
    return { action: activity.action, bookTitle: activity.detail ?? activity.bookTitle ?? undefined };
  }
  let action = "";
  let bookTitle = activity.bookTitle || undefined;
  if (!activity.type) return { action: "", bookTitle };
  if (activity.type === "diary_entry" || activity.type === "reviewed") {
    action = activity.isGeneralEntry ? "wrote" : "wrote about";
  } else if (activity.type === "added_book" || activity.type === "read") {
    action = "added to their shelf";
  } else if (activity.type === "rated") {
    action = `rated ${"★".repeat(activity.rating || 0)}`;
  } else if (activity.type === "liked") {
    action = "liked";
  } else if (activity.type === "added_to_list") {
    action = "added to TBR";
  } else if (activity.type === "started_reading") {
    action = "started reading";
  } else if (activity.type === "created_list") {
    action = "created a list";
    bookTitle = activity.listTitle;
  } else if (activity.type === "shared_list") {
    action = "shared their list";
    bookTitle = activity.listTitle;
  } else if (activity.type === "shared_book") {
    action = "shared";
  } else if (activity.type === "collaboration_request") {
    action = "invited you to collaborate on";
    bookTitle = activity.listTitle;
  } else if (activity.type === "granted_access") {
    action = "granted access to";
    bookTitle = activity.listTitle;
  } else if (activity.type === "liked_diary_entry") {
    action = "liked your note on";
    bookTitle = activity.subject || "diary entry";
  } else if (activity.type === "followed") {
    action = "started following you";
    bookTitle = undefined;
  } else {
    action = activity.type.replace(/_/g, " ");
  }
  return { action, bookTitle };
}

function transformActivity(activity: ActivityFromAPI, idx: number): ActivityEntry {
  const { action, bookTitle } = formatActivity(activity);
  const isListType =
    activity.type === "shared_list" ||
    activity.type === "collaboration_request" ||
    activity.type === "granted_access" ||
    activity.type === "created_list";

  const detail =
    activity.detail !== undefined
      ? (activity.detail ?? "")
      : activity.type === "liked_diary_entry"
      ? activity.subject || "diary entry"
      : activity.isGeneralEntry
      ? activity.subject?.trim() || "a diary entry"
      : isListType
      ? activity.listTitle || ""
      : bookTitle || "";

  const entry: ActivityEntry = {
    id: activity._id?.toString() || `activity-${idx}`,
    name: activity.userName || activity.username || "User",
    username: activity.username,
    userAvatar: activity.userAvatar,
    action,
    detail,
    bookTitle: isListType ? activity.listTitle : bookTitle,
    timeAgo: formatTimeAgo(activity.timestamp),
    cover: isListType ? (activity.listCover || null) : (activity.bookCover || null),
    type: activity.type,
  };

  if (activity.type === "diary_entry") {
    entry.diaryEntryId = activity.diaryEntryId;
    entry.bookId = activity.bookId;
    entry.bookAuthor = activity.bookAuthor;
    entry.content = activity.content;
    entry.createdAt = activity.createdAt
      ? typeof activity.createdAt === "string"
        ? activity.createdAt
        : activity.createdAt.toISOString()
      : undefined;
    entry.updatedAt = activity.updatedAt
      ? typeof activity.updatedAt === "string"
        ? activity.updatedAt
        : activity.updatedAt.toISOString()
      : undefined;
    entry.isLiked = activity.isLiked;
    entry.likesCount = activity.likesCount;
    entry.isGeneralEntry = activity.isGeneralEntry;
  }

  if (
    activity.type === "shared_list" ||
    activity.type === "collaboration_request" ||
    activity.type === "granted_access"
  ) {
    entry.listId = activity.listId;
    entry.listTitle = activity.listTitle;
    entry.sharedByUsername = activity.sharedByUsername;
    if (activity.type !== "granted_access") entry.listBooksCount = activity.listBooksCount;
  }

  if (activity.type === "shared_book" && activity.bookId) {
    entry.bookId = activity.bookId;
  }

  if (activity.bookId && !entry.bookId) entry.bookId = activity.bookId;

  return entry;
}

interface ActivityPopoverProps {
  username: string;
  hasNewActivities: boolean;
  onOpen?: () => void;
  /** Render the trigger as Bell icon (mobile) or text button (desktop) */
  variant?: "bell" | "text";
}

export function ActivityPopover({
  username,
  hasNewActivities,
  onOpen,
  variant = "text",
}: ActivityPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetched, setFetched] = React.useState(false);
  const [processingRequest, setProcessingRequest] = React.useState<string | null>(null);
  const [selectedDiaryEntry, setSelectedDiaryEntry] = React.useState<DiaryEntryData | null>(null);
  const [selectedDiaryEntryUsername, setSelectedDiaryEntryUsername] = React.useState<string | null>(null);

  const fetchActivities = React.useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/activities/following?page=1&pageSize=15`
      );
      if (!res.ok) return;
      const data = await res.json();
      const transformed = Array.isArray(data.activities)
        ? data.activities.map((a: ActivityFromAPI, i: number) => transformActivity(a, i))
        : [];
      setActivities(transformed);
      setFetched(true);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      onOpen?.();
      fetchActivities();
      // Mark as viewed
      localStorage.setItem(`activity_last_viewed_${username}`, new Date().toISOString());
    }
  };

  const handleEntryClick = (entry: ActivityEntry) => {
    if (entry.type === "diary_entry" && entry.diaryEntryId) {
      setSelectedDiaryEntry({
        id: entry.diaryEntryId,
        bookId: entry.bookId,
        bookTitle: entry.bookTitle,
        bookAuthor: entry.bookAuthor,
        bookCover: entry.cover,
        content: entry.content || "",
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: entry.updatedAt || new Date().toISOString(),
        isLiked: entry.isLiked,
        likesCount: entry.likesCount,
      });
      setSelectedDiaryEntryUsername(entry.username || null);
      return;
    }
    if (
      (entry.type === "shared_list" || entry.type === "granted_access") &&
      entry.listId &&
      entry.sharedByUsername
    ) {
      router.push(`/u/${entry.sharedByUsername}/lists/${entry.listId}`);
      setOpen(false);
      return;
    }
    if (entry.bookId) {
      router.push(`/b/${entry.bookId}`);
      setOpen(false);
    }
  };

  const handleCollabRequest = async (entry: ActivityEntry, action: "accept" | "reject") => {
    if (!entry.listId || !entry.sharedByUsername) return;
    setProcessingRequest(entry.id);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(entry.sharedByUsername)}/lists/${encodeURIComponent(entry.listId)}/collaborate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, activityId: entry.id }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${action}`);
      }
      toast.success(`Collaboration request ${action}ed`);
      setActivities((prev) => prev.filter((a) => a.id !== entry.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const isClickable = (entry: ActivityEntry) =>
    entry.type === "diary_entry" ||
    entry.type === "shared_list" ||
    entry.type === "granted_access" ||
    entry.type === "shared_book" ||
    entry.type === "added_book" ||
    entry.type === "read" ||
    entry.type === "started_reading" ||
    entry.type === "rated" ||
    entry.type === "liked" ||
    !!entry.bookId;

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          {variant === "bell" ? (
            <button
              type="button"
              className="relative p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Updates"
            >
              <Bell className="h-5 w-5 text-foreground/80" />
              {hasNewActivities && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border border-background" />
              )}
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "relative font-medium text-foreground/80 hover:text-foreground px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
              )}
            >
              Updates
              {hasNewActivities && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
              )}
            </button>
          )}
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[380px] p-0 shadow-xl rounded-2xl border border-border/60 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="font-semibold text-sm text-foreground">Updates</h3>
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Body */}
          <div className="max-h-[440px] overflow-y-auto">
            {isLoading && !fetched ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-foreground">No updates yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Follow people to see their reading activity here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {activities.map((entry) => (
                  <li
                    key={entry.id}
                    onClick={() => isClickable(entry) && handleEntryClick(entry)}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors",
                      isClickable(entry) && entry.type !== "collaboration_request"
                        ? "cursor-pointer hover:bg-muted/50"
                        : ""
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      <Image
                        src={entry.userAvatar || DEFAULT_AVATAR}
                        alt={entry.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                        unoptimized
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug text-foreground">
                        <span className="font-semibold">@{entry.username || entry.name}</span>
                        {entry.action && <span className="text-muted-foreground"> {entry.action}</span>}
                        {entry.detail && (
                          <span className="font-medium"> {entry.detail}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.timeAgo}</p>

                      {/* Collab request buttons */}
                      {entry.type === "collaboration_request" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCollabRequest(entry, "accept");
                            }}
                            disabled={processingRequest === entry.id}
                          >
                            {processingRequest === entry.id ? "…" : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCollabRequest(entry, "reject");
                            }}
                            disabled={processingRequest === entry.id}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Cover thumbnail */}
                    {entry.cover && entry.type !== "followed" && (
                      <div className="relative h-11 w-8 flex-shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={entry.cover}
                          alt={entry.detail || "cover"}
                          fill
                          className="object-cover"
                          sizes="32px"
                          unoptimized
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {activities.length > 0 && (
            <div className="border-t border-border/50 px-4 py-2.5">
              <Link
                href="/activity"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                See all updates <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Diary entry dialog (opened from within the popover) */}
      {selectedDiaryEntry && (
        <DiaryEntryDialog
          open={!!selectedDiaryEntry}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedDiaryEntry(null);
              setSelectedDiaryEntryUsername(null);
            }
          }}
          entry={selectedDiaryEntry}
          username={selectedDiaryEntryUsername || username}
          isOwnProfile={false}
        />
      )}
    </>
  );
}
