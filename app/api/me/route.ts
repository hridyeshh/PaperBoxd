import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/jwt-session";

// The client's view of the signed-in user. Replaces reading the pb_user cookie
// from document.cookie, which is no longer possible now that it is httpOnly.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
