"use client";

import Image from "next/image";
import * as React from "react";
import { BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/ui/layout/header-with-search";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { DiaryEntryDialog } from "@/components/ui/dialogs/diary-entry-dialog";
import { Button } from "@/components/ui/primitives/button";
import { toast } from "sonner";
import { createBookSlug } from "@/lib/utils/book-slug";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/primitives/pagination";

// Removed ActivityView - only showing Friends activities now

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
  type?: string; // Activity type: "diary_entry", "read", "rated", "shared_list", "collaboration_request", etc.
  diaryEntryId?: string; // For diary entries
  bookId?: string | null; // For diary entries
  bookAuthor?: string | null; // For diary entries
  content?: string; // For diary entries
  createdAt?: string; // For diary entries
  updatedAt?: string; // For diary entries
  isLiked?: boolean; // For diary entries
  likesCount?: number; // For diary entries
  isGeneralEntry?: boolean; // For general diary entries (no book)
  listId?: string; // For shared_list, collaboration_request, and granted_access activities
  listTitle?: string; // For granted_access activities
  sharedByUsername?: string; // For shared_list, collaboration_request, and granted_access activities
  listBooksCount?: number; // For shared_list and collaboration_request activities
};

const ACTIVITY_PAGE_SIZE = 10;

// Default avatar placeholder (gray circle with user icon)
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Cpath d='M50 30c-8.284 0-15 6.716-15 15 0 5.989 3.501 11.148 8.535 13.526C37.514 62.951 32 70.16 32 78.5h36c0-8.34-5.514-15.549-13.535-19.974C59.499 56.148 63 50.989 63 45c0-8.284-6.716-15-15-15z' fill='white' opacity='0.8'/%3E%3C/svg%3E";

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated";
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [hasFriendsActivities, setHasFriendsActivities] = React.useState(false);
  const [selectedDiaryEntry, setSelectedDiaryEntry] = React.useState<any | null>(null);
  const [selectedDiaryEntryUsername, setSelectedDiaryEntryUsername] = React.useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = React.useState<string | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (status === "loading") {
      return; // Still loading session
    }

    if (!isAuthenticated || !session?.user?.username) {
      router.replace("/auth");
      return;
    }

    // Update last viewed timestamp when user visits activity page
    if (session?.user?.username) {
      localStorage.setItem(
        `activity_last_viewed_${session.user.username}`,
        new Date().toISOString()
      );
    }
  }, [status, isAuthenticated, session, router]);

  // Format time ago helper
  const formatTimeAgo = (timestamp: string | Date | undefined | null) => {
    if (!timestamp) {
      return "Some time ago";
    }
    
    const activityDate = new Date(timestamp);
    // Check if date is valid
    if (isNaN(activityDate.getTime())) {
      return "Some time ago";
    }
    
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    
    // Check for invalid time difference (negative or NaN)
    if (isNaN(diffMs) || diffMs < 0) {
      return "Some time ago";
    }
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  // Format activity action helper
  const formatActivity = (activity: any) => {
    let action = "";
    // Use bookTitle from populated book data, fallback to undefined (will be handled in display)
    let bookTitle = activity.bookTitle || undefined;
    
    // Handle all activity types except search
    if (!activity.type) {
      console.warn("Activity missing type:", activity);
    } else if (activity.type === "diary_entry") {
      action = activity.isGeneralEntry ? "wrote" : "wrote about";
      bookTitle = activity.bookTitle || (activity.isGeneralEntry ? undefined : undefined);
    } else if (activity.type === "read") {
      action = "added to bookshelf";
    } else if (activity.type === "rated") {
      action = `rated ${"★".repeat(activity.rating || 0)}`;
    } else if (activity.type === "liked") {
      action = "liked";
    } else if (activity.type === "added_to_list") {
      action = "added to TBR";
    } else if (activity.type === "started_reading") {
      action = "started reading";
    } else if (activity.type === "reviewed") {
      action = "reviewed";
    } else if (activity.type === "shared_list") {
      action = "shared their list";
      bookTitle = activity.listTitle;
    } else if (activity.type === "shared_book") {
      action = "shared";
      // bookTitle is already set from the activity
    } else if (activity.type === "collaboration_request") {
      action = "invited you to collaborate on";
      bookTitle = activity.listTitle;
    } else if (activity.type === "granted_access") {
      action = "granted access to";
      bookTitle = activity.listTitle;
    } else {
      console.warn(`Unknown activity type: "${activity.type}"`);
    }
    
    return { action, bookTitle };
  };

  // Fetch activities from followed users only
  React.useEffect(() => {
    console.log('[ACTIVITY PAGE] useEffect triggered. Auth:', isAuthenticated, 'Username:', session?.user?.username);

    if (!isAuthenticated || !session?.user?.username) {
      console.log('[ACTIVITY PAGE] Not authenticated or no username, skipping fetch');
      setIsLoading(false);
      return;
    }

    const username = session.user.username;
    setIsLoading(true);

      console.log('[ACTIVITY PAGE] Fetching activities for:', username);
      // Fetch activities from followed users
      fetch(`/api/users/${encodeURIComponent(username)}/activities/following?page=${currentPage}&pageSize=${ACTIVITY_PAGE_SIZE}`)
        .then((res) => {
          console.log('[ACTIVITY PAGE] API response status:', res.status);
          if (!res.ok) {
            throw new Error(`Failed to fetch following activities: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log('[ACTIVITY PAGE] Got data:', data);
          console.log('[ACTIVITY PAGE] Activities count:', data.activities?.length);
          const transformedActivities: ActivityEntry[] = Array.isArray(data.activities)
            ? data.activities.map((activity: any, idx: number) => {
                const { action, bookTitle } = formatActivity(activity);
                
              const baseEntry: ActivityEntry = {
                  id: activity._id?.toString() || `activity-${idx}`,
                  name: activity.userName || activity.username || "User",
                  username: activity.username,
                  userAvatar: activity.userAvatar,
                  action,
                  detail: activity.isGeneralEntry 
                    ? (activity.subject && activity.subject.trim() ? activity.subject : "a diary entry")
                    : (activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access" ? activity.listTitle : bookTitle),
                  bookTitle: activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access" ? activity.listTitle : bookTitle,
                  timeAgo: formatTimeAgo(activity.timestamp),
                  cover: activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access"
                    ? (activity.listCover || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80")
                    : (activity.bookCover || (activity.isGeneralEntry ? null : "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80")),
                type: activity.type,
                };
              
              // Add diary entry specific fields if it's a diary entry
              if (activity.type === "diary_entry") {
                baseEntry.diaryEntryId = activity.diaryEntryId;
                baseEntry.bookId = activity.bookId;
                baseEntry.bookAuthor = activity.bookAuthor;
                baseEntry.content = activity.content;
                baseEntry.createdAt = activity.createdAt;
                baseEntry.updatedAt = activity.updatedAt;
                baseEntry.isLiked = activity.isLiked;
                baseEntry.likesCount = activity.likesCount;
                baseEntry.isGeneralEntry = activity.isGeneralEntry;
              }
              
              // Add shared list and collaboration request specific fields
              if (activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access") {
                baseEntry.listId = activity.listId;
                baseEntry.listTitle = activity.listTitle;
                baseEntry.sharedByUsername = activity.sharedByUsername;
                if (activity.type !== "granted_access") {
                  baseEntry.listBooksCount = activity.listBooksCount;
                }
              }
              
              // Add shared book specific fields
              if (activity.type === "shared_book") {
                baseEntry.bookId = activity.bookId;
              }
              
              return baseEntry;
              })
            : [];
          setActivities(transformedActivities);
          setTotalPages(data.totalPages || 1);
          // Set indicator if there are any activities (total > 0)
          setHasFriendsActivities((data.total || 0) > 0);
        })
        .catch((error) => {
          console.error("[ACTIVITY PAGE] Failed to fetch following activities:", error);
          setActivities([]);
          setTotalPages(1);
          setHasFriendsActivities(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
  }, [isAuthenticated, session?.user?.username, currentPage]);

  // Fetch Friends activities count on mount and when view changes to check for indicator
  React.useEffect(() => {
    if (!isAuthenticated || !session?.user?.username) {
      return;
    }

    const username = session.user.username;
    
    // Fetch first page to get total count for indicator
    fetch(`/api/users/${encodeURIComponent(username)}/activities/following?page=1&pageSize=1`)
      .then((res) => {
        if (!res.ok) {
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setHasFriendsActivities((data.total || 0) > 0);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch friends activities count:", error);
      });
  }, [isAuthenticated, session?.user?.username]);

  // Handle collaboration request accept/reject
  const handleCollaborationRequest = async (entry: ActivityEntry, action: "accept" | "reject") => {
    if (!entry.listId || !entry.sharedByUsername || !session?.user?.username) return;

    setProcessingRequest(entry.id);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(entry.sharedByUsername)}/lists/${encodeURIComponent(entry.listId)}/collaborate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            activityId: entry.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to ${action} collaboration request`);
      }

      toast.success(`Collaboration request ${action}ed successfully`);
      
      // Remove the activity from the list
      setActivities(activities.filter(a => a.id !== entry.id));
      
      // Refresh activities
      if (session?.user?.username) {
        const username = session.user.username;
        fetch(`/api/users/${encodeURIComponent(username)}/activities/following?page=${currentPage}&pageSize=${ACTIVITY_PAGE_SIZE}`)
          .then((res) => res.json())
          .then((data) => {
            const transformedActivities: ActivityEntry[] = Array.isArray(data.activities)
              ? data.activities.map((activity: any, idx: number) => {
                  const { action, bookTitle } = formatActivity(activity);
                  const baseEntry: ActivityEntry = {
                    id: activity._id?.toString() || `activity-${idx}`,
                    name: activity.userName || activity.username || "User",
                    username: activity.username,
                    userAvatar: activity.userAvatar,
                    action,
                    detail: activity.isGeneralEntry 
                      ? (activity.subject && activity.subject.trim() ? activity.subject : "a diary entry")
                      : (activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access" ? activity.listTitle : bookTitle),
                    bookTitle: activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access" ? activity.listTitle : bookTitle,
                    timeAgo: formatTimeAgo(activity.timestamp),
                    cover: activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access"
                      ? (activity.listCover || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80")
                      : (activity.bookCover || (activity.isGeneralEntry ? null : "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80")),
                    type: activity.type,
                  };
                  
                  if (activity.type === "diary_entry") {
                    baseEntry.diaryEntryId = activity.diaryEntryId;
                    baseEntry.bookId = activity.bookId;
                    baseEntry.bookAuthor = activity.bookAuthor;
                    baseEntry.content = activity.content;
                    baseEntry.createdAt = activity.createdAt;
                    baseEntry.updatedAt = activity.updatedAt;
                    baseEntry.isLiked = activity.isLiked;
                    baseEntry.likesCount = activity.likesCount;
                    baseEntry.isGeneralEntry = activity.isGeneralEntry;
                  }
                  
                  if (activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access") {
                    baseEntry.listId = activity.listId;
                    baseEntry.listTitle = activity.listTitle;
                    baseEntry.sharedByUsername = activity.sharedByUsername;
                    if (activity.type !== "granted_access") {
                      baseEntry.listBooksCount = activity.listBooksCount;
                    }
                  }
                  
                  if (activity.type === "shared_book") {
                    baseEntry.bookId = activity.bookId;
                  }
                  
                  return baseEntry;
                })
              : [];
            setActivities(transformedActivities);
            setTotalPages(data.totalPages || 1);
          })
          .catch((error) => {
            console.error("Failed to refresh activities:", error);
          });
      }
    } catch (error) {
      console.error(`Error ${action}ing collaboration request:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} collaboration request`);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Removed view switching logic

  // Show loading while checking authentication or loading data
  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <TetrisLoading size="md" speed="fast" loadingText="Loading updates..." />
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !session?.user?.username) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8 mt-16">
        <div className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Updates</h1>
              <p className="text-sm text-muted-foreground">See what your friends are reading and sharing.</p>
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
              <p className="text-lg font-semibold text-foreground">No updates yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Follow some users to see their reading updates here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                {activities.map((entry) => (
                  <article
                    key={entry.id}
                    onClick={() => {
                      // If it's a diary entry, open the diary entry dialog
                      if (entry.type === "diary_entry" && entry.diaryEntryId) {
                        setSelectedDiaryEntry({
                          id: entry.diaryEntryId,
                          bookId: entry.bookId,
                          bookTitle: entry.bookTitle,
                          bookAuthor: entry.bookAuthor,
                          bookCover: entry.cover,
                          content: entry.content,
                          createdAt: entry.createdAt,
                          updatedAt: entry.updatedAt,
                          isLiked: entry.isLiked,
                          likesCount: entry.likesCount,
                        });
                        setSelectedDiaryEntryUsername(entry.username || null);
                      }
                      // If it's a shared list or granted access, navigate to the list
                      else if ((entry.type === "shared_list" || entry.type === "granted_access") && entry.listId && entry.sharedByUsername) {
                        router.push(`/u/${entry.sharedByUsername}/lists/${entry.listId}`);
                      }
                      // If it's a shared book, navigate to the book page
                      else if (entry.type === "shared_book" && entry.bookId) {
                        try {
                          const bookId = entry.bookId.toString();
                          // Check if it's an ISBN (10 or 13 digits)
                          const isISBN = /^(\d{10}|\d{13})$/.test(bookId);
                          // Check if it's an Open Library ID
                          const isOpenLibraryId = bookId.startsWith("OL") || bookId.startsWith("/works/");
                          // Check if it's a MongoDB ObjectId (24 hex characters)
                          const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(bookId);
                          // Check if it's a valid ID format (alphanumeric, no spaces, no +)
                          const isValidId = /^[a-zA-Z0-9_-]+$/.test(bookId) && !bookId.includes(" ") && !bookId.includes("+");
                          
                          // Use ID directly if it's a recognized format
                          if (isISBN || isOpenLibraryId || isMongoObjectId || isValidId) {
                            router.push(`/b/${bookId}`);
                          } else {
                            // Create slug from title for unrecognized formats
                            const slug = createBookSlug(entry.bookTitle || "Book", undefined, bookId);
                            router.push(`/b/${slug}`);
                          }
                        } catch (error) {
                          console.error("Error navigating to book:", error);
                        }
                      }
                      // Don't navigate for collaboration requests - they have buttons
                    }}
                    className={`flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1 ${
                      (entry.type === "diary_entry" || entry.type === "shared_list" || entry.type === "shared_book" || entry.type === "granted_access") ? "cursor-pointer" : ""
                    }`}
                  >
                    {/* Show profile picture of the person who did the activity */}
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-muted border-2 border-border">
                        <Image
                          src={entry.userAvatar || defaultAvatar}
                          alt={entry.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                          quality={100}
                        />
                      </div>
                    <div className="flex flex-1 flex-col justify-center gap-1">
                      <p className="text-xs text-muted-foreground">{entry.timeAgo}</p>
                      <p className="text-base font-semibold text-foreground">
                        <span className="font-medium">@{entry.username || entry.name}</span>
                        {entry.action && " "}
                        {entry.action && <span>{entry.action}</span>}
                        {entry.detail && " "}
                        {entry.detail && (
                          <span className="font-medium text-muted-foreground">{entry.detail}</span>
                        )}
                        {(entry.type === "shared_list" || entry.type === "collaboration_request") && entry.listBooksCount !== undefined && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({entry.listBooksCount} {entry.listBooksCount === 1 ? "book" : "books"})
                          </span>
                        )}
                      </p>
                      {/* Accept/Reject buttons for collaboration requests */}
                      {entry.type === "collaboration_request" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCollaborationRequest(entry, "accept");
                            }}
                            disabled={processingRequest === entry.id}
                          >
                            {processingRequest === entry.id ? "Processing..." : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCollaborationRequest(entry, "reject");
                            }}
                            disabled={processingRequest === entry.id}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* Show cover for shared lists and collaboration requests */}
                    {(entry.type === "shared_list" || entry.type === "collaboration_request") && entry.cover && (
                      <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={entry.cover}
                          alt={entry.detail || "List cover"}
                          fill
                          className="object-cover"
                          sizes="48px"
                          quality={100}
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
              
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                          isActive={currentPage === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Diary Entry Dialog */}
      {selectedDiaryEntry && session?.user?.username && (
        <DiaryEntryDialog
          open={!!selectedDiaryEntry}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDiaryEntry(null);
              setSelectedDiaryEntryUsername(null);
            }
          }}
          entry={selectedDiaryEntry}
          username={selectedDiaryEntryUsername || session.user.username}
          isOwnProfile={false}
          onLikeChange={async () => {
            // Refresh activities after like change
            if (session?.user?.username) {
              try {
                const response = await fetch(`/api/users/${encodeURIComponent(session.user.username)}/activities/following?page=${currentPage}&pageSize=${ACTIVITY_PAGE_SIZE}`);
                if (response.ok) {
                  const data = await response.json();
                  
                  const transformedActivities: ActivityEntry[] = Array.isArray(data.activities)
                    ? data.activities.map((activity: any, idx: number) => {
                        const { action, bookTitle } = formatActivity(activity);
                        
                        const baseEntry: ActivityEntry = {
                          id: activity._id?.toString() || `activity-${idx}`,
                          name: activity.userName || activity.username || "User",
                          username: activity.username,
                          userAvatar: activity.userAvatar,
                          action,
                          detail: activity.isGeneralEntry 
                            ? (activity.subject && activity.subject.trim() ? activity.subject : "a diary entry")
                            : (activity.type === "shared_list" || activity.type === "collaboration_request" ? activity.listTitle : bookTitle),
                          bookTitle: activity.type === "shared_list" || activity.type === "collaboration_request" ? activity.listTitle : bookTitle,
                          timeAgo: formatTimeAgo(activity.timestamp),
                          cover: activity.type === "shared_list" || activity.type === "collaboration_request"
                            ? (activity.listCover || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80")
                            : (activity.bookCover || (activity.isGeneralEntry ? null : "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80")),
                          type: activity.type,
                        };
                        
                        // Add diary entry specific fields if it's a diary entry
                        if (activity.type === "diary_entry") {
                          baseEntry.diaryEntryId = activity.diaryEntryId;
                          baseEntry.bookId = activity.bookId;
                          baseEntry.bookAuthor = activity.bookAuthor;
                          baseEntry.content = activity.content;
                          baseEntry.createdAt = activity.createdAt;
                          baseEntry.updatedAt = activity.updatedAt;
                          baseEntry.isLiked = activity.isLiked;
                          baseEntry.likesCount = activity.likesCount;
                          baseEntry.isGeneralEntry = activity.isGeneralEntry;
                        }
                        
                        // Add shared list and collaboration request specific fields
                        if (activity.type === "shared_list" || activity.type === "collaboration_request") {
                          baseEntry.listId = activity.listId;
                          baseEntry.sharedByUsername = activity.sharedByUsername;
                          baseEntry.listBooksCount = activity.listBooksCount;
                        }
                        
                        if (activity.type === "shared_book") {
                          baseEntry.bookId = activity.bookId;
                        }
                        
                        return baseEntry;
                      })
                    : [];
                  
                  setActivities(transformedActivities);
                  setTotalPages(data.totalPages || 1);
                  
                  // Update selected entry
                  const updatedEntry = transformedActivities.find(a => a.diaryEntryId === selectedDiaryEntry.id);
                  if (updatedEntry && updatedEntry.type === "diary_entry") {
                    setSelectedDiaryEntry({
                      id: updatedEntry.diaryEntryId!,
                      bookId: updatedEntry.bookId,
                      bookTitle: updatedEntry.bookTitle,
                      bookAuthor: updatedEntry.bookAuthor,
                      bookCover: updatedEntry.cover,
                      content: updatedEntry.content,
                      createdAt: updatedEntry.createdAt,
                      updatedAt: updatedEntry.updatedAt,
                      isLiked: updatedEntry.isLiked,
                      likesCount: updatedEntry.likesCount,
                    });
                    // Preserve the username
                    if (updatedEntry.username) {
                      setSelectedDiaryEntryUsername(updatedEntry.username);
                    }
                  }
                }
              } catch (error) {
                console.error("Error refreshing activities:", error);
              }
            }
          }}
        />
      )}
    </div>
  );
}

