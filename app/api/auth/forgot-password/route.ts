import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

// Force Node.js runtime for database and email operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

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
    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        username: user.username,
      });
    } catch (error) {
      console.error("Failed to send password reset email:", error);
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
    console.error("Password reset error:", error);
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
