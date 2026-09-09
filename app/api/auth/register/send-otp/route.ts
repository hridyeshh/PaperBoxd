import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints";
import { sendOTPLoginEmail } from "@/lib/email/otp-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** True when `birthday` (YYYY-MM-DD) is a past date at least 18 years ago. */
function isAtLeastEighteen(birthday: unknown): boolean {
  if (typeof birthday !== "string" || birthday === "") return false;
  const dob = new Date(birthday);
  if (Number.isNaN(dob.getTime()) || dob > new Date()) return false;
  const eighteenth = new Date(dob);
  eighteenth.setFullYear(eighteenth.getFullYear() + 18);
  return eighteenth <= new Date();
}

export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    const body = await req.json();
    const { name, username, email: bodyEmail, password, birthday } = body;
    email = bodyEmail;

    if (!name || !username || !email || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    // Age gate. Checked here rather than passed through to the backend because
    // registration completes via the OTP-verify step, which carries only the
    // fields stashed in the OTP metadata — and the date of birth is
    // deliberately not stored (it is needed for this check and nothing else).
    // The backend re-checks on the direct /auth/register path.
    if (!isAtLeastEighteen(birthday)) {
      return NextResponse.json(
        { message: "You must be at least 18 years old to use PaperBoxd" },
        { status: 400 },
      );
    }

    const { data, status } = await authApi.sendRegistrationOTP({
      name,
      username,
      email: email.toLowerCase().trim(),
      password,
    });

    if (status >= 400) {
      const errData = data as { error?: { message?: string } | string; message?: string };
      const errMsg =
        (typeof errData?.error === "object" ? errData.error?.message : errData?.error) ??
        errData?.message ??
        "Failed to send verification code";
      return NextResponse.json({ message: errMsg }, { status });
    }

    if (data?.sent && data.code && data.email) {
      try {
        await sendOTPLoginEmail({ to: data.email, code: data.code, username: data.name });
      } catch (mailErr) {
        console.error("[Register Send OTP] Email send failed:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email.",
      email: data?.email ?? email.toLowerCase().trim(),
    });
  } catch (error) {
    console.error("[Register Send OTP] Error:", {
      error: error instanceof Error ? error.message : String(error),
      email: email || "unknown",
    });
    return NextResponse.json({ message: "An error occurred. Please try again." }, { status: 500 });
  }
}
