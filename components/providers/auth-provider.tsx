"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface JwtUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: JwtUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Call after login to sync state without a page reload */
  refreshUser: () => void;
  /** Set user directly (e.g. from a login response) so we don't depend on cookie-read timing */
  setAuthUser: (user: JwtUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  refreshUser: () => {},
  setAuthUser: () => {},
});

function readJwtUser(): JwtUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("pb_user="));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.slice("pb_user=".length))) as JwtUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stable sync identity so consumers using refreshUser in effect deps don't
  // re-fire on every render. setUser bails on referentially-equal updates via
  // a structural compare; pb_user cookie is parsed fresh each call so two
  // sync()s for the same logged-in user no longer churn child effects.
  const sync = useCallback(() => {
    const next = readJwtUser();
    setUser((prev) => {
      if (prev === next) return prev;
      if (prev && next && prev.id === next.id && prev.username === next.username && prev.email === next.email && prev.name === next.name && prev.avatar_url === next.avatar_url) {
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    sync();
    setIsLoading(false);
    // Re-sync when the tab regains focus (handles cross-tab login/logout)
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [sync]);

  // Fire once per authenticated user per tab session to update last_activity_date.
  // Keyed on user.id so a fresh login for a different account re-fires correctly.
  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/daily-open", { method: "POST" }).catch(() => {});
  }, [user?.id]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      refreshUser: sync,
      setAuthUser: setUser,
    }),
    [user, isLoading, sync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
