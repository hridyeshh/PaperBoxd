import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET or AUTH_SECRET is not configured");
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

    // Return token and user data
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
    console.error("[Token Login] Error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
