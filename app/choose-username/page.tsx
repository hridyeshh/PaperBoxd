"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UnifiedOnboarding } from "@/components/ui/features/unified-onboarding";
import TetrisLoading from "@/components/ui/features/tetris-loader";

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

    // Only redirect if user already has username AND onboarding is complete
    // This prevents redirecting when the user just set their username in the UnifiedOnboarding flow
    if (status === "authenticated" && session?.user?.username) {
      console.log("[ChooseUsernamePage] User has username, checking onboarding status");
      const checkOnboarding = async () => {
        try {
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            console.log("[ChooseUsernamePage] Onboarding status:", data);
            if (data.completed) {
              // Onboarding complete, go to profile
              console.log("[ChooseUsernamePage] Onboarding complete, redirecting to profile");
      router.replace(`/u/${session.user.username}`);
            } else {
              // Not completed - user is in onboarding flow, let UnifiedOnboarding handle it
              console.log("[ChooseUsernamePage] Onboarding not complete, staying on page for UnifiedOnboarding to handle flow");
            }
          } else {
            // If we can't check status, don't redirect - let UnifiedOnboarding handle it
            console.log("[ChooseUsernamePage] Could not check onboarding status, staying on page");
          }
        } catch (error) {
          console.error("[ChooseUsernamePage] Error checking onboarding status:", error);
          // Don't redirect on error - let UnifiedOnboarding handle it
        }
      };
      checkOnboarding();
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
    <UnifiedOnboarding
          onComplete={() => {
        router.push("/");
          }}
        />
  );
}

