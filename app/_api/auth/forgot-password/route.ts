import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db/mongodb";

import User from "@/lib/db/models/User";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

// Force Node.js runtime for database and email operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let email: string | undefined;

  try {
    await connectDB();

    const body = await req.json();
    email = body.email;

    console.log("[Forgot Password] Request received:", { email, timestamp: new Date().toISOString() });

    if (!email) {
      console.log("[Forgot Password] Error: Email is missing");
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      console.log("[Forgot Password] Error: Invalid email format", { email });
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[Forgot Password] Normalized email:", { original: email, normalized: normalizedEmail });

    // Find user
    console.log("[Forgot Password] Looking up user in database");
    const user = await User.findOne({ email: normalizedEmail });
    console.log("[Forgot Password] User lookup result:", {
      found: !!user,
      userId: user?._id?.toString(),
      email: user?.email
    });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return NextResponse.json(
        {
          message:
            "If an account exists with this email, a password reset link has been sent.",
        },
        { status: 200 }
      );
    }

    // Generate cryptographically secure token (32 bytes)
    const token = crypto.randomBytes(32).toString("hex");

    // Hash token with SHA256 before storing
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Set expiry to 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store hashed token
    user.passwordReset = {
      token: hashedToken,
      expiresAt,
    };

    await user.save();

    // Create reset URL with unhashed token
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send email with unhashed token
    console.log("[Forgot Password] Attempting to send email", {
      to: user.email,
      username: user.username,
      resetUrlLength: resetUrl.length
    });
    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        username: user.username,
      });
      console.log("[Forgot Password] Email sent successfully", { to: user.email });
    } catch (error) {
      console.error("[Forgot Password] Failed to send email:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        to: user.email,
        timestamp: new Date().toISOString(),
      });
      // Still return success to prevent email enumeration
      return NextResponse.json(
        {
          message:
            "If an account exists with this email, a password reset link has been sent.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message:
          "If an account exists with this email, a password reset link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Forgot Password] Error caught:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email: email || "unknown",
      timestamp: new Date().toISOString(),
    });
    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        message:
          "If an account exists with this email, a password reset link has been sent.",
      },
      { status: 200 }
    );
  }
}
