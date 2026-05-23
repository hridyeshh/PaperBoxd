"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // While NextAuth is still resolving, or while it's authenticated but our
  // pb_user cookie hasn't been minted yet (OAuthBridge in flight), keep
  // showing the spinner instead of the public home.
  const oauthSyncPending =
    sessionStatus === "loading" || (sessionStatus === "authenticated" && !user);

  useEffect(() => {
    if (isLoading || oauthSyncPending) {
      return;
    }

    if (isAuthenticated && user) {
      const checkOnboarding = async () => {
        try {
          setCheckingOnboarding(true);
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            if (data.isNewUser) {
              if (!data.hasUsername) {
                router.replace("/choose-username");
                return;
              }
              if (!data.completed) {
                router.replace("/onboarding");
                return;
              }
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
    } else if (!isAuthenticated) {
      setCheckingOnboarding(false);
    }
  }, [isLoading, isAuthenticated, user, router, oauthSyncPending]);

  if (isLoading || checkingOnboarding || oauthSyncPending) {
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
          ) : user ? (
            <>
              <DesktopSidebar />
              <MinimalDesktopHeader />
            </>
          ) : (
            <Header minimalMobile={isMobile} />
          )}
          <div className={cn(
            "flex flex-1 items-center justify-center px-4 pb-16 pt-20 md:pb-24 md:pt-24",
            isMobile ? "mt-16" : user ? "mt-16" : "mt-16"
          )}>
            <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
          </div>
        </div>
      </main>
    );
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
      <div className="relative z-10 flex min-h-screen flex-col">
        {isMobile ? (
          <Header minimalMobile={isMobile} />
        ) : user ? (
          <>
            <DesktopSidebar />
            <MinimalDesktopHeader />
          </>
        ) : (
          <Header minimalMobile={isMobile} />
        )}
        <div className={cn(
          "flex-1",
          isMobile ? "mt-16" : user ? "mt-16" : "mt-16",
          !user && "flex flex-col"
        )}>
          {user ? (
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
