import { NextRequest, NextResponse } from "next/server";
import OTPService from "@/lib/services/OTPService";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import OTP from "@/lib/db/models/OTP";
import mongoose from "mongoose";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verify OTP and update email address
 * POST /api/users/change-email/verify-otp
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  let code: string | undefined;
  
  try {
    // Authenticate user
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Find the authenticated user
    const user = await User.findOne({ email: authUser.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.tempNewEmail) {
      return NextResponse.json(
        { error: "No pending email change. Please request a new code." },
        { status: 400 }
      );
    }

    const body = await req.json();
    code = body.code;
    
    console.log("[Change Email Verify OTP] Request received:", { 
      userId: user._id?.toString(),
      currentEmail: user.email,
      newEmail: user.tempNewEmail,
      codeLength: code?.length,
      timestamp: new Date().toISOString() 
    });

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    // Find active OTP for email change
    const otp = await OTP.findOne({
      userId: user._id,
      type: "email_change",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      return NextResponse.json(
        { error: "Code expired or invalid. Request a new code." },
        { status: 400 }
      );
    }

    // Check attempts
    if (otp.attempts >= 5) {
      otp.used = true;
      await otp.save();
      user.tempNewEmail = undefined;
      await user.save();
      return NextResponse.json(
        { error: "Too many failed attempts. Request a new code." },
        { status: 400 }
      );
    }

    // Verify code
    const isValid = await OTPService.verifyCode(code, otp.code);

    if (!isValid) {
      otp.attempts += 1;
      await otp.save();
      const attemptsRemaining = 5 - otp.attempts;
      return NextResponse.json(
        {
          error: `Invalid code. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? "s" : ""} remaining.`,
          attemptsRemaining,
        },
        { status: 400 }
      );
    }

    // Code is valid - update email
    const newEmail = user.tempNewEmail;
    
    // Double-check email is not taken (race condition protection)
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && (existingUser._id as mongoose.Types.ObjectId).toString() !== (user._id as mongoose.Types.ObjectId).toString()) {
      otp.used = true;
      await otp.save();
      user.tempNewEmail = undefined;
      await user.save();
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    // Update email
    user.email = newEmail;
    user.tempNewEmail = undefined;
    await user.save();

    // Mark OTP as used
    otp.used = true;
    await otp.save();

    console.log("[Change Email Verify OTP] Email updated successfully", { 
      userId: user._id?.toString(),
      newEmail: user.email 
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email updated successfully",
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Change Email Verify OTP] Error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while verifying the code.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

