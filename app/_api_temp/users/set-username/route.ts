import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";


export const dynamic = "force-static";

/**
 * Set username for the authenticated user
 *
 * POST /api/users/set-username
 * Body: { username: string }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json(
                { error: "Username is required" },
                { status: 400 }
            );
        }

        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json(
                {
                    error: "Username must be 3-30 characters and contain only letters, numbers, and underscores",
                },
                { status: 400 }
            );
        }

        const normalizedUsername = username.toLowerCase();

        await connectDB();

        // Find the user
        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Check if username is already taken by another user
        const existingUser = await User.findOne({
            username: normalizedUsername,
            _id: { $ne: user._id }, // Exclude current user
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Username is already taken" },
                { status: 409 }
            );
        }

        // Update username
        user.username = normalizedUsername;
        await user.save();

        return NextResponse.json({
            message: "Username set successfully",
            username: normalizedUsername,
        });
    } catch (error) {
        console.error("Error setting username:", error);
        return NextResponse.json(
            {
                error: "Failed to set username",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

