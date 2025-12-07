"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import DockMorph from "@/components/ui/dock-morph";
import { Home, NotebookPen, Search } from "lucide-react";
import { GeneralDiaryEditorDialog } from "@/components/ui/dialogs/general-diary-editor-dialog";
import { useIsMobile } from "@/hooks/use-media-query";
import { DEFAULT_AVATAR } from "@/lib/utils";

export function MobileDock() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const [writeDialogOpen, setWriteDialogOpen] = React.useState(false);
  const [profileAvatar, setProfileAvatar] = React.useState<string | null>(null);

  // Check if edit profile form is open (via data attribute)
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  
  React.useEffect(() => {
    const checkEditOpen = () => {
      if (typeof document !== 'undefined') {
        setIsEditOpen(document.body.hasAttribute('data-edit-open'));
      }
    };
    
    checkEditOpen();
    
    // Watch for changes
    const observer = new MutationObserver(checkEditOpen);
    if (typeof document !== 'undefined') {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-edit-open']
      });
    }
    
    return () => observer.disconnect();
  }, []);

  // Don't show dock on auth pages, if not authenticated, or if edit form is open
  const shouldShowDock = isMobile && session?.user && !pathname?.startsWith("/auth") && !pathname?.startsWith("/choose-username") && !pathname?.startsWith("/onboarding") && !isEditOpen;

  // Function to fetch profile avatar
  const fetchProfileAvatar = React.useCallback(() => {
    if (session?.user?.username) {
      fetch(`/api/users/${encodeURIComponent(session.user.username)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.user?.avatar) {
            setProfileAvatar(data.user.avatar);
          } else if (session?.user?.image) {
            setProfileAvatar(session.user.image);
          } else {
            setProfileAvatar(null);
          }
        })
        .catch(() => {
          setProfileAvatar(session?.user?.image || null);
        });
    }
  }, [session?.user?.username, session?.user?.image]);

  // Fetch profile avatar on mount and when username changes
  React.useEffect(() => {
    fetchProfileAvatar();
  }, [fetchProfileAvatar]);

  // Listen for profile avatar updates
  React.useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { avatar, username } = event.detail;
      // Only update if it's for the current user
      if (username === session?.user?.username && avatar) {
        setProfileAvatar(avatar);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("profileAvatarUpdated", handleAvatarUpdate as EventListener);
      return () => {
        window.removeEventListener("profileAvatarUpdated", handleAvatarUpdate as EventListener);
      };
    }
  }, [session?.user?.username]);

  if (!shouldShowDock) {
    return null;
  }

  return (
    <>
      <DockMorph
        position="bottom"
        items={[
          {
            icon: Home,
            label: "Home",
            onClick: () => {
              // Only navigate if not already on home page
              if (pathname !== "/") {
                router.push("/");
              } else {
                // If already on home, scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            },
          },
          {
            icon: Search,
            label: "Search",
            onClick: () => router.push("/search"),
          },
          {
            icon: NotebookPen,
            label: "Write",
            onClick: () => setWriteDialogOpen(true),
          },
          {
            label: "Profile",
            avatar: profileAvatar || session?.user?.image || DEFAULT_AVATAR,
            onClick: () => {
              if (session?.user?.username) {
                router.push(`/u/${session.user.username}`);
              }
            },
          },
        ]}
      />

      {/* Write Dialog */}
      {session?.user?.username && (
        <GeneralDiaryEditorDialog
          open={writeDialogOpen}
          onOpenChange={setWriteDialogOpen}
          username={session.user.username}
        />
      )}
    </>
  );
}

