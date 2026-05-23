"use client";

import Image from "next/image";
import React from "react";
import { ChevronDown, Grid2x2PlusIcon, MenuIcon, SearchIcon, LinkIcon, Trash2 } from "lucide-react";
import BookLoader from "@/components/ui/features/book-loader";
import { useAuth } from "@/components/providers/auth-provider";
import { logoutAction } from "@/lib/auth/actions";
import { signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

import { cn, DEFAULT_AVATAR } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/primitives/button";
import { CommandItem, SearchModal } from "@/components/ui/features/search-modal";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/primitives/sheet";
import { ThemeToggle } from "@/components/ui/features/theme-toggle";
import { Dropdown } from "@/components/ui/primitives/dropdown";
import { DeleteAccountDialog } from "@/components/ui/dialogs/delete-account-dialog";
import { GeneralDiaryEditorDialog } from "@/components/ui/dialogs/general-diary-editor-dialog";
import { ActivityPopover } from "@/components/ui/layout/activity-popover";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";

// Links will be dynamic based on authentication status
// We'll handle Activity link specially in the component

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

interface HeaderProps {
  profileButtonLabel?: string;
  onProfileButtonClick?: () => void;
  profileMenuOpen?: boolean;
  minimalMobile?: boolean; // Show only logo and theme toggle on mobile
  className?: string;
}

export function Header({
  profileButtonLabel,
  onProfileButtonClick,
  profileMenuOpen,
  minimalMobile: _minimalMobile = false,
  className,
}: HeaderProps) {
  const [open, setOpen] = React.useState(false);
  const [internalProfileMenuOpen, setInternalProfileMenuOpen] = React.useState(false);
  const [isNavigatingToProfile, setIsNavigatingToProfile] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = React.useState(false);
  const [hasNewActivities, setHasNewActivities] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [writeDialogOpen, setWriteDialogOpen] = React.useState(false);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  // Always show minimal header on mobile (only logo and theme toggle)
  const showMinimal = isMobile;
  // minimalMobile prop is available but not used - keeping for API compatibility
  void _minimalMobile; // Suppress unused variable warning
  

  // Detect theme for logo switching
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const root = window.document.documentElement;
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

      const resolveInitialTheme = () => {
        const hasDarkClass = root.classList.contains("dark");
        let storedTheme: string | null = null;
        
        try {
          storedTheme = window.localStorage.getItem("paperboxd-theme");
        } catch {
          // localStorage might not be available (private browsing, etc.)
        }
        
        if (storedTheme === "dark" || storedTheme === "light") {
          return storedTheme === "dark";
        }
        
        return hasDarkClass || systemPrefersDark.matches;
      };

      const initialIsDark = resolveInitialTheme();
      setIsDark(initialIsDark);
      setMounted(true);

      const handleSystemThemeChange = (event: MediaQueryListEvent) => {
        try {
          const storedTheme = window.localStorage.getItem("paperboxd-theme");
          if (!storedTheme) {
            setIsDark(event.matches);
          }
        } catch {
          // Ignore localStorage errors
        }
      };

      const handleThemeChange = () => {
        const hasDarkClass = root.classList.contains("dark");
        setIsDark(hasDarkClass);
      };

      // Watch for theme changes
      const observer = new MutationObserver(handleThemeChange);
      observer.observe(root, {
        attributes: true,
        attributeFilter: ["class"],
      });

      systemPrefersDark.addEventListener("change", handleSystemThemeChange);

      return () => {
        systemPrefersDark.removeEventListener("change", handleSystemThemeChange);
        observer.disconnect();
      };
    } catch (error) {
      // Fallback: just set mounted to true with default theme
      console.warn("Error setting up theme detection:", error);
      setIsDark(false);
      setMounted(true);
    }
  }, []);

  // Check for new friend activities periodically
  React.useEffect(() => {
    if (!isAuthenticated || !user?.username) {
      setHasNewActivities(false);
      return;
    }

    const username = user.username;
    const isOnActivityPage = pathname === "/activity";
    
    // If user is on activity page, clear the indicator and update timestamp
    if (isOnActivityPage) {
      const now = new Date().toISOString();
      localStorage.setItem(`activity_last_viewed_${username}`, now);
      setHasNewActivities(false);
      return; // Don't check for new activities while on the page
    }
    
    // Get last viewed timestamp from localStorage
    const lastViewed = localStorage.getItem(`activity_last_viewed_${username}`);

    const checkNewActivities = async () => {
      try {
        const url = lastViewed
          ? `/api/users/${encodeURIComponent(username)}/activities/check-new?lastViewed=${encodeURIComponent(lastViewed)}`
          : `/api/users/${encodeURIComponent(username)}/activities/check-new`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setHasNewActivities(data.hasNewActivities || false);
        }
      } catch (error) {
        console.warn("Failed to check for new activities:", error);
      }
    };

    // Throttle the immediate check: skip if we fired within the last 10 seconds
    // (prevents 429s when the user refreshes rapidly)
    const THROTTLE_KEY = `activity_last_check_${username}`;
    const lastCheck = Number(sessionStorage.getItem(THROTTLE_KEY) ?? 0);
    const now = Date.now();
    if (now - lastCheck > 10_000) {
      sessionStorage.setItem(THROTTLE_KEY, String(now));
      checkNewActivities();
    }

    // Check every 30 seconds
    const interval = setInterval(checkNewActivities, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.username, pathname]);
  
  // avatar_url is stored in the pb_user cookie by the auth provider — no fetch needed
  const avatarSrc = (user?.avatar_url && user.avatar_url.trim() !== "")
    ? user.avatar_url
    : DEFAULT_AVATAR;
  
  const profileLabel = profileButtonLabel ?? "Open profile menu";
  const isProfileMenuOpen = profileMenuOpen ?? internalProfileMenuOpen;

  const handleProfileMenuOpenChange = (nextOpen: boolean) => {
    if (profileMenuOpen === undefined) {
      setInternalProfileMenuOpen(nextOpen);
    }
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setIsNavigatingToProfile(true);
      // Prefetch profile data if not already cached
      if (user?.username) {
        const cacheKey = `profile_${user?.username}`;
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
        if (!cached) {
          // Prefetch in background
          fetch(`/api/users/${encodeURIComponent(user?.username)}`)
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (data?.user && typeof window !== "undefined") {
                try {
                  sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: {
                      username: data.user.username,
                      name: data.user.name,
                      avatar: data.user.avatar,
                      email: data.user.email,
                      bio: data.user.bio,
                      pronouns: data.user.pronouns || [],
                      links: data.user.links || [],
                      gender: data.user.gender,
                      isPublic: data.user.isPublic,
                      birthday: data.user.birthday,
                    },
                    timestamp: Date.now(),
                  }));
                } catch {
                  // Storage quota exceeded
                }
              }
            })
            .catch(() => {
              // Ignore prefetch errors
            });
        }
      }
      // Small delay to allow prefetch to start, then navigate to /u/[username]
      setTimeout(() => {
        if (user?.username) {
          window.location.href = `/u/${user?.username}`;
        } else {
          // Fallback to /profile if username not available yet
          window.location.href = "/profile";
        }
      }, 50);
    } else {
      window.location.href = "/auth";
    }
    if (onProfileButtonClick) {
      onProfileButtonClick();
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAction();
      await signOut({ redirect: false });
    } catch {
      // ignore errors, navigate anyway
    }
    window.location.href = "/auth";
  };

  return (
    <>
      {/* Full-page loader overlay when navigating to profile */}
      {isNavigatingToProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <BookLoader size="sm" speed="fast" loadingText="Loading profile..." />
          </div>
        </div>
      )}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <BookLoader size="sm" speed="fast" loadingText="Signing out..." />
        </div>
      )}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] w-full border-b",
          "border-gray-200/50 dark:border-border/60",
          "bg-white dark:bg-black",
          className
        )}
      >
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={() => {
            // Only navigate if not already on home page
            if (pathname !== "/") {
              router.push("/");
            } else {
              // If already on home, scroll to top
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-2 rounded-full px-1 py-1 transition hover:bg-white dark:hover:bg-black cursor-pointer"
        >
          {mounted && (isDark !== undefined) ? (
            <Image
              src={isDark ? "/logo_black.jpg" : "/logo_white.jpg"}
              alt="PaperBoxd"
              width={220}
              height={120}
              className="h-16 dark:h-14 w-auto object-contain"
              priority
            />
          ) : (
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Grid2x2PlusIcon className="size-3.5" />
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {!showMinimal && (
          <div className="hidden items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isAuthenticated) {
                  router.push("/recommendations");
                } else {
                  router.push("/auth");
                }
              }}
              className={buttonVariants({
                variant: "ghost",
                className: "font-medium text-foreground/80 hover:text-foreground",
              })}
            >
              Recommendations
            </button>
            {isAuthenticated && user?.username ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setWriteDialogOpen(true);
                  }}
                  className={buttonVariants({
                    variant: "ghost",
                    className: "font-medium text-foreground/80 hover:text-foreground",
                  })}
                >
                  Write
                </button>
                <ActivityPopover
                  username={user?.username || ""}
                  hasNewActivities={hasNewActivities}
                  onOpen={() => setHasNewActivities(false)}
                  variant="text"
                />
              </>
            ) : null}
          </div>
          )}
          {!showMinimal && (
          <SearchModal data={searchItems}>
            <Button
              variant="outline"
              className="relative h-10 cursor-pointer px-3 text-sm md:w-44 md:justify-between md:gap-2"
            >
              <span className="hidden md:inline-flex text-muted-foreground">
                Search library...
              </span>
              <span className="sr-only">Search</span>
              <SearchIcon className="size-4" />
            </Button>
          </SearchModal>
          )}
          {/* Mobile: Updates popover before theme toggle */}
          {isMobile && isAuthenticated && (
            <ActivityPopover
              username={user?.username || ""}
              hasNewActivities={hasNewActivities}
              onOpen={() => setHasNewActivities(false)}
              variant="bell"
            />
          )}
          <ThemeToggle className="transition-transform hover:scale-[1.02]" />
          {isAuthenticated ? (
            <div className={cn(
              "flex items-center gap-2",
              showMinimal ? "pl-2" : "pl-8"
            )}>
              {/* Profile avatar button - hidden on mobile */}
              <button
                type="button"
                aria-label="View profile"
                onClick={handleProfileClick}
                disabled={isNavigatingToProfile}
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-full border-2 border-foreground/80 p-0.5",
                  "transition-all duration-150 hover:scale-[1.10] active:scale-95 cursor-pointer",
                  isNavigatingToProfile && "opacity-75 cursor-wait",
                  "hidden md:flex"
                )}
              >
                <Image
                  src={avatarSrc}
                  alt={profileLabel}
                  width={40}
                  height={40}
                  className="size-8 rounded-full object-cover"
                />
              </button>
              <Dropdown.Root
                isOpen={isProfileMenuOpen}
                onOpenChange={handleProfileMenuOpenChange}
              >
                <Dropdown.Trigger
                  aria-label={profileLabel}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  className="rounded-full p-1 transition hover:bg-foreground/5"
                  onClick={onProfileButtonClick}
                >
                  <ChevronDown
                    className={cn(
                      "size-5 text-muted-foreground transition-transform duration-200",
                      isProfileMenuOpen && "rotate-180",
                    )}
                  />
                </Dropdown.Trigger>
                <Dropdown.Popover align="end">
                  <Dropdown.Menu>
                    {isMobile && (
                      <>
                        <Dropdown.Item 
                          label="View profile" 
                          onClick={() => {
                            handleProfileClick();
                            setInternalProfileMenuOpen(false);
                          }}
                        />
                        <Dropdown.Separator />
                      </>
                    )}
                    <Dropdown.Item 
                      label="Share profile link" 
                      icon={LinkIcon}
                      onClick={async () => {
                        if (user?.username) {
                          const profileUrl = `${window.location.origin}/u/${user?.username}`;
                          try {
                            await navigator.clipboard.writeText(profileUrl);
                            toast.success('Profile link copied to clipboard!');
                          } catch (err) {
                            console.error('Failed to copy profile link:', err);
                            toast.error('Failed to copy profile link');
                          }
                        }
                        setInternalProfileMenuOpen(false);
                      }}
                    />
                    <Dropdown.Separator />
                    <Dropdown.Item 
                      label="Delete account" 
                      icon={Trash2}
                      onClick={() => {
                        setIsDeleteAccountOpen(true);
                        setInternalProfileMenuOpen(false);
                      }}
                      className="text-destructive hover:text-destructive focus:text-destructive [&_svg]:text-destructive"
                    />
                    <Dropdown.Separator />
                    <Dropdown.Item label="Log out" onClick={handleLogout} />
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.Root>
            </div>
          ) : !showMinimal ? (
            <div className="flex items-center gap-2 pl-8">
              <Button
                variant="outline"
                onClick={() => { window.location.href = "/auth"; }}
                className="text-sm"
              >
                Log in
              </Button>
              <Button
                onClick={() => { window.location.href = "/auth"; }}
                className="text-sm"
              >
                Create account
              </Button>
            </div>
          ) : null}
          {!showMinimal && (
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen((prev) => !prev)}
              className="lg:hidden"
            >
              <span className="sr-only">Toggle navigation</span>
              <MenuIcon className="size-4" />
            </Button>
            <SheetContent
              className="gap-0 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
              showClose={false}
              side="left"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <button
                type="button"
                onClick={() => {
                  router.push("/");
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-4 pt-8 pb-6 w-full transition hover:bg-white dark:hover:bg-black cursor-pointer rounded-lg"
              >
                {mounted && (isDark !== undefined) ? (
                  <Image
                    src={isDark ? "/logo_black.jpg" : "/logo_white.jpg"}
                    alt="PaperBoxd"
                    width={220}
                    height={120}
                    className="h-16 dark:h-14 w-auto object-contain"
                    priority
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Grid2x2PlusIcon className="size-4" />
                  </span>
                )}
              </button>
              <div className="grid gap-y-2 overflow-y-auto px-4 pb-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isAuthenticated) {
                      router.push("/recommendations");
                    } else {
                      router.push("/auth");
                    }
                    setOpen(false);
                  }}
                  className={buttonVariants({
                    variant: "ghost",
                    className: "justify-start text-base",
                  })}
                >
                  Feed
                </button>
                {isAuthenticated && user?.username ? (
                  <button
                    onClick={() => {
                      router.push("/activity");
                      setOpen(false);
                    }}
                    className={buttonVariants({
                      variant: "ghost",
                      className: "justify-start text-base",
                    })}
                  >
                    Updates
                  </button>
                ) : null}
              </div>
              <SheetFooter className="flex flex-col gap-2 px-4 pb-6">
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
                <Button className="w-full">Create account</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          )}
        </div>
      </nav>
    </header>
    {isAuthenticated && user?.username && (
      <GeneralDiaryEditorDialog
        open={writeDialogOpen}
        onOpenChange={setWriteDialogOpen}
        username={user?.username}
      />
    )}
    <DeleteAccountDialog
      open={isDeleteAccountOpen}
      onOpenChange={setIsDeleteAccountOpen}
    />
    </>
  );
}

