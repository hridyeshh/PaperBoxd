import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Initialize OAuth2Client with Google Client ID
// Support both web and iOS client IDs
const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_IOS_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_IOS_CLIENT_ID must be set");
  }
  return new OAuth2Client(clientId);
};

/**
 * POST /api/mobile/v1/auth/google-mobile
 * Verify Google ID Token from iOS and return PaperBoxd JWT
 * 
 * Request Body: { idToken: string }
 * Response: { token: string, user: { id, email, username, name, image? } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "Google ID token is required" },
        { status: 400 }
      );
    }

    console.log("[Google Mobile Auth] Verifying Google ID token...");

    // Verify the Google ID token
    const client = getOAuth2Client();
    let ticket;
    
    try {
      // Verify the token - this will throw if invalid
      ticket = await client.verifyIdToken({
        idToken,
        // Accept both web and iOS client IDs
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_IOS_CLIENT_ID,
        ].filter(Boolean) as string[],
      });
    } catch (error) {
      console.error("[Google Mobile Auth] Token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid or expired Google ID token" },
        { status: 401 }
      );
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    const email = payload.email;
    const name = payload.name || email?.split("@")[0] || "User";
    const picture = payload.picture;

    if (!email) {
      return NextResponse.json(
        { error: "Email not found in Google token" },
        { status: 400 }
      );
    }

    console.log("[Google Mobile Auth] Token verified, email:", email);

    await connectDB();

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new user
      console.log("[Google Mobile Auth] Creating new user:", email);
      user = await User.create({
        email: email.toLowerCase(),
        password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for OAuth users
        name: name,
        // Don't use Google profile image - user can set their own avatar later
        avatar: undefined,
        pronouns: [],
        isPublic: true,
        topBooks: [],
        favoriteBooks: [],
        bookshelf: [],
        likedBooks: [],
        tbrBooks: [],
        currentlyReading: [],
        readingLists: [],
        activities: [],
        authorsRead: [],
        followers: [],
        following: [],
        totalBooksRead: 0,
        totalPagesRead: 0,
        // username will be set later by user
      });
      console.log("[Google Mobile Auth] New user created:", user._id);
    } else {
      // Update last active for existing user
      user.lastActive = new Date();
      await user.save({ validateBeforeSave: false });
      console.log("[Google Mobile Auth] Existing user found, updated lastActive");
    }

    // Generate JWT token (30-day expiration, same as web)
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("NEXTAUTH_SECRET or AUTH_SECRET must be set");
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
      },
      secret,
      { expiresIn: "30d" }
    );

    console.log("[Google Mobile Auth] JWT token generated for user:", user._id);

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.avatar || undefined,
      },
    });
  } catch (error) {
    console.error("[Google Mobile Auth] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to authenticate with Google",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

