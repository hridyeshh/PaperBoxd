import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints";
import { setSession } from "@/lib/auth/jwt-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let email: string | undefined;
  let code: string | undefined;

  try {
    const body = await req.json();
    email = body.email;
    code = body.code;

    if (!email || !code) {
      return NextResponse.json({ message: "Email and code are required" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ message: "Code must be 6 digits" }, { status: 400 });
    }

    const { data, status } = await authApi.verifyOTP(email.toLowerCase().trim(), code.trim());

    if (status >= 400) {
      // Go wraps errors as { error: { code, message } }; extract the string.
      const errData = data as { error?: { message?: string } | string; message?: string };
      const errMsg =
        (typeof errData?.error === "object" ? errData.error?.message : errData?.error) ??
        errData?.message ??
        "Invalid code";
      return NextResponse.json({ message: errMsg }, { status });
    }

    const authData = data as {
      access_token: string;
      refresh_token: string;
      user: { id: string; username: string; email: string; name: string; avatar_url?: string };
    };

    await setSession(authData.access_token, authData.refresh_token, authData.user);

    return NextResponse.json({
      success: true,
      message: "Code verified successfully",
      user: authData.user,
    });
  } catch (error) {
    console.error("[OTP Verify Code] Error:", {
      error: error instanceof Error ? error.message : String(error),
      email: email || "unknown",
    });
    return NextResponse.json({ message: "An error occurred while verifying the code" }, { status: 500 });
  }
}
