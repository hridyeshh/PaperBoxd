import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

// Force Node.js runtime for database and crypto operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { token, email, newPassword } = await req.json();

    // Validate inputs
    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { message: "Token, email, and new password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.passwordReset) {
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Hash incoming token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Verify token matches
    if (user.passwordReset.token !== hashedToken) {
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > user.passwordReset.expiresAt) {
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (user.passwordReset.usedAt) {
      return NextResponse.json(
        { message: "This reset link has already been used" },
        { status: 400 }
      );
    }

    // Hash new password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used
    user.password = hashedPassword;
    user.passwordReset = {
      ...user.passwordReset,
      usedAt: new Date(),
    };

    await user.save();

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "An error occurred while resetting your password" },
      { status: 500 }
    );
  }
}
