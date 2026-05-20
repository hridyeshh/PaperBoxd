"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingQuestionnaire } from "@/components/ui/features/onboarding-questionnaire";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    const checkOnboarding = async () => {
      try {
        const response = await fetch("/api/onboarding/status");
        if (response.ok) {
          const data = await response.json();

          if (!data.hasUsername) {
            router.replace("/choose-username");
            return;
          }

          if (data.completed) {
            setHasCompletedOnboarding(true);
            const username = data.username || user?.username;
            if (username) {
              router.replace(`/u/${username}`);
            } else {
              router.replace("/profile");
            }
            return;
          }

          if (!data.isNewUser) {
            const username = data.username || user?.username;
            if (username) {
              router.replace(`/u/${username}`);
            } else {
              router.replace("/profile");
            }
            return;
          }

          setCheckingOnboarding(false);
        } else {
          setCheckingOnboarding(false);
        }
      } catch {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (hasCompletedOnboarding) {
    return null;
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
            router.push("/");
          }}
        />
      </div>
    </main>
  );
}
