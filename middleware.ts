import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/profile", "/settings"];

// Routes that should redirect to profile if already authenticated
const authRoutes = ["/auth"];

// Auth routes that should be accessible even when logged in (e.g., forgot password, reset password)
const publicAuthRoutes = ["/auth/forgot-password", "/auth/reset-password"];

// Setup routes that should be accessible even when logged in (e.g., choose username, setup profile, onboarding)
const setupRoutes = ["/choose-username", "/setup-profile", "/onboarding"];

export default auth((req) => {
  const { nextUrl } = req;
  
  // NEW: Completely exempt the mobile API from web-session logic
  // Mobile API uses Bearer tokens, not cookies/sessions
  if (nextUrl.pathname.startsWith("/api/mobile")) {
    return NextResponse.next();
  }
  
  const isLoggedIn = !!req.auth;

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  
  // Check if it's a setup route (should be accessible even when logged in)
  const isSetupRoute = setupRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  
  // Check if it's a public auth route (should be accessible even when logged in)
  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Redirect to auth if trying to access protected route without being logged in
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth", nextUrl));
  }

  // Redirect to profile if trying to access auth routes while logged in
  // BUT allow public auth routes (forgot password, reset password) and setup routes even when logged in
  if (isAuthRoute && isLoggedIn && !isPublicAuthRoute && !isSetupRoute) {
    return NextResponse.redirect(new URL("/profile", nextUrl));
  }

  return NextResponse.next();
});

// Matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - api/mobile (Mobile API - uses Bearer tokens, not sessions)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|api/mobile|_next/static|_next/image|favicon.ico).*)",
  ],
};
