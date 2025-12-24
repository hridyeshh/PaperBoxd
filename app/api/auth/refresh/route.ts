import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

/**
 * Refresh authentication token
 * 
 * POST /api/auth/refresh
 * Body: { token: string }
 * 
 * Returns: { token: string, user: { id, email, username, name, image } }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      console.error("[Token Refresh] NEXTAUTH_SECRET or AUTH_SECRET is not configured");
      return NextResponse.json(
        { error: "Authentication configuration error" },
        { status: 500 }
      );
    }

    // Verify and decode the token
    interface JwtPayload {
      userId: string;
      email: string;
      username?: string;
    }
    
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { error: "Token expired" },
          { status: 401 }
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }
      throw error;
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Generate new token with fresh expiration
    const newToken = jwt.sign(
      {
        userId: String(user._id),
        email: user.email,
        username: user.username,
      },
      secret,
      { expiresIn: "30d" }
    );

    console.log("[Token Refresh] Successfully refreshed token for user:", {
      email: user.email,
      username: user.username,
    });

    return NextResponse.json({
      token: newToken,
      user: {
        id: String(user._id),
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.avatar,
      },
    });
  } catch (error) {
    console.error("[Token Refresh] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Token refresh failed", details: errorMessage },
      { status: 500 }
    );
  }
}

