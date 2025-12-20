"use client";
import { API_BASE_URL } from '@/lib/api/client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { Header } from "@/components/ui/layout/header-with-search";
import { DesktopSidebar } from "@/components/ui/layout/desktop-sidebar";
import { MinimalDesktopHeader } from "@/components/ui/layout/minimal-desktop-header";
import { PublicHome } from "@/components/ui/home/public-home";
import { PublicHomeMobile } from "@/components/ui/home/public-home-mobile";
import { AuthenticatedHome } from "@/components/ui/home/authenticated-home";
import { AuthenticatedHomeMobile } from "@/components/ui/home/authenticated-home-mobile";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true); // Start as true to prevent flash

  // Check onboarding status immediately for authenticated users
  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "authenticated" && session?.user) {
      const checkOnboarding = async () => {
        try {
          setCheckingOnboarding(true);
          const response = await fetch(API_BASE_URL + "/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            
            // Only check onboarding for new users
            // Existing users should go directly to home (no redirect)
            if (data.isNewUser) {
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
            }
            // Existing users (not new) - no redirect, show home
            setCheckingOnboarding(false);
          } else {
            setCheckingOnboarding(false);
          }
        } catch (error) {
          console.error("Failed to check onboarding status:", error);
          setCheckingOnboarding(false);
        }
      };

      checkOnboarding();
    } else if (status === "unauthenticated") {
      // Not authenticated, show public home immediately
      setCheckingOnboarding(false);
    }
  }, [status, session?.user, router]);

  // Show loading state while checking session or onboarding
  if (status === "loading" || checkingOnboarding) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background">
        <AnimatedGridPattern
          numSquares={120}
          maxOpacity={0.08}
          duration={4}
          repeatDelay={0.75}
          className="text-slate-500 dark:text-slate-400"
        />
      <div className="relative z-10 flex min-h-screen flex-col">
        {isMobile ? (
          <Header minimalMobile={isMobile} />
        ) : session?.user ? (
          <>
            <DesktopSidebar />
            <MinimalDesktopHeader />
          </>
        ) : (
          <Header minimalMobile={isMobile} />
        )}
        <div className={cn(
          "flex flex-1 items-center justify-center px-4 pb-16 pt-20 md:pb-24 md:pt-24",
          isMobile ? "mt-16" : session?.user ? "mt-16 ml-16" : "mt-16"
        )}>
          <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
        </div>
      </div>
      </main>
    );
  }

  // Show personalized carousels for authenticated users, public carousels for others
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Show sidebar + minimal header on desktop for authenticated users, header otherwise */}
        {isMobile ? (
          <Header minimalMobile={isMobile} />
        ) : session?.user ? (
          <>
            <DesktopSidebar />
            <MinimalDesktopHeader />
          </>
        ) : (
          <Header minimalMobile={isMobile} />
        )}
        <div className={cn(
          "flex-1",
          isMobile ? "mt-16" : session?.user ? "mt-16 ml-16" : "mt-16",
          !session?.user && "flex flex-col"
        )}>
          {session?.user ? (
            isMobile ? (
              <AuthenticatedHomeMobile />
            ) : (
              <AuthenticatedHome />
            )
          ) : isMobile ? (
            <PublicHomeMobile />
          ) : (
            <PublicHome />
          )}
        </div>
      </div>
    </main>
  );
}
