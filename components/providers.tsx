"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { Capacitor } from "@capacitor/core";
import { API_BASE_URL } from "@/lib/api/client";

export function Providers({ children }: { children: ReactNode }) {
  const isNative = Capacitor.isNativePlatform();

  // Always render SessionProvider - it's required for useSession() to work
  // In Capacitor, sessions will be null (cookies don't work), but useSession() won't crash
  // Configure baseUrl for Capacitor to point to production API
  const baseUrl = isNative ? API_BASE_URL : undefined;

  if (isNative) {
    console.log("[Capacitor] SessionProvider configured for production API:", baseUrl);
  }

  return (
    <SessionProvider baseUrl={baseUrl}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </SessionProvider>
  );
}
