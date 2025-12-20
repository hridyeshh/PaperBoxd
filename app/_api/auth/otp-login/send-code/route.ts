import { NextRequest, NextResponse } from "next/server";
import OTPService from "@/lib/services/OTPService";

// Force Node.js runtime for database and email operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    const body = await req.json();
    email = body.email;
    
    console.log("[OTP Send Code] Request received:", { email, timestamp: new Date().toISOString() });

    if (!email) {
      console.log("[OTP Send Code] Error: Email is missing");
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      console.log("[OTP Send Code] Error: Invalid email format", { email });
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    console.log("[OTP Send Code] Calling OTPService.createAndSend", { email, type: "login" });
    // Create and send OTP
    const result = await OTPService.createAndSend(email, "login");
    console.log("[OTP Send Code] OTPService result:", { success: result.success, message: result.message });

    if (!result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 429 } // Too Many Requests
      );
    }

    return NextResponse.json(
      {
        message: result.message,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[OTP Send Code] Error caught:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email: email || "unknown",
      timestamp: new Date().toISOString(),
    });
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("RESEND_API_KEY")) {
        console.error("[OTP Send Code] RESEND_API_KEY error detected");
        return NextResponse.json(
          {
            message: "Email service is not configured. Please contact support.",
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      {
        message: "An error occurred while sending the code. Please try again.",
      },
      { status: 500 }
    );
  }
}

