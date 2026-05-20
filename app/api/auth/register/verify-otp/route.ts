import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints";
import { setSession } from "@/lib/auth/jwt-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ message: "Email and code are required" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ message: "Code must be 6 digits" }, { status: 400 });
    }

    const { data, status } = await authApi.verifyRegistrationOTP(
      email.toLowerCase().trim(),
      code.trim()
    );

    if (status >= 400) {
      const errData = data as { error?: { message?: string } | string; message?: string };
      const errMsg =
        (typeof errData?.error === "object" ? errData.error?.message : errData?.error) ??
        errData?.message ??
        "Invalid verification code";
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
      message: "Account created successfully!",
      user: authData.user,
    });
  } catch (error) {
    console.error("[Register Verify OTP] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ message: "An error occurred. Please try again." }, { status: 500 });
  }
}
