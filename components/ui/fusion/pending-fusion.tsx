"use client";

// Holds a Fusion invite across sign-in. Every sign-in path (password, OTP,
// register, Google) ends on "/" or onboarding, so instead of threading a
// return URL through each, the join page remembers the token and "/" sends
// the reader back once they are signed in.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

const KEY = "pb_pending_fusion";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function rememberPendingFusion(token: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    // Private mode: the reader re-opens the link after signing in.
  }
}

export function clearPendingFusion() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function PendingFusionRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading || !isAuthenticated || pathname !== "/") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      localStorage.removeItem(KEY);
      const { token, at } = JSON.parse(raw) as { token?: string; at?: number };
      if (token && at && Date.now() - at < MAX_AGE_MS) {
        router.replace(`/fusion/${encodeURIComponent(token)}`);
      }
    } catch {}
  }, [isAuthenticated, isLoading, pathname, router]);

  return null;
}
