import { NextRequest, NextResponse } from "next/server";
import OTPService from "@/lib/services/OTPService";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

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

    // Store the new email temporarily before sending OTP
    user.tempNewEmail = normalizedNewEmail;
    await user.save();

    // Use OTPService to create and send OTP (it handles rate limiting, OTP creation, and email sending)
    console.log("[Change Email Send OTP] Calling OTPService.createAndSend", { 
      newEmail: normalizedNewEmail, 
      userId: user._id?.toString(),
      type: "email_change" 
    });
    
    try {
      const result = await OTPService.createAndSend(normalizedNewEmail, "email_change", user._id?.toString());
      
      if (!result.success) {
        // Clean up temp email if OTP sending failed
        user.tempNewEmail = undefined;
        await user.save();
        
        return NextResponse.json(
          { error: result.message },
          { status: 429 } // Too Many Requests
        );
      }
      
      console.log("[Change Email Send OTP] OTP sent successfully", { to: normalizedNewEmail });
    } catch (otpError) {
      // Clean up temp email if OTP sending failed
      user.tempNewEmail = undefined;
      await user.save();
      
      console.error("[Change Email Send OTP] OTPService error:", otpError);
      
      // Check if it's a Resend API key error
      if (otpError instanceof Error && otpError.message.includes("RESEND_API_KEY")) {
        return NextResponse.json(
          { error: "Email service is not configured. Please contact support." },
          { status: 500 }
        );
      }
      
      // Return the error message from OTPService
      const errorMessage = otpError instanceof Error ? otpError.message : "Failed to send verification code. Please try again.";
      return NextResponse.json(
        { error: errorMessage },
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

