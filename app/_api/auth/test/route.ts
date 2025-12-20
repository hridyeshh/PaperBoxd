import { auth } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/auth-token";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Try token auth first, then fall back to session auth
  const authUser = await getUserFromRequest(request);
  const session = await auth();

  return NextResponse.json({
    authenticated: !!authUser || !!session,
    authUser: authUser || null,
    session: session || null,
    authMethod: authUser ? "token" : (session ? "session" : "none"),
  });
}
