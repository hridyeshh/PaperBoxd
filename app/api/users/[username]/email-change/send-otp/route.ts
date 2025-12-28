import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import OTPService from "@/lib/services/OTPService";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

/**
 * Send OTP to new email for email change verification
 * 
 * POST /api/users/[username]/email-change/send-otp
 * Body: { newEmail: string }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const { newEmail } = body;

    if (!newEmail) {
      return NextResponse.json(
        { error: "New email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();

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

    // Check if new email is the same as current email
    if (normalizedNewEmail === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "New email must be different from current email" },
        { status: 400 }
      );
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 409 }
      );
    }

    // Store the new email temporarily
    user.tempNewEmail = normalizedNewEmail;
    await user.save();

    // Send OTP to the new email address
    // Pass userId so OTP service can find the user (since email is the new email, not current)
    console.log(`[Email Change OTP] Sending OTP to new email: ${normalizedNewEmail}`);
    const userId = (user._id as mongoose.Types.ObjectId).toString();
    const result = await OTPService.createAndSend(normalizedNewEmail, "email_change", userId);

    if (!result.success) {
      // Clear temp email if OTP send failed
      user.tempNewEmail = undefined;
      await user.save();
      return NextResponse.json(
        { error: result.message },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP has been sent to your new email address",
    });
  } catch (error) {
    console.error("[Email Change OTP] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to send OTP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

