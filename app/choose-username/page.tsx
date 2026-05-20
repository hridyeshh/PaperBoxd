"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UnifiedOnboarding } from "@/components/ui/features/unified-onboarding";
import TetrisLoading from "@/components/ui/features/tetris-loader";

export default function ChooseUsernamePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    if (isAuthenticated && user?.username) {
      console.log("[ChooseUsernamePage] User has username, checking onboarding status");
      const checkOnboarding = async () => {
        try {
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            console.log("[ChooseUsernamePage] Onboarding status:", data);
            if (data.completed) {
              console.log("[ChooseUsernamePage] Onboarding complete, redirecting to profile");
              router.replace(`/u/${user.username}`);
            } else {
              console.log("[ChooseUsernamePage] Onboarding not complete, staying on page for UnifiedOnboarding to handle flow");
            }
          }
        } catch (error) {
          console.error("[ChooseUsernamePage] Error checking onboarding status:", error);
        }
      };
      checkOnboarding();
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <UnifiedOnboarding
      onComplete={() => {
        router.push("/");
      }}
    />
  );
}
