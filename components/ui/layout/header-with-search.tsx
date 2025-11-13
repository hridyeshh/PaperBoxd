"use client";

import Image from "next/image";
import React from "react";
import { ChevronDown, Grid2x2PlusIcon, MenuIcon, SearchIcon, LinkIcon, QrCodeIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { CommandItem, SearchModal } from "@/components/ui/search-modal";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Dropdown } from "@/components/ui/dropdown";

const links = [
  { label: "Books", href: "#Books" },
  { label: "Authors", href: "#Authors" },
  { label: "Community", href: "#community" },
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
  {
    id: "search-5",
    title: "Find trending authors",
    description: "See what PaperBoxd readers are loving right now.",
    category: "Discover",
  },
];

interface HeaderProps {
  profileButtonLabel?: string;
  onProfileButtonClick?: () => void;
  profileAvatarSrc?: string;
  profileMenuOpen?: boolean;
}

export function Header({
  profileButtonLabel,
  onProfileButtonClick,
  profileAvatarSrc,
  profileMenuOpen,
}: HeaderProps) {
  const [open, setOpen] = React.useState(false);
  const [internalProfileMenuOpen, setInternalProfileMenuOpen] = React.useState(false);
  const avatarSrc =
    profileAvatarSrc ??
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";
  const profileLabel = profileButtonLabel ?? "Open profile menu";
  const isProfileMenuOpen = profileMenuOpen ?? internalProfileMenuOpen;

  const handleProfileMenuOpenChange = (nextOpen: boolean) => {
    if (profileMenuOpen === undefined) {
      setInternalProfileMenuOpen(nextOpen);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/60 backdrop-blur-md",
        "bg-background/85 supports-[backdrop-filter]:bg-background/75",
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-foreground/5">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Grid2x2PlusIcon className="size-3.5" />
          </span>
          <p className="font-mono text-lg font-semibold tracking-tight text-foreground">
            PaperBoxd
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <a
                key={link.label}
                className={buttonVariants({
                  variant: "ghost",
                  className: "font-medium text-foreground/80 hover:text-foreground",
                })}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>
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
          <ThemeToggle className="transition-transform hover:scale-[1.02]" />
          <div className="flex items-center gap-2 pl-8">
            <button
              type="button"
              aria-label="View profile"
              className={cn(
                "relative flex size-10 items-center justify-center rounded-full border-2 border-foreground/80 p-0.5",
                "transition-all duration-150 hover:scale-[1.10] active:scale-95",
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
              <Dropdown.Popover>
                <Dropdown.Menu>
                  <Dropdown.Item label="Share profile link" icon={LinkIcon} />
                  <Dropdown.Item label="Show QR code" icon={QrCodeIcon} />
                  <Dropdown.Separator />
                  <Dropdown.Item label="Log out" />
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>
          </div>
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
              <div className="flex items-center gap-2 px-4 pt-8 pb-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Grid2x2PlusIcon className="size-4" />
                </span>
                <p className="font-mono text-lg font-semibold tracking-tight text-foreground">
                  PaperBoxd
                </p>
              </div>
              <div className="grid gap-y-2 overflow-y-auto px-4 pb-6">
                {links.map((link) => (
                  <a
                    key={link.label}
                    className={buttonVariants({
                      variant: "ghost",
                      className: "justify-start text-base",
                    })}
                    href={link.href}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <SheetFooter className="flex flex-col gap-2 px-4 pb-6">
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
                <Button className="w-full">Create account</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

