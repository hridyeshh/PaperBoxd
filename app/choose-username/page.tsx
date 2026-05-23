"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChooseUsernamePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    // Username is now step 1 of the main onboarding flow
    router.replace("/onboarding");
  }, [isLoading, isAuthenticated, router]);

  return (
    <div
      className="fixed inset-0"
      style={{ background: "#0a0a0a" }}
    />
  );
}
