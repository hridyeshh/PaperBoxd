// JWT session management for Go backend tokens
// Runs server-side only (uses next/headers)

import { cookies } from "next/headers";

const ACCESS_TOKEN_KEY = "pb_access_token";
const REFRESH_TOKEN_KEY = "pb_refresh_token";
const USER_KEY = "pb_user";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface Session {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
}

export async function setSession(
  accessToken: string,
  refreshToken: string,
  user: SessionUser
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_TOKEN_KEY, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  cookieStore.set(REFRESH_TOKEN_KEY, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // Non-httpOnly so client JS can read user info (not sensitive)
  cookieStore.set(USER_KEY, JSON.stringify(user), {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(ACCESS_TOKEN_KEY)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_KEY)?.value ?? null;
  const userRaw = cookieStore.get(USER_KEY)?.value;

  let user: SessionUser | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as SessionUser;
    } catch {
      user = null;
    }
  }

  return { accessToken, refreshToken, user };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_KEY);
  cookieStore.delete(REFRESH_TOKEN_KEY);
  cookieStore.delete(USER_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const { accessToken } = await getSession();
  return accessToken;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { user } = await getSession();
  return user;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
