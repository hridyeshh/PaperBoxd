"use client";

import Image from "next/image";
import React from "react";
import { SearchIcon, ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn, DEFAULT_AVATAR } from "@/lib/utils";
import { Button } from "@/components/ui/primitives/button";
import { SearchModal, CommandItem } from "@/components/ui/features/search-modal";
import { ThemeToggle } from "@/components/ui/features/theme-toggle";
import { Dropdown } from "@/components/ui/primitives/dropdown";
import { signOut } from "@/lib/auth-client";
import { DeleteAccountDialog } from "@/components/ui/dialogs/delete-account-dialog";
import { toast } from "sonner";

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
  const { data: session } = useSession();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [fetchedAvatar, setFetchedAvatar] = React.useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = React.useState(false);
  const [isNavigatingToProfile, setIsNavigatingToProfile] = React.useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = React.useState(false);

  // Fetch logged-in user's profile avatar from database
  React.useEffect(() => {
    if (session?.user?.username) {
      const username = session.user.username;
      setIsLoadingAvatar(true);
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
          }
        })
        .catch((error) => {
          console.error("Error fetching avatar:", error);
        })
        .finally(() => {
          setIsLoadingAvatar(false);
        });
    }
  }, [session?.user?.username]);

  const avatarSrc = fetchedAvatar || session?.user?.image || DEFAULT_AVATAR;
  const profileLabel = session?.user?.username
    ? `View ${session.user.username}'s profile`
    : "View profile";

  // Reset navigation loading state when pathname changes
  React.useEffect(() => {
    setIsNavigatingToProfile(false);
  }, [pathname]);

  const handleProfileClick = () => {
    if (!session?.user?.username) return;
    const targetPath = `/u/${session.user.username}`;
    // Only show loading if not already on profile page
    if (pathname !== targetPath) {
      setIsNavigatingToProfile(true);
      router.push(targetPath);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/auth";
    }
  };

  const handleCopyProfileLink = () => {
    if (session?.user?.username) {
      const profileUrl = `${window.location.origin}/u/${session.user.username}`;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied to clipboard");
      setIsProfileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Full-page loader overlay when navigating to profile */}
      {isNavigatingToProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm text-muted-foreground">Loading profile...</div>
          </div>
        </div>
      )}
      <header
        className={cn(
          "hidden md:flex fixed top-0 left-16 right-0 z-[100] w-[calc(100%-4rem)] border-b",
          "border-gray-200/50 dark:border-border/60",
          "bg-white dark:bg-black"
        )}
      >
        <nav className="mx-auto flex h-16 w-full items-center justify-between px-6 gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <SearchModal data={searchItems}>
              <Button
                variant="outline"
                className="relative h-12 w-full cursor-pointer px-4 text-sm justify-between gap-2"
              >
                <span className="text-muted-foreground">
                  Search library...
                </span>
                <SearchIcon className="size-4" />
              </Button>
            </SearchModal>
          </div>

          {/* Theme Toggle */}
          <div className="flex-shrink-0">
            <ThemeToggle className="transition-transform hover:scale-[1.02]" />
          </div>

          {/* Profile Button and Dropdown */}
          {session?.user && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                aria-label="View profile"
                onClick={handleProfileClick}
                disabled={isNavigatingToProfile || isLoadingAvatar}
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-full border-2 border-foreground/80 p-0.5",
                  "transition-all duration-150 hover:scale-[1.10] active:scale-95 cursor-pointer",
                  (isNavigatingToProfile || isLoadingAvatar) && "opacity-75 cursor-wait"
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
                onOpenChange={setIsProfileMenuOpen}
              >
                <Dropdown.Trigger
                  aria-label={profileLabel}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  className="rounded-full p-1 transition hover:bg-foreground/5"
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
                    <Dropdown.Item 
                      label="Copy profile link" 
                      onClick={handleCopyProfileLink}
                    />
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
        </nav>
      </header>

      {/* Delete Account Dialog */}
      {session?.user && (
        <DeleteAccountDialog
          open={isDeleteAccountOpen}
          onOpenChange={setIsDeleteAccountOpen}
        />
      )}
    </>
  );
}

