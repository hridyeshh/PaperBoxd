import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Initialize OAuth2Client - no client ID needed for verification
// We'll specify the audience in verifyIdToken instead
const getOAuth2Client = () => {
  return new OAuth2Client();
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

    // Get all possible client IDs (web and iOS)
    const possibleClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_IOS,
    ].filter(Boolean) as string[];

    if (possibleClientIds.length === 0) {
      console.error("[Google Mobile Auth] No Google Client IDs configured");
      return NextResponse.json(
        { error: "Server configuration error: Google Client IDs not set" },
        { status: 500 }
      );
    }

    console.log("[Google Mobile Auth] Checking token against client IDs:", possibleClientIds.map(id => id.substring(0, 20) + "..."));

    // Verify the Google ID token
    const client = getOAuth2Client();
    let ticket;
    
    try {
      // Verify the token - this will throw if invalid
      // Try each client ID until one works (tokens are issued for a specific client ID)
      let lastError: Error | null = null;
      
      for (const clientId of possibleClientIds) {
        try {
          ticket = await client.verifyIdToken({
            idToken,
            audience: clientId,
          });
          console.log("[Google Mobile Auth] Token verified successfully with client ID:", clientId.substring(0, 20) + "...");
          break; // Success, exit loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.log("[Google Mobile Auth] Token verification failed for client ID:", clientId.substring(0, 20) + "...", "Error:", lastError.message);
          // Continue to next client ID
        }
      }
      
      if (!ticket) {
        throw lastError || new Error("Token verification failed for all client IDs");
      }
    } catch (error) {
      console.error("[Google Mobile Auth] Token verification failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Google Mobile Auth] Error details:", {
        message: errorMessage,
        clientIdsChecked: possibleClientIds.length,
      });
      return NextResponse.json(
        { 
          error: "Invalid or expired Google ID token",
          details: "The token could not be verified. Please ensure you're using the correct Google Client ID.",
        },
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
        userId: (user._id as mongoose.Types.ObjectId).toString(),
        email: user.email,
        username: user.username,
      },
      secret,
      { expiresIn: "30d" }
    );

    console.log("[Google Mobile Auth] JWT token generated for user:", (user._id as mongoose.Types.ObjectId).toString());

    return NextResponse.json({
      token,
      user: {
        id: (user._id as mongoose.Types.ObjectId).toString(),
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

