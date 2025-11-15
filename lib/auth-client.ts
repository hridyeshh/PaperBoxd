"use client";

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Sign in with credentials
 */
export async function signInWithCredentials(email: string, password: string) {
  console.log("[Auth] Starting sign in with credentials...", { email });

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
  // Redirect to /profile, which will redirect to /u/[username]
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
