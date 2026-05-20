import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Always return the same message regardless of whether the email exists, so
// callers can't probe for account existence.
const GENERIC_RESPONSE = {
  message:
    "If an account exists with this email, a password reset link has been sent.",
};

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

    const normalizedEmail = email.toLowerCase().trim();
    const { data, status } = await authApi.forgotPassword(normalizedEmail);

    if (status >= 200 && status < 300 && data?.sent && data.reset_token) {
      const resetUrl = buildResetUrl(data.reset_token, normalizedEmail);
      try {
        await sendPasswordResetEmail({
          to: data.email ?? normalizedEmail,
          resetUrl,
          username: data.username ?? "",
        });
      } catch (mailErr) {
        // Don't surface email-send failures to the caller — return the generic
        // success message either way to avoid leaking account existence.
        console.error("[Forgot Password] Email send failed:", mailErr);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (error) {
    console.error("[Forgot Password] Error:", {
      error: error instanceof Error ? error.message : String(error),
      email: email || "unknown",
    });
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }
}

function buildResetUrl(token: string, email: string): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
}
