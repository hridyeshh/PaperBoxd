import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

/**
 * Verify Google ID Token from iOS or Web app and return JWT
 * 
 * Supports both Web and iOS Client IDs to allow authentication from both platforms.
 * 
 * POST /api/auth/google-mobile
 * Body: { idToken: string }
 * 
 * Returns: { token: string, user: { id, email, username, name, image } }
 * 
 * Environment Variables:
 * - GOOGLE_CLIENT_ID_WEB: Web OAuth Client ID (optional, falls back to GOOGLE_CLIENT_ID)
 * - GOOGLE_CLIENT_ID_IOS: iOS OAuth Client ID (optional, has default fallback)
 * - GOOGLE_CLIENT_ID: Fallback for Web Client ID
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      );
    }

    // Get Google Client IDs from environment
    // Support both Web and iOS Client IDs to allow tokens from both platforms
    const webClientID = process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID;
    const iosClientID = process.env.GOOGLE_CLIENT_ID_IOS || "893085484645-7788sam2d7posge2bcild48duripv8h4.apps.googleusercontent.com";
    
    // Build array of acceptable client IDs
    const allowedAudiences: string[] = [];
    if (webClientID) allowedAudiences.push(webClientID);
    if (iosClientID) allowedAudiences.push(iosClientID);
    
    if (allowedAudiences.length === 0) {
      console.error("[Google Mobile Auth] No Google Client IDs configured");
      return NextResponse.json(
        { error: "Authentication configuration error" },
        { status: 500 }
      );
    }

    // Initialize OAuth2Client without a single client ID
    // We'll verify against multiple audiences
    const client = new OAuth2Client();

    // Verify the Google ID token against multiple audiences
    // This allows tokens from both Web and iOS clients
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: allowedAudiences, // Accept tokens from BOTH Web and iOS
      });
    } catch (verifyError) {
      console.error("[Google Mobile Auth] Token verification failed:", verifyError);
      return NextResponse.json(
        { error: "Invalid or expired Google ID token" },
        { status: 401 }
      );
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid ID token payload" },
        { status: 401 }
      );
    }

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return NextResponse.json(
        { error: "Email not provided by Google" },
        { status: 400 }
      );
    }

    console.log("[Google Mobile Auth] Verified Google user:", { email, name, googleId });

    // Find or create user in MongoDB
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new user from Google profile
      console.log("[Google Mobile Auth] Creating new user from Google profile");
      
      // Generate a unique username from email
      const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      let uniqueUsername = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (await User.findOne({ username: uniqueUsername })) {
        uniqueUsername = `${baseUsername}${counter}`;
        counter++;
      }

      // Create user with Google data
      // Note: OAuth users get a random password (they'll never use it)
      user = await User.create({
        email: email.toLowerCase(),
        password: await bcrypt.hash(Math.random().toString(36) + Date.now().toString(), 10),
        name: name || email.split("@")[0] || "User",
        username: uniqueUsername,
        avatar: picture, // Store Google profile picture
        provider: "google",
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
      });

      console.log("[Google Mobile Auth] New user created:", {
        id: user._id?.toString(),
        email: user.email,
        username: user.username,
      });
    } else {
      // Update existing user
      console.log("[Google Mobile Auth] Updating existing user");
      
      // Update user info if needed
      if (name && user.name !== name) {
        user.name = name;
      }
      
      // Update avatar if Google provided one and user doesn't have a custom one
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      
      // Update last active timestamp
      user.lastActive = new Date();
      await user.save();
    }

    // Generate JWT token (same format as /api/auth/token/login)
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      console.error("[Google Mobile Auth] NEXTAUTH_SECRET or AUTH_SECRET is not configured");
      return NextResponse.json(
        { error: "Authentication configuration error" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId: String(user._id),
        email: user.email,
        username: user.username,
      },
      secret,
      { expiresIn: "30d" }
    );

    console.log("[Google Mobile Auth] Successfully authenticated user:", {
      email: user.email,
      username: user.username,
    });

    // Return token and user data (same format as /api/auth/token/login)
    return NextResponse.json({
      token,
      user: {
        id: String(user._id),
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.avatar,
      },
    });
  } catch (error) {
    console.error("[Google Mobile Auth] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Authentication failed", details: errorMessage },
      { status: 500 }
    );
  }
}

