import { NextResponse } from "next/server";

// No-op middleware for Capacitor static export builds
// Middleware doesn't run in static exports, so this just passes through
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
