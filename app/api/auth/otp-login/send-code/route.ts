import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints";
import { sendOTPLoginEmail } from "@/lib/email/otp-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    const body = await req.json();
    email = body.email;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    const { data, status } = await authApi.sendOTP(email.toLowerCase().trim());

    if (status >= 400) {
      return NextResponse.json({ message: "Failed to send code" }, { status });
    }

    if (data?.sent && data.code && data.email) {
      try {
        await sendOTPLoginEmail({
          to: data.email,
          code: data.code,
          username: data.name || data.username,
        });
      } catch (mailErr) {
        console.error("[OTP Send Code] Email send failed:", mailErr);
        // Don't block login if email send fails in production;
        // the code is returned from Go anyway and logged in development.
      }
    }

    return NextResponse.json({ message: "If an account exists with this email, a code has been sent.", success: true });
  } catch (error) {
    console.error("[OTP Send Code] Error:", {
      error: error instanceof Error ? error.message : String(error),
      email: email || "unknown",
    });
    return NextResponse.json({ message: "An error occurred while sending the code. Please try again." }, { status: 500 });
  }
}
