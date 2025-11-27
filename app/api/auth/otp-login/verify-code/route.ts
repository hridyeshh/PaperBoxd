import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import OTPService from "@/lib/services/OTPService";

// Force Node.js runtime for database and crypto operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let email: string | undefined;
  let code: string | undefined;
  
  try {
    const body = await req.json();
    email = body.email;
    code = body.code;
    
    console.log("[OTP Verify Code] Request received:", { 
      email, 
      codeLength: code?.length,
      timestamp: new Date().toISOString() 
    });

    if (!email || !code) {
      console.log("[OTP Verify Code] Error: Missing email or code", { email: !!email, code: !!code });
      return NextResponse.json(
        { message: "Email and code are required" },
        { status: 400 }
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      console.log("[OTP Verify Code] Error: Invalid code format", { code, codeLength: code.length });
      return NextResponse.json(
        { message: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    console.log("[OTP Verify Code] Calling OTPService.verify", { email, code, type: "login" });
    // Verify OTP
    const result = await OTPService.verify(email, code, "login");
    console.log("[OTP Verify Code] OTPService result:", { 
      valid: result.valid, 
      userId: result.userId,
      attemptsRemaining: result.attemptsRemaining,
      message: result.message 
    });

    if (!result.valid) {
      return NextResponse.json(
        {
          message: result.message || "Invalid code",
          attemptsRemaining: result.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    // OTP is valid - create a one-time session token
    if (!result.userId) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    await connectDB();
    console.log("[OTP Verify Code] Looking up user by ID:", { userId: result.userId });
    const user = await User.findById(result.userId);
    if (!user) {
      console.error("[OTP Verify Code] Error: User not found after OTP verification", { userId: result.userId });
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    console.log("[OTP Verify Code] User found:", { userId: user._id, email: user.email });

    // Generate a one-time session token (valid for 5 minutes)
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(sessionToken).digest("hex");
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    console.log("[OTP Verify Code] Generated session token, storing in user", { 
      userId: user._id,
      expiresAt: expiresAt.toISOString() 
    });

    // Store session token in user's passwordReset field temporarily
    // (we'll reuse this field structure for OTP session tokens)
    user.passwordReset = {
      token: hashedToken,
      expiresAt,
    };
    await user.save();
    console.log("[OTP Verify Code] Session token saved successfully");

    // Return session token to frontend (it will use this to create NextAuth session)
    return NextResponse.json(
      {
        success: true,
        message: "Code verified successfully",
        sessionToken, // Unhashed token for frontend
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[OTP Verify Code] Error caught:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email: email || "unknown",
      code: code ? "***" : "missing",
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while verifying the code",
      },
      { status: 500 }
    );
  }
}

