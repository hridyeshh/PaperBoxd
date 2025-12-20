import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "No token provided" },
        { status: 401 }
      );
    }

    // Verify token
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET or AUTH_SECRET is not configured");
      return NextResponse.json(
        { error: "Authentication configuration error" },
        { status: 500 }
      );
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      email: string;
      username: string;
    };

    await connectDB();

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.avatar,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    console.error("[Token Verify] Error:", error);
    return NextResponse.json(
      { error: "Token verification failed" },
      { status: 500 }
    );
  }
}
