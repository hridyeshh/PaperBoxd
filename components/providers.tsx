"use client";

import { SessionProvider, useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { ReactNode, useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";

/**
 * OAuthBridge: detects when NextAuth has a valid session (Google/OTP OAuth)
 * but the pb_user cookie is absent, then calls /api/backend-auth to mint
 * Go-backend JWT cookies so AuthProvider picks them up.
 *
 * If google-sync fails, we intentionally do NOT set a client-side fallback
 * cookie — doing so would fabricate a fake user (username derived from the
 * email prefix) instead of surfacing the real Go backend account. The user
 * should re-authenticate via email/password so loginAction's migration path
 * can self-heal the Go backend record.
 */
function OAuthBridge() {
  const { data: session, status } = useSession();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const syncedRef = useRef(false);

  useEffect(() => {
    // Wait until both providers have settled
    if (status === "loading" || isLoading) return;
    // Already authenticated via pb_user cookie — nothing to do
    if (isAuthenticated) return;
    // No NextAuth session either — nothing to sync
    if (status !== "authenticated" || !session?.user?.email) return;
    // Only sync once per mount
    if (syncedRef.current) return;
    syncedRef.current = true;

    fetch("/api/backend-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "google-sync" }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          refreshUser();
        } else if (result.logout) {
          // Go backend has no Google OAuth endpoint. Tell the user and send them
          // back to /auth to sign in via email/OTP instead.
          toast.error("Google sign-in failed. Please try again or sign in with email.");
          nextAuthSignOut({ redirect: false }).then(() => {
            router.push("/auth");
          });
        }
      })
      .catch(() => {
        nextAuthSignOut({ redirect: false }).then(() => {
          router.push("/auth");
        });
      });
  }, [status, isAuthenticated, isLoading, session, refreshUser, router]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <OAuthBridge />
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "group font-sans text-[13px] rounded-xl border border-border bg-background text-foreground shadow-lg px-4 py-3 gap-3 items-start",
              title: "font-medium text-foreground text-[13px] leading-snug",
              description: "text-muted-foreground text-[12px] mt-0.5",
              icon: "text-foreground mt-0.5",
              success:
                "border-border bg-background text-foreground",
              error:
                "border-destructive/30 bg-background text-foreground",
              warning:
                "border-yellow-500/30 bg-background text-foreground",
              closeButton:
                "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60",
              actionButton:
                "bg-foreground text-background text-[12px] font-medium rounded-lg px-3 py-1.5 hover:opacity-85",
              cancelButton:
                "bg-muted text-muted-foreground text-[12px] font-medium rounded-lg px-3 py-1.5 hover:bg-muted/60",
            },
          }}
        />
      </AuthProvider>
    </SessionProvider>
  );
}
