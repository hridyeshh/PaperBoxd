"use client";

import React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { SearchModal, CommandItem } from "@/components/ui/features/search-modal";
import { ActivityPopover } from "@/components/ui/layout/activity-popover";
import { GeneralDiaryEditorDialog } from "@/components/ui/dialogs/general-diary-editor-dialog";
import { ThemeToggle } from "@/components/ui/features/theme-toggle";
import { Dropdown } from "@/components/ui/primitives/dropdown";
import { DeleteAccountDialog } from "@/components/ui/dialogs/delete-account-dialog";
import BookLoader from "@/components/ui/features/book-loader";
import { cn, DEFAULT_AVATAR } from "@/lib/utils";
import { SearchIcon, ChevronDown } from "lucide-react";
import { Pinyon_Script } from "next/font/google";
import { logoutAction } from "@/lib/auth/actions";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

const pinyonScript = Pinyon_Script({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const NAV_ITEMS = [
  { label: "Home",            href: "/" },
  { label: "Diary",           href: "/diary" },
  { label: "Find a new book", href: "/recommendations" },
  { label: "Feed",            href: "/feed" },
  { label: "Leaderboard",     href: "/leaderboard" },
];

const SEARCH_ITEMS: CommandItem[] = [
  { id: "s1", title: "Track finished books",   description: "Log what you have read.", category: "Library" },
  { id: "s2", title: "Plan your next read",    description: "Queue titles and goals.",  category: "Planning" },
  { id: "s3", title: "Share curated shelves",  description: "Collections with friends.", category: "Community" },
  { id: "s4", title: "Sync highlights",        description: "Passages in one place.",   category: "Notes" },
];

export function HomeLayoutHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const [hasNew, setHasNew] = React.useState(false);
  const [diaryOpen, setDiaryOpen] = React.useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = React.useState(false);
  const [isNavigatingToProfile, setIsNavigatingToProfile] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const avatar =
    user?.avatar_url && user.avatar_url.trim() !== "" ? user.avatar_url : DEFAULT_AVATAR;

  React.useEffect(() => {
    setIsNavigatingToProfile(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isAuthenticated || !user?.username) return;
    const username = user.username;
    if (pathname === "/activity") {
      localStorage.setItem(`activity_last_viewed_${username}`, new Date().toISOString());
      setHasNew(false);
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
          setHasNew(data.hasNewActivities || false);
        }
      } catch { /* silent */ }
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [isAuthenticated, user?.username, pathname]);

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
    } catch { /* ignore */ }
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

      <header
        className={cn(
          "hidden md:flex fixed top-0 left-0 right-0 z-[100] h-16",
          "items-center justify-between px-7",
          "border-b border-border bg-background/90 backdrop-blur-[12px]",
        )}
        style={{ WebkitBackdropFilter: "saturate(180%) blur(12px)" }}
      >
        {/* ── Left: wordmark + nav ── */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() =>
              pathname === "/" ? window.scrollTo({ top: 0, behavior: "smooth" }) : router.push("/")
            }
            className="hover:opacity-75 transition-opacity"
          >
            <span className={cn(pinyonScript.className, "text-[1.875rem] leading-none text-foreground select-none")}>
              PaperBoxd
            </span>
          </button>

          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ label, href }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              const isDiary = label === "Diary";
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => isDiary ? setDiaryOpen(true) : router.push(href)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-colors whitespace-nowrap",
                    isActive && !isDiary
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {isAuthenticated && user?.username && (
          <GeneralDiaryEditorDialog
            open={diaryOpen}
            onOpenChange={setDiaryOpen}
            username={user.username}
          />
        )}

        {/* ── Right: search + theme + bell + avatar ── */}
        <div className="flex items-center gap-2">
          <SearchModal data={SEARCH_ITEMS}>
            <button
              type="button"
              className={cn(
                "flex h-9 w-[240px] items-center gap-2 rounded-lg border border-border bg-muted/40 px-3",
                "text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:border-border/80",
              )}
            >
              <SearchIcon className="size-3.5 shrink-0" />
              <span className="flex-1 text-left">Search 4.8M titles…</span>
              <kbd className="hidden sm:flex items-center font-mono text-[10px] bg-background border border-border rounded px-1.5 py-px leading-none">
                ⌘K
              </kbd>
            </button>
          </SearchModal>

          <ThemeToggle className="h-8 w-14 flex-shrink-0" />

          {isAuthenticated && (
            <ActivityPopover
              username={user?.username || ""}
              hasNewActivities={hasNew}
              onOpen={() => setHasNew(false)}
              variant="bell"
            />
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-0.5 ml-0.5">
              <button
                type="button"
                aria-label="View profile"
                onClick={handleProfileClick}
                disabled={isNavigatingToProfile}
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full border-2 border-foreground/70 p-0.5",
                  "transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer",
                  isNavigatingToProfile && "opacity-75 cursor-wait"
                )}
              >
                <Image
                  src={avatar}
                  alt="Profile"
                  width={32}
                  height={32}
                  draggable={false}
                  className="size-full rounded-full object-cover pointer-events-none"
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
                      onClick={() => { handleLogout(); setIsProfileMenuOpen(false); }}
                    />
                    <Dropdown.Item
                      label="Delete account"
                      onClick={() => { setIsDeleteAccountOpen(true); setIsProfileMenuOpen(false); }}
                      className="text-destructive focus:text-destructive"
                    />
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.Root>
            </div>
          )}
        </div>
      </header>

      {isAuthenticated && (
        <DeleteAccountDialog
          open={isDeleteAccountOpen}
          onOpenChange={setIsDeleteAccountOpen}
        />
      )}
    </>
  );
}
