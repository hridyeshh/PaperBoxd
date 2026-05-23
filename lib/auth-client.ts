"use client";

import { signIn as nextAuthSignIn } from "next-auth/react";

/**
 * Sign in with Google via NextAuth. OAuth users land without a username and
 * are redirected to /choose-username by the post-login flow.
 */
export async function signInWithGoogle() {
  const callbackUrl = "/";
  await nextAuthSignIn("google", { callbackUrl });
}
