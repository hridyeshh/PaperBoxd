"use client";

import Image from "next/image";
import React from "react";
import { SearchIcon, ChevronDown, NotebookPen } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { logoutAction } from "@/lib/auth/actions";
import { signOut } from "next-auth/react";
import BookLoader from "@/components/ui/features/book-loader";
import { cn, DEFAULT_AVATAR } from "@/lib/utils";
import { SearchModal, CommandItem } from "@/components/ui/features/search-modal";
import { ThemeToggle } from "@/components/ui/features/theme-toggle";
import { Dropdown } from "@/components/ui/primitives/dropdown";
import { DeleteAccountDialog } from "@/components/ui/dialogs/delete-account-dialog";
import { GeneralDiaryEditorDialog } from "@/components/ui/dialogs/general-diary-editor-dialog";
import { ActivityPopover } from "@/components/ui/layout/activity-popover";
import { toast } from "sonner";
import { Pinyon_Script } from "next/font/google";

const pinyonScript = Pinyon_Script({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Find a new book", href: "/recommendations" },
  { label: "Lists", href: "/lists" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const searchItems: CommandItem[] = [
  {
    id: "search-1",
    title: "Track finished books",
    description: "Log what you have read and capture quick notes.",
    category: "Library",
  },
  {
    id: "search-2",
    title: "Plan your next read",
    description: "Queue titles and set personal reading goals.",
    category: "Planning",
  },
  {
    id: "search-3",
    title: "Share curated shelves",
    description: "Showcase themed collections with friends.",
    category: "Community",
  },
  {
    id: "search-4",
    title: "Sync highlights",
    description: "Keep favourite passages and insights in one place.",
    category: "Notes",
  },
];

export function MinimalDesktopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isNavigatingToProfile, setIsNavigatingToProfile] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = React.useState(false);
  const [writeDialogOpen, setWriteDialogOpen] = React.useState(false);
  const [hasNewActivities, setHasNewActivities] = React.useState(false);

  // Use avatar directly from auth cookie — no per-render fetch needed
  const avatarSrc =
    user?.avatar_url && user.avatar_url.trim() !== "" ? user.avatar_url : DEFAULT_AVATAR;

  // Check for new activities every 30 s
  React.useEffect(() => {
    if (!isAuthenticated || !user?.username) return;

    const username = user.username;

    if (pathname === "/activity") {
      localStorage.setItem(`activity_last_viewed_${username}`, new Date().toISOString());
      setHasNewActivities(false);
      return;
    }

    const lastViewed = localStorage.getItem(`activity_last_viewed_${username}`);

    const check = async () => {
      try {
        const url = lastViewed
          ? `/api/users/${encodeURIComponent(username)}/activities/check-new?lastViewed=${encodeURIComponent(lastViewed)}`
          : `/api/users/${encodeURIComponent(username)}/activities/check-new`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setHasNewActivities(data.hasNewActivities || false);
        }
      } catch {
        // silent fail
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.username, pathname]);

  // Reset navigation loading state when pathname changes
  React.useEffect(() => {
    setIsNavigatingToProfile(false);
  }, [pathname]);

  const handleProfileClick = () => {
    if (!user?.username) return;
    const targetPath = `/u/${user.username}`;
    if (pathname !== targetPath) {
      setIsNavigatingToProfile(true);
      router.push(targetPath);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAction();
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    window.location.href = "/auth";
  };

  const handleCopyProfileLink = () => {
    if (user?.username) {
      navigator.clipboard.writeText(`${window.location.origin}/u/${user.username}`);
      toast.success("Profile link copied to clipboard");
      setIsProfileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Full-page overlay when navigating */}
      {isNavigatingToProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Loading profile…</div>
        </div>
      )}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <BookLoader size="sm" speed="fast" loadingText="Signing out…" />
        </div>
      )}

      <header className="hidden md:flex fixed top-0 left-0 right-0 z-[100] h-16 items-center border-b border-border/60 bg-background/95 backdrop-blur-md px-5 gap-4">

        {/* ── Left: wordmark + nav ── */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {/* Wordmark */}
          <button
            type="button"
            onClick={() =>
              pathname !== "/" ? router.push("/") : window.scrollTo({ top: 0, behavior: "smooth" })
            }
            className="flex items-center gap-2 pr-3 hover:opacity-75 transition-opacity"
          >
            <Image
              src="/icon.jpg"
              alt="PaperBoxd"
              width={26}
              height={26}
              className="rounded-full flex-shrink-0"
              priority
            />
            <span
              className={cn("text-[1.55rem] leading-none text-foreground select-none", pinyonScript.className)}
            >
              PaperBoxd
            </span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-border/70 mx-1 flex-shrink-0" />

          {/* Nav links */}
          <nav className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => router.push(href)}
                  className={cn(
                    "px-3 py-1.5 text-[0.8125rem] font-medium rounded-lg transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Center: compact search ── */}
        <div className="flex-1 flex justify-center">
          <SearchModal data={searchItems}>
            <button
              type="button"
              className={cn(
                "flex h-9 w-full max-w-[420px] items-center gap-2 rounded-lg border border-border bg-muted/50 px-3",
                "text-[0.8125rem] text-muted-foreground transition-colors hover:bg-muted hover:border-border/80"
              )}
            >
              <SearchIcon className="size-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="hidden sm:flex items-center font-mono text-[10px] bg-background border border-border rounded px-1.5 py-px leading-none">
                ⌘K
              </kbd>
            </button>
          </SearchModal>
        </div>

        {/* ── Right: write, bell, theme, profile ── */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {/* Write */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setWriteDialogOpen(true)}
              title="Write a diary entry"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <NotebookPen className="size-[18px]" />
            </button>
          )}

          {/* Notifications / Updates */}
          {isAuthenticated && (
            <ActivityPopover
              username={user?.username || ""}
              hasNewActivities={hasNewActivities}
              onOpen={() => setHasNewActivities(false)}
              variant="bell"
            />
          )}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Profile */}
          {isAuthenticated && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                aria-label="View profile"
                onClick={handleProfileClick}
                disabled={isNavigatingToProfile}
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border-2 border-foreground/70 p-0.5 select-none",
                  "transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer",
                  isNavigatingToProfile && "opacity-75 cursor-wait"
                )}
              >
                <Image
                  src={avatarSrc}
                  alt="Profile"
                  width={32}
                  height={32}
                  draggable={false}
                  className="size-6 rounded-full object-cover pointer-events-none"
                />
              </button>
              <Dropdown.Root isOpen={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
                <Dropdown.Trigger
                  aria-label="Profile menu"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  className="rounded-full p-0.5 transition hover:bg-foreground/5"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200",
                      isProfileMenuOpen && "rotate-180"
                    )}
                  />
                </Dropdown.Trigger>
                <Dropdown.Popover align="end">
                  <Dropdown.Menu>
                    <Dropdown.Item label="Copy profile link" onClick={handleCopyProfileLink} />
                    <Dropdown.Item
                      label="Log out"
                      onClick={() => {
                        handleLogout();
                        setIsProfileMenuOpen(false);
                      }}
                    />
                    <Dropdown.Item
                      label="Delete account"
                      onClick={() => {
                        setIsDeleteAccountOpen(true);
                        setIsProfileMenuOpen(false);
                      }}
                      className="text-destructive focus:text-destructive"
                    />
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.Root>
            </div>
          )}
        </div>
      </header>

      {/* Write dialog (moved here from DesktopSidebar) */}
      {isAuthenticated && user?.username && (
        <GeneralDiaryEditorDialog
          open={writeDialogOpen}
          onOpenChange={setWriteDialogOpen}
          username={user.username}
        />
      )}

      {/* Delete Account dialog */}
      {isAuthenticated && (
        <DeleteAccountDialog
          open={isDeleteAccountOpen}
          onOpenChange={setIsDeleteAccountOpen}
        />
      )}
    </>
  );
}
