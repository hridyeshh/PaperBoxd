import { NextRequest, NextResponse } from "next/server";
import OTPService from "@/lib/services/OTPService";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { sendOTPLoginEmail } from "@/lib/email/otp-login";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Send OTP to new email address for email change
 * POST /api/users/change-email/send-otp
 * Body: { newEmail: string }
 */
export async function POST(req: NextRequest) {
  let newEmail: string | undefined;
  
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

    const body = await req.json();
    newEmail = body.newEmail;
    
    console.log("[Change Email Send OTP] Request received:", { 
      userId: user._id?.toString(),
      currentEmail: user.email,
      newEmail,
      timestamp: new Date().toISOString() 
    });

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

    // Check if new email is same as current email
    if (normalizedNewEmail === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "New email must be different from current email" },
        { status: 400 }
      );
    }

    // Check if new email is already taken
    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    // Check rate limit
    const rateLimit = await OTPService.checkRateLimit(normalizedNewEmail);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Generate OTP code
    const plainCode = OTPService.generateCode();
    const hashedCode = await OTPService.hashCode(plainCode);

    // Delete any existing unused OTPs for email change
    const OTPModel = (await import("@/lib/db/models/OTP")).default;
    await OTPModel.deleteMany({
      userId: user._id,
      type: "email_change",
      used: false,
    });

    // Create new OTP
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const otp = new OTPModel({
      userId: user._id,
      code: hashedCode,
      expiresAt,
      attempts: 0,
      used: false,
      type: "email_change",
    });

    await otp.save();

    // Store the new email temporarily in the OTP document
    // We'll need to update the OTP model to support this, or use a separate collection
    // For now, we'll store it in a temporary field on the user model
    user.tempNewEmail = normalizedNewEmail;
    await user.save();

    // Send email with OTP code
    try {
      await sendOTPLoginEmail({
        to: normalizedNewEmail,
        code: plainCode,
        username: user.username || "User",
      });
      console.log("[Change Email Send OTP] Email sent successfully", { to: normalizedNewEmail });
    } catch (error) {
      console.error("[Change Email Send OTP] Failed to send email:", error);
      await OTPModel.findByIdAndDelete(otp._id);
      user.tempNewEmail = undefined;
      await user.save();
      
      if (error instanceof Error && error.message.includes("RESEND_API_KEY")) {
        return NextResponse.json(
          { error: "Email service is not configured. Please contact support." },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification code sent to your new email address.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Change Email Send OTP] Error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while sending the verification code.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

