import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token as string | undefined;
    const newPassword = body.newPassword as string | undefined;

    if (!token || !newPassword) {
      return NextResponse.json(
        { message: "Token and new password are required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const { data, status } = await authApi.resetPassword(token, newPassword);

    if (status < 200 || status >= 300) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json(
        {
          message:
            err?.error?.message ??
            err?.message ??
            "Invalid or expired reset link",
        },
        { status }
      );
    }

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[Reset Password] Error:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { message: "An error occurred while resetting your password" },
      { status: 500 }
    );
  }
}
