"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/ui/layout/header-with-search";
import { HomeLayoutHeader } from "@/components/ui/layout/home-layout-header";
import { HomeSidebar } from "@/components/ui/layout/home-sidebar";
import { LandingPage } from "@/components/ui/landing/landing-page";
import { AuthenticatedHome } from "@/components/ui/home/authenticated-home";
import { AuthenticatedHomeMobile } from "@/components/ui/home/authenticated-home-mobile";
import BookLoader from "@/components/ui/features/book-loader";
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

  // OAuth in flight (NextAuth session exists but pb_access_token not yet minted):
  // show a spinner rather than the landing page to avoid a jarring flash.
  if (oauthSyncPending || (isLoading && sessionStatus === "authenticated")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BookLoader size="md" speed="fast" loadingText="Signing you in..." />
      </div>
    );
  }

  // Onboarding check in flight for authenticated users: keep spinner.
  if (checkingOnboarding && isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BookLoader size="md" speed="fast" />
      </div>
    );
  }

  // Initial auth load (unauthenticated): show landing page.
  if (isLoading) {
    return <LandingPage />;
  }

  // Unauthenticated: full landing page
  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <>
          <Header minimalMobile />
          <div className="mt-16">
            <AuthenticatedHomeMobile />
          </div>
        </>
      ) : (
        <>
          <HomeLayoutHeader />
          <HomeSidebar />
          <main
            className={cn("pt-16 pl-[220px]")}
            style={{ minHeight: "100vh" }}
          >
            <AuthenticatedHome />
          </main>
        </>
      )}
    </div>
  );
}
