import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authApi } from "@/lib/api/endpoints";
import { clearSession } from "@/lib/auth/jwt-session";

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const reasons = Array.isArray(body?.reasons) ? (body.reasons as string[]) : [];

  if (reasons.length === 0) {
    return NextResponse.json(
      { error: "Deletion reasons are required" },
      { status: 400 }
    );
  }

  const { data, status } = await authApi.deleteMe(reasons);
  if (status >= 400) {
    return NextResponse.json(data, { status });
  }

  await clearSession();

  const cookieStore = await cookies();
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.callback-url");
  cookieStore.delete("next-auth.csrf-token");
  cookieStore.delete("__Host-next-auth.csrf-token");

  return NextResponse.json({ message: "Account deleted successfully" });
}
