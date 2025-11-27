import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

// Force Node.js runtime for database and crypto operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let email: string | undefined;
  let token: string | undefined;
  let newPassword: string | undefined;
  
  try {
    await connectDB();

    const body = await req.json();
    token = body.token;
    email = body.email;
    newPassword = body.newPassword;
    
    console.log("[Reset Password] Request received:", { 
      email, 
      tokenLength: token?.length,
      passwordLength: newPassword?.length,
      timestamp: new Date().toISOString() 
    });

    // Validate inputs
    if (!token || !email || !newPassword) {
      console.log("[Reset Password] Error: Missing required fields", { 
        token: !!token, 
        email: !!email, 
        newPassword: !!newPassword 
      });
      return NextResponse.json(
        { message: "Token, email, and new password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      console.log("[Reset Password] Error: Password too short", { passwordLength: newPassword.length });
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[Reset Password] Normalized email:", { original: email, normalized: normalizedEmail });
    
    // Find user
    console.log("[Reset Password] Looking up user in database");
    const user = await User.findOne({ email: normalizedEmail });
    console.log("[Reset Password] User lookup result:", { 
      found: !!user, 
      userId: user?._id?.toString(),
      hasPasswordReset: !!user?.passwordReset 
    });

    if (!user || !user.passwordReset) {
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Hash incoming token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("[Reset Password] Token verification:", {
      storedTokenExists: !!user.passwordReset.token,
      storedTokenLength: user.passwordReset.token?.length,
      hashedTokenLength: hashedToken.length,
      expiresAt: user.passwordReset.expiresAt?.toISOString(),
      usedAt: user.passwordReset.usedAt?.toISOString(),
    });

    // Verify token matches
    if (user.passwordReset.token !== hashedToken) {
      console.error("[Reset Password] Error: Token mismatch", {
        storedTokenPrefix: user.passwordReset.token?.substring(0, 10),
        hashedTokenPrefix: hashedToken.substring(0, 10),
      });
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    if (now > user.passwordReset.expiresAt) {
      console.error("[Reset Password] Error: Token expired", {
        now: now.toISOString(),
        expiresAt: user.passwordReset.expiresAt.toISOString(),
      });
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (user.passwordReset.usedAt) {
      console.error("[Reset Password] Error: Token already used", {
        usedAt: user.passwordReset.usedAt.toISOString(),
      });
      return NextResponse.json(
        { message: "This reset link has already been used" },
        { status: 400 }
      );
    }
    
    console.log("[Reset Password] Token verified successfully, proceeding with password reset");

    // Hash new password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used
    user.password = hashedPassword;
    user.passwordReset = {
      ...user.passwordReset,
      usedAt: new Date(),
    };

    await user.save();
    console.log("[Reset Password] Password reset successful", { userId: user._id ? user._id.toString() : "unknown" });

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Reset Password] Error caught:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email: email || "unknown",
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { message: "An error occurred while resetting your password" },
      { status: 500 }
    );
  }
}
