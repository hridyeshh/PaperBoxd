import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

type NextRequestWithAuth = NextRequest & {
  auth: {
    user?: {
      id: string;
      email: string;
      name: string;
      username?: string;
      image?: string;
    };
  } | null;
};

// Allowed origins for CORS (Capacitor + web)
const allowedOrigins = [
  "https://paperboxd.in",
  "http://localhost:3000",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
];

// Handle CORS for API routes
function handleCORS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  if (!isApiRoute) {
    return null; // Not an API route, skip CORS
  }

  // Handle preflight (OPTIONS) requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cookie, X-Requested-With"
      );
      response.headers.set("Access-Control-Max-Age", "86400"); // Cache for 24 hours
    }

    return response;
  }

  // For actual API requests, return headers to add to response
  if (origin && allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  return null;
}

export default auth((req: NextRequestWithAuth) => {
  // Handle CORS first (before any auth checks)
  const corsResponse = handleCORS(req);
  if (corsResponse instanceof NextResponse) {
    return corsResponse; // Return preflight response immediately
  }

  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const protectedRoutes = ["/profile", "/settings"];
  const authRoutes = ["/auth"];
  const publicAuthRoutes = ["/auth/forgot-password", "/auth/reset-password"];
  const setupRoutes = ["/choose-username", "/setup-profile", "/onboarding"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  const isSetupRoute = setupRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Auth redirects
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth", nextUrl));
  }

  if (isAuthRoute && isLoggedIn && !isPublicAuthRoute && !isSetupRoute) {
    return NextResponse.redirect(new URL("/profile", nextUrl));
  }

  // Create response with CORS headers if needed
  const response = NextResponse.next();

  // Add CORS headers to API responses
  if (corsResponse && typeof corsResponse === "object") {
    Object.entries(corsResponse).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
});

export const config = {
  matcher: [
    // Match all paths including API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
