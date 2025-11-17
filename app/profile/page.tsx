"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TetrisLoading from "@/components/ui/tetris-loader";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      return; // Wait for session to load
    }

    if (status === "unauthenticated") {
      // Not authenticated, redirect to auth page
      router.replace("/auth");
      return;
    }

    if (status === "authenticated") {
      const checkStatus = async () => {
        try {
          // Check if user has username and onboarding status
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            
            // If no username, redirect to choose username
            if (!data.hasUsername) {
              router.replace("/choose-username");
              return;
            }
            
            // If onboarding not completed, redirect to onboarding
            if (!data.completed) {
              router.replace("/onboarding");
              return;
            }
            
            // Has username and completed onboarding - redirect to profile
            const username = data.username || session?.user?.username;
            if (username) {
              router.replace(`/u/${username}`);
            }
          } else {
            // If API fails, try to redirect based on session
            if (session?.user?.username) {
              router.replace(`/u/${session.user.username}`);
            } else {
              router.replace("/choose-username");
            }
          }
        } catch (error) {
          console.error("Failed to check status:", error);
          // Fallback to session-based redirect
          if (session?.user?.username) {
            router.replace(`/u/${session.user.username}`);
          } else {
            router.replace("/choose-username");
          }
        } finally {
          setChecking(false);
        }
      };

      checkStatus();
    }
  }, [status, session, router]);

  // Show loading while checking/redirecting
  if (checking || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <TetrisLoading size="md" speed="fast" loadingText="Redirecting..." />
        </div>
      </div>
    );
  }

  return null; // Will redirect
}
