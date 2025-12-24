import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

/**
 * Register a new user and return authentication token
 * 
 * POST /api/users/register
 * Body: { email, password, name }
 * 
 * Returns: { token: string, user: { id, email, username, name, image } }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, password, name } = await req.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Generate a unique username from email
    const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    let uniqueUsername = baseUsername;
    let counter = 1;

    // Ensure username is unique
    while (await User.findOne({ username: uniqueUsername })) {
      uniqueUsername = `${baseUsername}${counter}`;
      counter++;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      username: uniqueUsername,
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

    // Generate JWT token (same format as /api/auth/token/login)
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      console.error("[Register] NEXTAUTH_SECRET or AUTH_SECRET is not configured");
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

    console.log("[Register] Successfully registered and authenticated user:", {
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
    console.error("[Register] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Registration failed", details: errorMessage },
      { status: 500 }
    );
  }
}

