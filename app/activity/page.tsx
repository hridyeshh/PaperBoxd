"use client";

import Image from "next/image";
import * as React from "react";
import { UserRound, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { DockToggle } from "@/components/ui/dock";
import { Header } from "@/components/ui/layout/header-with-search";
import TetrisLoading from "@/components/ui/tetris-loader";

type ActivityView = "Friends" | "Me";

type ActivityEntry = {
  id: string;
  name: string;
  action: string;
  detail: string;
  timeAgo: string;
  cover: string;
};

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated";
  const [activityView, setActivityView] = React.useState<ActivityView>("Friends");
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (status === "loading") {
      return; // Still loading session
    }

    if (!isAuthenticated || !session?.user?.username) {
      router.replace("/auth");
      return;
    }
  }, [status, isAuthenticated, session, router]);

  // Fetch logged-in user's activities
  React.useEffect(() => {
    if (!isAuthenticated || !session?.user?.username) {
      setIsLoading(false);
      return;
    }

    const username = session.user.username;
    setIsLoading(true);

    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch profile: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          // Transform activities
          const transformedActivities: ActivityEntry[] = Array.isArray(data.user.recentActivities)
            ? data.user.recentActivities.map((activity: any, idx: number) => {
                // Format time ago
                const activityDate = activity.timestamp ? new Date(activity.timestamp) : new Date();
                const now = new Date();
                const diffMs = now.getTime() - activityDate.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                let timeAgo = "";
                if (diffMins < 1) timeAgo = "Just now";
                else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                else if (diffDays === 1) timeAgo = "Yesterday";
                else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
                else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)}w ago`;
                else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}mo ago`;
                else timeAgo = `${Math.floor(diffDays / 365)}y ago`;
                
                // Format action based on type
                let action = "";
                let detail = "";
                if (activity.type === "read") {
                  action = "finished";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "rated") {
                  action = `rated ${"★".repeat(activity.rating || 0)}`;
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "liked") {
                  action = "liked";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "added_to_list") {
                  action = "added to list";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "started_reading") {
                  action = "started reading";
                  detail = activity.bookTitle || "a book";
                } else if (activity.type === "reviewed") {
                  action = "reviewed";
                  detail = activity.bookTitle || "a book";
                }
                
                return {
                  id: activity._id?.toString() || `activity-${idx}`,
                  name: "You", // Always "You" since this is the logged-in user's activity page
                  action,
                  detail,
                  timeAgo,
                  cover: activity.bookCover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
                };
              })
            : [];
          setActivities(transformedActivities);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch activities:", error);
        setActivities([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAuthenticated, session?.user?.username]);

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
            <DockToggle
              items={[
                {
                  label: "Friends",
                  icon: Users,
                  isActive: activityView === "Friends",
                  onClick: () => setActivityView("Friends"),
                },
                {
                  label: "Me",
                  icon: UserRound,
                  isActive: activityView === "Me",
                  onClick: () => setActivityView("Me"),
                },
              ]}
            />
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
            <div className="grid gap-6 md:grid-cols-2">
              {activities
                .filter((entry) => {
                  // Filter based on activityView
                  if (activityView === "Me") {
                    return entry.name === "You";
                  } else {
                    return entry.name !== "You";
                  }
                })
                .map((entry) => (
                  <article
                    key={entry.id}
                    className="flex gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm transition hover:-translate-y-1"
                  >
                    <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-muted">
                      <Image src={entry.cover} alt={entry.detail} fill className="object-cover" sizes="96px" />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{entry.timeAgo}</p>
                        <p className="text-base font-semibold text-foreground">
                          {entry.name} {entry.action}
                        </p>
                        <p className="text-sm text-muted-foreground">{entry.detail}</p>
                      </div>
                      <button className="text-sm font-semibold text-primary transition hover:text-primary/80">
                        View details
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

