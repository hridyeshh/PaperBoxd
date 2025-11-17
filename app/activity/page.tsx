"use client";

import Image from "next/image";
import * as React from "react";
import { UserRound, Users, BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { DockToggle } from "@/components/ui/dock";
import { Header } from "@/components/ui/layout/header-with-search";
import TetrisLoading from "@/components/ui/tetris-loader";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ActivityView = "Friends" | "Me";

type ActivityEntry = {
  id: string;
  name: string;
  username?: string;
  userAvatar?: string;
  action: string;
  detail: string;
  timeAgo: string;
  cover: string;
  bookTitle?: string;
};

const ACTIVITY_PAGE_SIZE = 10;

// Default avatar placeholder (gray circle with user icon)
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Cpath d='M50 30c-8.284 0-15 6.716-15 15 0 5.989 3.501 11.148 8.535 13.526C37.514 62.951 32 70.16 32 78.5h36c0-8.34-5.514-15.549-13.535-19.974C59.499 56.148 63 50.989 63 45c0-8.284-6.716-15-15-15z' fill='white' opacity='0.8'/%3E%3C/svg%3E";

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated";
  const [activityView, setActivityView] = React.useState<ActivityView>("Friends");
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [hasFriendsActivities, setHasFriendsActivities] = React.useState(false);

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
    } else {
      console.warn(`Unknown activity type: "${activity.type}"`);
    }
    
    return { action, bookTitle };
  };

  // Fetch activities based on view type
  React.useEffect(() => {
    if (!isAuthenticated || !session?.user?.username) {
      setIsLoading(false);
      return;
    }

    const username = session.user.username;
    setIsLoading(true);

    if (activityView === "Friends") {
      // Fetch activities from followed users
      fetch(`/api/users/${encodeURIComponent(username)}/activities/following?page=${currentPage}&pageSize=${ACTIVITY_PAGE_SIZE}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch following activities: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          const transformedActivities: ActivityEntry[] = Array.isArray(data.activities)
            ? data.activities.map((activity: any, idx: number) => {
                const { action, bookTitle } = formatActivity(activity);
                
                return {
                  id: activity._id?.toString() || `activity-${idx}`,
                  name: activity.userName || activity.username || "User",
                  username: activity.username,
                  userAvatar: activity.userAvatar,
                  action,
                  detail: bookTitle,
                  bookTitle,
                  timeAgo: formatTimeAgo(activity.timestamp),
                  cover: activity.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                };
              })
            : [];
          setActivities(transformedActivities);
          setTotalPages(data.totalPages || 1);
          // Set indicator if there are any activities (total > 0)
          setHasFriendsActivities((data.total || 0) > 0);
        })
        .catch((error) => {
          console.error("Failed to fetch following activities:", error);
          setActivities([]);
          setTotalPages(1);
          setHasFriendsActivities(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Fetch logged-in user's activities
      fetch(`/api/users/${encodeURIComponent(username)}?page=${currentPage}&pageSize=${ACTIVITY_PAGE_SIZE}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch profile: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data?.user) {
            const allActivities = Array.isArray(data.user.recentActivities) ? data.user.recentActivities : [];
            
            // Apply pagination
            const total = allActivities.length;
            const calculatedTotalPages = Math.ceil(total / ACTIVITY_PAGE_SIZE);
            const startIndex = (currentPage - 1) * ACTIVITY_PAGE_SIZE;
            const endIndex = startIndex + ACTIVITY_PAGE_SIZE;
            const paginatedActivities = allActivities.slice(startIndex, endIndex);
            
            const transformedActivities: ActivityEntry[] = paginatedActivities.map((activity: any, idx: number) => {
              const { action, bookTitle } = formatActivity(activity);
              
              // Debug: Log if action is missing (but only if type exists)
              if (!action && activity.type) {
                console.error(`[Me Tab] Activity ${idx}: Type "${activity.type}" resulted in empty action. Activity data:`, activity);
              }
              
              // Debug: Log timestamp to see what we're receiving
              if (!activity.timestamp && !activity.createdAt) {
                console.warn(`[Me Tab] Activity ${idx}: Missing timestamp. Activity:`, {
                  type: activity.type,
                  timestamp: activity.timestamp,
                  createdAt: activity.createdAt,
                  _id: activity._id,
                  fullActivity: activity,
                });
              }
              
              // Use timestamp or createdAt, whichever is available
              const activityTimestamp = activity.timestamp || activity.createdAt;
              
              return {
                id: activity._id?.toString() || `activity-${idx}`,
                name: "You",
                action: action, // Should always be set by formatActivity for valid types
                detail: bookTitle || "",
                bookTitle: bookTitle || undefined,
                timeAgo: formatTimeAgo(activityTimestamp),
                cover: activity.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
              };
            });
            
            setActivities(transformedActivities);
            setTotalPages(calculatedTotalPages);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch activities:", error);
          setActivities([]);
          setTotalPages(1);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isAuthenticated, session?.user?.username, activityView, currentPage]);

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

  // Reset to page 1 when switching views
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activityView]);

  // Show loading while checking authentication or loading data
  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <TetrisLoading size="md" speed="fast" loadingText="Loading activity..." />
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Activity</h1>
              <p className="text-sm text-muted-foreground">See what friends are tracking or revisit your own updates.</p>
            </div>
            <div className="relative inline-block">
              <DockToggle
                items={[
                  {
                    label: "Friends",
                    icon: Users,
                    isActive: activityView === "Friends",
                    onClick: () => {
                      setActivityView("Friends");
                      // Update last viewed timestamp to clear red dot in header
                      if (session?.user?.username) {
                        localStorage.setItem(
                          `activity_last_viewed_${session.user.username}`,
                          new Date().toISOString()
                        );
                      }
                    },
                  },
                  {
                    label: "Me",
                    icon: UserRound,
                    isActive: activityView === "Me",
                    onClick: () => setActivityView("Me"),
                  },
                ]}
              />
              {/* Red dot indicator for Friends tab when there are activities */}
              {hasFriendsActivities && activityView !== "Friends" && (
                <div className="absolute -top-1 right-[50%] translate-x-2 h-3 w-3 rounded-full bg-red-500 border-2 border-background shadow-sm z-10" />
              )}
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center">
              <p className="text-lg font-semibold text-foreground">No activity yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {activityView === "Me"
                  ? "Your reading activity will appear here once you start tracking books."
                  : "No friend activity to show yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                {activities.map((entry) => (
                  <article
                    key={entry.id}
                    className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
                  >
                    {activityView === "Friends" ? (
                      // Friends tab: Show profile picture of the person who did the activity
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
                    ) : (
                      // Me tab: Don't show profile image, show book cover or icon instead
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {entry.cover && !entry.cover.includes('unsplash.com') ? (
                          <Image
                            src={entry.cover}
                            alt={entry.bookTitle || entry.detail}
                            fill
                            className="object-cover"
                            sizes="56px"
                            quality={100}
                            unoptimized={entry.cover?.includes('isbndb.com') || entry.cover?.includes('images.isbndb.com') || entry.cover?.includes('covers.isbndb.com') || true}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-center gap-1">
                      <p className="text-xs text-muted-foreground">{entry.timeAgo}</p>
                      <p className="text-base font-semibold text-foreground">
                        <span className="font-medium">{entry.name}</span>{" "}
                        {entry.action && <span>{entry.action}</span>}
                        {entry.action && entry.bookTitle && " "}
                        {entry.bookTitle && (
                          <span className="font-medium text-muted-foreground">{entry.bookTitle}</span>
                        )}
                      </p>
                    </div>
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
    </div>
  );
}

