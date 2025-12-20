"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { Capacitor } from "@capacitor/core";
import { API_BASE_URL } from "@/lib/api/client";
import {
  getAuthToken,
  storeAuthToken,
  removeAuthToken,
  type StoredUser,
} from "@/lib/capacitor/auth-storage";

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
}

interface AuthState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

/**
 * Unified authentication hook that works for both web and Capacitor
 * - Web: Uses NextAuth with cookies
 * - Capacitor: Uses token-based auth with Capacitor Preferences
 */
export function useAuth() {
  const isNative = Capacitor.isNativePlatform();

  // Web: Use NextAuth
  const webSession = useSession();

  // Capacitor: Use custom token-based auth
  const [nativeAuth, setNativeAuth] = useState<AuthState>({
    user: null,
    status: "loading",
  });

  // Load stored auth on mount (Capacitor only)
  useEffect(() => {
    if (!isNative) return;

    const loadStoredAuth = async () => {
      try {
        const token = await getAuthToken();

        if (token) {
          // Verify token is still valid
          const response = await fetch(`${API_BASE_URL}/api/auth/token/verify`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setNativeAuth({ user: data.user, status: "authenticated" });
          } else {
            // Token invalid, clear auth
            await removeAuthToken();
            setNativeAuth({ user: null, status: "unauthenticated" });
          }
        } else {
          setNativeAuth({ user: null, status: "unauthenticated" });
        }
      } catch (error) {
        console.error("[Auth] Error loading stored auth:", error);
        setNativeAuth({ user: null, status: "unauthenticated" });
      }
    };

    loadStoredAuth();
  }, [isNative]);

  // Sign in function
  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!isNative) {
        // Web: Use NextAuth
        return nextAuthSignIn("credentials", {
          email,
          password,
          redirect: false,
        });
      }

      // Capacitor: Use token-based auth
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/token/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Login failed");
        }

        const data = await response.json();

        // Store token
        await storeAuthToken(data.token);

        setNativeAuth({
          user: data.user,
          status: "authenticated",
        });

        return { ok: true, error: null };
      } catch (error) {
        console.error("[Auth] Native sign in error:", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Login failed",
        };
      }
    },
    [isNative]
  );

  // Sign out function
  const signOut = useCallback(async () => {
    if (!isNative) {
      // Web: Use NextAuth
      return nextAuthSignOut({ callbackUrl: "/auth" });
    }

    // Capacitor: Clear stored auth
    await removeAuthToken();
    setNativeAuth({
      user: null,
      status: "unauthenticated",
    });
  }, [isNative]);

  // Return appropriate auth state
  if (isNative) {
    return {
      data: nativeAuth.user ? { user: nativeAuth.user } : null,
      status: nativeAuth.status,
      signIn,
      signOut,
    };
  }

  // Web: Return NextAuth session with custom sign in/out
  return {
    data: webSession.data,
    status: webSession.status,
    signIn,
    signOut,
  };
}
