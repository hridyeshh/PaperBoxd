"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingQuestionnaire } from "@/components/ui/features/onboarding-questionnaire";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { useIsMobile } from "@/hooks/use-media-query";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

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
      // Check onboarding status via API (this will also verify username from database)
      const checkOnboarding = async () => {
        try {
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            
            // If user doesn't have username yet, redirect to choose username
            if (!data.hasUsername) {
              router.replace("/choose-username");
              return;
            }
            
            // If onboarding is already completed, redirect to profile
            if (data.completed) {
              setHasCompletedOnboarding(true);
              const username = data.username || session?.user?.username;
              if (username) {
                router.replace(`/u/${username}`);
              } else {
                router.replace("/profile");
              }
              return;
            }
            
            // User has username but hasn't completed onboarding
            // Only show questionnaire for new users, not existing users logging in
            if (!data.isNewUser) {
              // Existing user - skip onboarding and redirect to profile
              const username = data.username || session?.user?.username;
              if (username) {
                router.replace(`/u/${username}`);
              } else {
                router.replace("/profile");
              }
              return;
            }
            
            // New user - show questionnaire
            setCheckingOnboarding(false);
          } else {
            // If API fails, still show questionnaire (better UX than blocking)
            setCheckingOnboarding(false);
          }
        } catch (error) {
          console.error("Failed to check onboarding status:", error);
          // On error, still show questionnaire (better UX)
          setCheckingOnboarding(false);
        }
      };

      // Always check onboarding status via API
      checkOnboarding();
    }
  }, [status, router]);

  if (status === "loading" || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return null; // Will redirect
  }

  if (hasCompletedOnboarding) {
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
        <OnboardingQuestionnaire
          onComplete={() => {
            // Redirect based on device type: mobile -> /feed, desktop -> /
            const redirectUrl = isMobile ? "/feed" : "/";
            router.push(redirectUrl);
          }}
        />
      </div>
    </main>
  );
}

