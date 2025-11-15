"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TetrisLoading from "@/components/ui/tetris-loader";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      return; // Wait for session to load
    }

    if (status === "authenticated" && session?.user?.username) {
      // Redirect to /u/[username] format
      router.replace(`/u/${session.user.username}`);
    } else {
      // Not authenticated, redirect to auth page
      router.replace("/auth");
}
  }, [status, session?.user?.username, router]);

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <TetrisLoading size="md" speed="fast" loadingText="Redirecting..." />
      </div>
    </div>
  );
}
