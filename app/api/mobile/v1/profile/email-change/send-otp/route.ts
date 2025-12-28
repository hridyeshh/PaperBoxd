import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import OTPService from "@/lib/services/OTPService";
import { getUserFromRequest } from "@/lib/auth-token";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

/**
 * Mobile API: Send OTP to new email for email change verification
 * 
 * POST /api/mobile/v1/profile/email-change/send-otp
 * Headers: Authorization: Bearer <token>
 * Body: { newEmail: string }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log("=".repeat(80));
    console.log(`[Mobile Email Change OTP] [${requestId}] === REQUEST START ===`);
    
    const body = await req.json();
    const { newEmail } = body;

    if (!newEmail) {
      console.log(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR: New email is required`);
      return NextResponse.json(
        { error: "New email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      console.log(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR: Invalid email format`);
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    // Connect to database
    await connectDB();

    // Authenticate user
    console.log(`[Mobile Email Change OTP] [${requestId}] Authenticating user...`);
    const authUser = await getUserFromRequest(req);
    
    if (!authUser || !authUser.id) {
      console.log(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR: Unauthorized`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[Mobile Email Change OTP] [${requestId}] ✅ User authenticated: ${authUser.id}`);

    // Find user
    const user = await User.findById(authUser.id);
    if (!user) {
      console.log(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR: User not found`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if new email is the same as current email
    if (normalizedNewEmail === user.email.toLowerCase()) {
      console.log(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR: New email same as current`);
      return NextResponse.json(
        { error: "New email must be different from current email" },
        { status: 400 }
      );
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      console.log(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR: Email already in use`);
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 409 }
      );
    }

    // Store the new email temporarily
    user.tempNewEmail = normalizedNewEmail;
    await user.save();
    console.log(`[Mobile Email Change OTP] [${requestId}] Stored tempNewEmail: ${normalizedNewEmail}`);

    // Send OTP to the new email address
    console.log(`[Mobile Email Change OTP] [${requestId}] Sending OTP to new email: ${normalizedNewEmail}`);
    const userId = (user._id as mongoose.Types.ObjectId).toString();
    const result = await OTPService.createAndSend(normalizedNewEmail, "email_change", userId);

    if (!result.success) {
      // Clear temp email if OTP send failed
      user.tempNewEmail = undefined;
      await user.save();
      console.log(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR: Failed to send OTP - ${result.message}`);
      return NextResponse.json(
        { error: result.message },
        { status: 429 }
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Email Change OTP] [${requestId}] ✅ SUCCESS: OTP sent (total time: ${totalTime}ms)`);
    console.log(`[Mobile Email Change OTP] [${requestId}] === REQUEST END ===`);
    console.log("=".repeat(80));

    return NextResponse.json({
      success: true,
      message: "OTP has been sent to your new email address",
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Email Change OTP] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Email Change OTP] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Email Change OTP] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Email Change OTP] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      {
        error: "Failed to send OTP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

