import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import OTPService from "@/lib/services/OTPService";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * Verify OTP and update email
 * 
 * POST /api/users/[username]/email-change/verify-otp
 * Body: { code: string }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "OTP code is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify the authenticated user owns this profile
    if (user.email !== session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized - You can only change your own email" },
        { status: 403 }
      );
    }

    // Check if tempNewEmail exists
    if (!user.tempNewEmail) {
      return NextResponse.json(
        { error: "No pending email change. Please request OTP first." },
        { status: 400 }
      );
    }

    // Verify OTP with the new email
    const verifyResult = await OTPService.verify(user.tempNewEmail, code, "email_change");

    if (!verifyResult.valid) {
      return NextResponse.json(
        {
          error: verifyResult.message || "Invalid or expired OTP code",
          attemptsRemaining: verifyResult.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    // OTP verified - update email
    const oldEmail = user.email;
    user.email = user.tempNewEmail;
    user.tempNewEmail = undefined;
    await user.save();

    console.log(`[Email Change] Email updated successfully for user ${username}: ${oldEmail} -> ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Email updated successfully",
      newEmail: user.email,
    });
  } catch (error) {
    console.error("[Email Change Verify] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify OTP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

