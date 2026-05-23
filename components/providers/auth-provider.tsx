"use client";

import { createContext, useContext, useState, useEffect } from "react";

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

  const sync = () => setUser(readJwtUser());

  useEffect(() => {
    sync();
    setIsLoading(false);
    // Re-sync when the tab regains focus (handles cross-tab login/logout)
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        refreshUser: sync,
        setAuthUser: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
