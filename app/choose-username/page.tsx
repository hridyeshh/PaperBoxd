"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UsernameSelection } from "@/components/ui/username-selection";
import TetrisLoading from "@/components/ui/tetris-loader";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";

export default function ChooseUsernamePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      return; // Wait for session to load
    }

    if (status === "unauthenticated") {
      // Not authenticated, redirect to auth page
      router.replace("/auth");
      return;
    }

    if (status === "authenticated" && session?.user?.username) {
      // Already has username, redirect to profile
      router.replace(`/u/${session.user.username}`);
      return;
    }
  }, [status, session?.user?.username, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return null; // Will redirect
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <UsernameSelection
          name={session.user.name || "User"}
          email={session.user.email || undefined}
          onComplete={() => {
            // Use window.location for full page reload to ensure fresh session
            window.location.href = "/onboarding";
          }}
        />
      </div>
    </main>
  );
}

