import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

/**
 * Register a new user
 *
 * POST /api/users/register
 * Body: { email, password, name, username? }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("📝 [Register] Starting registration process...");

    const body = await request.json();
    let { email, password, name, username } = body;

    console.log("📝 [Register] Received data:", { email, name, username });

    // Validation
    if (!email || !password || !name) {
      console.error("❌ [Register] Missing required fields");
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      console.error("❌ [Register] Password too short");
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Connect to database
    console.log("🔌 [Register] Connecting to MongoDB...");
    await connectDB();
    console.log("✅ [Register] Connected to MongoDB");

    // Check if email already exists
    console.log("🔍 [Register] Checking for existing email...");
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      console.error("❌ [Register] Email already exists:", email);
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }
    console.log("✅ [Register] Email is available");

    // Don't set username during registration - user will choose it after sign-up
    // Username is now optional and will be set in a separate step

    // Hash password
    console.log("🔐 [Register] Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ [Register] Password hashed");

    // Create new user (without username - user will set it after sign-up)
    console.log("👤 [Register] Creating user in database...");
    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      // username will be set later by user
      name,
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

    console.log("✅ [Register] User created successfully:", {
      id: newUser._id.toString(),
      email: newUser.email,
      username: newUser.username,
    });

    // Remove password from response
    const userResponse = {
      id: newUser._id,
      email: newUser.email,
      username: newUser.username,
      name: newUser.name,
      avatar: newUser.avatar,
      bio: newUser.bio,
      isPublic: newUser.isPublic,
      createdAt: newUser.createdAt,
    };

    console.log("✅ [Register] Registration complete!");

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [Register] Registration error:", error);
    if (error instanceof Error) {
      console.error("❌ [Register] Error message:", error.message);
      console.error("❌ [Register] Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to register user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
