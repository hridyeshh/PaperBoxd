"use client";

import Image from "next/image";
import React from "react";
import { ChevronDown, Grid2x2PlusIcon, MenuIcon, SearchIcon, LinkIcon, Trash2 } from "lucide-react";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

import { cn, DEFAULT_AVATAR } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/primitives/button";
import { CommandItem, SearchModal } from "@/components/ui/features/search-modal";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/primitives/sheet";
import { ThemeToggle } from "@/components/ui/features/theme-toggle";
import { Dropdown } from "@/components/ui/primitives/dropdown";
import { signOut } from "@/lib/auth-client";
import { DeleteAccountDialog } from "@/components/ui/dialogs/delete-account-dialog";
import { GeneralDiaryEditorDialog } from "@/components/ui/dialogs/general-diary-editor-dialog";
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
  profileAvatarSrc?: string;
  profileMenuOpen?: boolean;
  minimalMobile?: boolean; // Show only logo and theme toggle on mobile
}

export function Header({
  profileButtonLabel,
  onProfileButtonClick,
  profileAvatarSrc,
  profileMenuOpen,
  minimalMobile = false,
}: HeaderProps) {
  const [open, setOpen] = React.useState(false);
  const [internalProfileMenuOpen, setInternalProfileMenuOpen] = React.useState(false);
  const [fetchedAvatar, setFetchedAvatar] = React.useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = React.useState(false);
  const [isNavigatingToProfile, setIsNavigatingToProfile] = React.useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = React.useState(false);
  const [hasNewActivities, setHasNewActivities] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [writeDialogOpen, setWriteDialogOpen] = React.useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  // Always show minimal header on mobile (only logo and theme toggle)
  const showMinimal = isMobile;
  
  // Fetch logged-in user's profile avatar from database when authenticated
  // Always fetch the logged-in user's avatar, not the profile being viewed
  React.useEffect(() => {
    if (isAuthenticated && session?.user?.username) {
      const username = session.user.username;
      setIsLoadingAvatar(true);
      // Fetch logged-in user's profile to get their avatar
      fetch(`/api/users/${encodeURIComponent(username)}`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          return null;
        })
        .then((data) => {
          if (data?.user?.avatar) {
            setFetchedAvatar(data.user.avatar);
          } else {
            // If no avatar in database, use session image or clear
            setFetchedAvatar(null);
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch avatar in header:", err);
          setFetchedAvatar(null);
        })
        .finally(() => {
          setIsLoadingAvatar(false);
        });
    } else if (!isAuthenticated) {
      setFetchedAvatar(null);
      setIsLoadingAvatar(false);
    }
  }, [isAuthenticated, session?.user?.username]);

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
        } catch (e) {
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
        } catch (e) {
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
    if (!isAuthenticated || !session?.user?.username) {
      setHasNewActivities(false);
      return;
    }

    const username = session.user.username;
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

    // Check immediately
    checkNewActivities();

    // Check every 30 seconds
    const interval = setInterval(checkNewActivities, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, session?.user?.username, pathname]);
  
  // Ensure avatarSrc is never an empty string
  // Priority: fetchedAvatar (logged-in user from database) > default
  // Don't use session?.user?.image as it may contain Google profile images
  // Note: profileAvatarSrc prop is ignored - we always show logged-in user's avatar
  const avatarSrc = React.useMemo(() => {
    // Only use fetchedAvatar from database, not Google images from session
    const src = fetchedAvatar;
    // Return fallback if empty string, null, or undefined
    if (!src || (typeof src === "string" && src.trim() === "")) {
      return DEFAULT_AVATAR;
    }
    return src;
  }, [fetchedAvatar]);
  
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
      if (session?.user?.username) {
        const cacheKey = `profile_${session.user.username}`;
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
        if (!cached) {
          // Prefetch in background
          fetch(`/api/users/${encodeURIComponent(session.user.username)}`)
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
                } catch (e) {
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
        if (session?.user?.username) {
          window.location.href = `/u/${session.user.username}`;
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
    try {
      await signOut();
      // signOut already redirects to /auth, but we can ensure it with window.location
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: redirect even if signOut fails
      window.location.href = "/auth";
    }
  };

  return (
    <>
      {/* Full-page loader overlay when navigating to profile */}
      {isNavigatingToProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <TetrisLoading size="sm" speed="fast" loadingText="Loading profile..." />
          </div>
        </div>
      )}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] w-full border-b",
          "border-gray-200/50 dark:border-border/60",
          "bg-white dark:bg-black",
        )}
      >
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/")}
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
                  router.push("/feed");
                } else {
                  router.push("/auth");
                }
              }}
              className={buttonVariants({
                variant: "ghost",
                className: "font-medium text-foreground/80 hover:text-foreground",
              })}
            >
              Feed
            </button>
            {isAuthenticated && session?.user?.username ? (
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push("/activity");
                  }}
                  className={cn(
                    buttonVariants({
                      variant: "ghost",
                      className: "font-medium text-foreground/80 hover:text-foreground relative",
                    })
                  )}
                >
                  Updates
                  {hasNewActivities && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                  )}
                </button>
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
                disabled={isNavigatingToProfile || isLoadingAvatar}
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-full border-2 border-foreground/80 p-0.5",
                  "transition-all duration-150 hover:scale-[1.10] active:scale-95 cursor-pointer",
                  (isNavigatingToProfile || isLoadingAvatar) && "opacity-75 cursor-wait",
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
                        if (session?.user?.username) {
                          const profileUrl = `${window.location.origin}/u/${session.user.username}`;
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
                      router.push("/feed");
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
                {isAuthenticated && session?.user?.username ? (
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
    {isAuthenticated && session?.user?.username && (
      <GeneralDiaryEditorDialog
        open={writeDialogOpen}
        onOpenChange={setWriteDialogOpen}
        username={session.user.username}
      />
    )}
    <DeleteAccountDialog
      open={isDeleteAccountOpen}
      onOpenChange={setIsDeleteAccountOpen}
    />
    </>
  );
}

