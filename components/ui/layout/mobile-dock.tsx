"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import DockMorph from "@/components/ui/dock-morph";
import { Home, PenTool, Search } from "lucide-react";
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

  // Don't show dock on auth pages or if not authenticated
  const shouldShowDock = isMobile && session?.user && !pathname?.startsWith("/auth") && !pathname?.startsWith("/choose-username") && !pathname?.startsWith("/onboarding");

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
            onClick: () => router.push("/feed"),
          },
          {
            icon: Search,
            label: "Search",
            onClick: () => router.push("/search"),
          },
          {
            icon: PenTool,
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

