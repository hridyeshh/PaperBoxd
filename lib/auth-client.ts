"use client";

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Sign in with credentials
 */
export async function signInWithCredentials(email: string, password: string) {
  console.log("[Auth] Starting sign in with credentials...", { email });

  const result = await nextAuthSignIn("credentials", {
    email,
    password,
    redirect: false,
  });

  console.log("[Auth] Sign in result:", result);

  if (result?.error) {
    console.error("[Auth] Sign in error:", result.error);
    throw new Error(result.error);
  }

  if (result?.ok) {
    console.log("[Auth] Sign in successful!");
  }

  return result;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  await nextAuthSignIn("google", { callbackUrl: "/profile" });
}

/**
 * Sign out
 */
export async function signOut() {
  await nextAuthSignOut({ callbackUrl: "/auth" });
}

/**
 * Register a new user
 */
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const response = await fetch("/api/users/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Registration failed");
  }

  return result;
}
