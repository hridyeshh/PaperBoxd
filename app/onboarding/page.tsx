"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingFlow } from "@/components/ui/onboarding/onboarding-flow";

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    const check = async () => {
      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          if (data.completed && !data.isNewUser) {
            router.replace(`/u/${data.username || user?.username}`);
            return;
          }
        }
      } catch {
        // Continue to show onboarding
      }
      setChecking(false);
    };

    check();
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || checking) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "#0a0a0a" }}
      />
    );
  }

  if (!isAuthenticated) return null;

  return (
    <OnboardingFlow
      onComplete={() => router.replace("/")}
    />
  );
}
