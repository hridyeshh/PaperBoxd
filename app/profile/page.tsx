"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookLoader from "@/components/ui/features/book-loader";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth to initialize
    }

    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/onboarding/status");
        if (response.ok) {
          const data = await response.json();

          if (!data.hasUsername) {
            router.replace("/choose-username");
            return;
          }

          if (!data.completed && data.isNewUser) {
            router.replace("/onboarding");
            return;
          }

          const username = data.username || user?.username;
          if (username) {
            router.replace(`/u/${username}`);
          }
        } else {
          if (user?.username) {
            router.replace(`/u/${user.username}`);
          } else {
            router.replace("/choose-username");
          }
        }
      } catch {
        if (user?.username) {
          router.replace(`/u/${user.username}`);
        } else {
          router.replace("/choose-username");
        }
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BookLoader size="md" speed="fast" loadingText="Redirecting..." />
        </div>
      </div>
    );
  }

  return null;
}
