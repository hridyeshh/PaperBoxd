"use client";
import { API_BASE_URL } from '@/lib/api/client';
import { Capacitor } from "@capacitor/core";
import { storeAuthToken } from "@/lib/capacitor/auth-storage";

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Sign in with credentials
 * Works for both web (NextAuth) and Capacitor (token-based)
 */
export async function signInWithCredentials(email: string, password: string) {
  console.log("[Auth] Starting sign in with credentials...", { email });

  const isNative = Capacitor.isNativePlatform();

  // Capacitor: Use token-based auth
  if (isNative) {
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
        throw new Error(error.error || "Invalid email or password");
      }

      const data = await response.json();

      // Store token for future requests
      await storeAuthToken(data.token);

      console.log("[Auth] Capacitor sign in successful!");

      // Return format compatible with NextAuth result
      return {
        ok: true,
        error: null,
        user: data.user,
      };
    } catch (error) {
      console.error("[Auth] Capacitor sign in error:", error);
      throw error instanceof Error ? error : new Error("Invalid email or password");
    }
  }

  // Web: Use NextAuth
  try {
    const result = await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: false,
    });

    console.log("[Auth] Sign in result:", result);

    if (result?.error) {
      // Map NextAuth errors to user-friendly messages
      let errorMessage = "Invalid email or password";

      if (result.error === "CredentialsSignin") {
        errorMessage = "Invalid email or password";
      } else if (result.error === "Configuration") {
        errorMessage = "Authentication service is not properly configured. Please contact support.";
      } else if (result.error.includes("email") || result.error.includes("password")) {
        errorMessage = "Invalid email or password";
      } else {
        // Use the error message if it's already user-friendly
        errorMessage = result.error;
      }

      throw new Error(errorMessage);
    }

    if (result?.ok) {
      console.log("[Auth] Sign in successful!");
    }

    return result;
  } catch (error) {
    // Re-throw if it's already our formatted error
    if (error instanceof Error && error.message !== "Configuration") {
      throw error;
    }
    // Otherwise, throw a user-friendly error
    throw new Error("Invalid email or password");
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  // Redirect to home page after sign in
  const callbackUrl = "/";
  await nextAuthSignIn("google", { callbackUrl });
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
  const response = await fetch(API_BASE_URL + "/api/users/register", {
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
