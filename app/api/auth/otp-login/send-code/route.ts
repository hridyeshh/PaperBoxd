import { NextRequest, NextResponse } from "next/server";
import OTPService from "@/lib/services/OTPService";

// Force Node.js runtime for database and email operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Create and send OTP
    const result = await OTPService.createAndSend(email, "login");

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
    console.error("OTP send code error:", error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("RESEND_API_KEY")) {
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

