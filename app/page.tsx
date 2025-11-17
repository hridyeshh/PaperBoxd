"use client";

import { useSession } from "next-auth/react";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { Header } from "@/components/ui/layout/header-with-search";
import { PublicHome } from "@/components/ui/home/public-home";
import { AuthenticatedHome } from "@/components/ui/home/authenticated-home";
import TetrisLoading from "@/components/ui/tetris-loader";

export default function Home() {
  const { data: session, status } = useSession();

  // Show loading state while checking session
  if (status === "loading") {
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
        <Header />
        <div className="flex flex-1 items-center justify-center px-4 pb-16 pt-20 md:pb-24 md:pt-24 mt-16">
          <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
        </div>
      </div>
      </main>
    );
  }

  // Show personalized carousels for authenticated users, public carousels for others
  // Hero centered, then carousels below
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
        <Header />
        <div className="flex-1 mt-16">
          {session?.user ? <AuthenticatedHome /> : <PublicHome />}
        </div>
      </div>
    </main>
  );
}
