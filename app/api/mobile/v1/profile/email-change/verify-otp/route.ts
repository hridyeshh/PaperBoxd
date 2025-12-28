import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import OTPService from "@/lib/services/OTPService";
import { getUserFromRequest } from "@/lib/auth-token";

export const dynamic = 'force-dynamic';

/**
 * Mobile API: Verify OTP and update email
 * 
 * POST /api/mobile/v1/profile/email-change/verify-otp
 * Headers: Authorization: Bearer <token>
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log("=".repeat(80));
    console.log(`[Mobile Email Change Verify] [${requestId}] === REQUEST START ===`);
    
    const body = await req.json();
    const { code } = body;

    if (!code) {
      console.log(`[Mobile Email Change Verify] [${requestId}] ❌ ERROR: OTP code is required`);
      return NextResponse.json(
        { error: "OTP code is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Authenticate user
    console.log(`[Mobile Email Change Verify] [${requestId}] Authenticating user...`);
    const authUser = await getUserFromRequest(req);
    
    if (!authUser || !authUser.id) {
      console.log(`[Mobile Email Change Verify] [${requestId}] ❌ ERROR: Unauthorized`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[Mobile Email Change Verify] [${requestId}] ✅ User authenticated: ${authUser.id}`);

    // Find user
    const user = await User.findById(authUser.id);
    if (!user) {
      console.log(`[Mobile Email Change Verify] [${requestId}] ❌ ERROR: User not found`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if tempNewEmail exists
    if (!user.tempNewEmail) {
      console.log(`[Mobile Email Change Verify] [${requestId}] ❌ ERROR: No pending email change`);
      return NextResponse.json(
        { error: "No pending email change. Please request OTP first." },
        { status: 400 }
      );
    }

    console.log(`[Mobile Email Change Verify] [${requestId}] Verifying OTP for tempNewEmail: ${user.tempNewEmail}`);

    // Verify OTP with the new email
    const verifyResult = await OTPService.verify(user.tempNewEmail, code, "email_change");

    if (!verifyResult.valid) {
      console.log(`[Mobile Email Change Verify] [${requestId}] ❌ ERROR: Invalid OTP - ${verifyResult.message}`);
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

    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Email Change Verify] [${requestId}] ✅ SUCCESS: Email updated (total time: ${totalTime}ms)`);
    console.log(`[Mobile Email Change Verify] [${requestId}] Email changed: ${oldEmail} -> ${user.email}`);
    console.log(`[Mobile Email Change Verify] [${requestId}] === REQUEST END ===`);
    console.log("=".repeat(80));

    return NextResponse.json({
      success: true,
      message: "Email updated successfully",
      newEmail: user.email,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Email Change Verify] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Email Change Verify] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Email Change Verify] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Email Change Verify] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      {
        error: "Failed to verify OTP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

