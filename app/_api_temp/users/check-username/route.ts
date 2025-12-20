import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";


export const dynamic = "force-static";

/**
 * Check if a username is available
 *
 * GET /api/users/check-username?username=testuser
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const username = searchParams.get("username");

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
                    available: false,
                    error: "Username must be 3-30 characters and contain only letters, numbers, and underscores",
                },
                { status: 200 }
            );
        }

        await connectDB();

        // Check if username exists
        const existingUser = await User.findOne({ username: username.toLowerCase() });

        return NextResponse.json({
            available: !existingUser,
            username: username.toLowerCase(),
        });
    } catch (error) {
        console.error("Error checking username:", error);
        return NextResponse.json(
            {
                error: "Failed to check username availability",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

