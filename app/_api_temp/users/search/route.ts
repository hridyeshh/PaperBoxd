import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

// Type for lean user query result

export const dynamic = "force-static";

type UserLean = {
    _id: mongoose.Types.ObjectId | string;
    username?: string;
    name: string;
    avatar?: string;
};

/**
 * Search for users by username or name
 *
 * Query Parameters:
 * - q: Search query (required)
 * - limit: Number of results (default: 10, max: 20)
 *
 * Example: /api/users/search?q=hridyesh&limit=10
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");
        const limit = Math.min(
            parseInt(searchParams.get("limit") || "10"),
            20
        );

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { error: "Search query is required" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();

        // Normalize query for better matching
        const normalizedQuery = query.trim().toLowerCase();

        // Search for users by username or name (case-insensitive, partial match)
        // Using word boundaries and flexible matching to catch partial matches
        const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escapedQuery.split(/\s+/).join('.*'); // Match words in any order

        const users = await User.find({
            $or: [
                { username: { $regex: escapedQuery, $options: "i" } },
                { name: { $regex: escapedQuery, $options: "i" } },
                // Also try matching words in any order for names
                ...(normalizedQuery.includes(' ') ? [
                    { name: { $regex: regexPattern, $options: "i" } }
                ] : []),
            ],
        })
            .select("username name avatar")
            .limit(limit)
            .lean();

        const usersList = users.map((user) => {
            const userLean = user as unknown as UserLean;
            return {
                id: userLean._id?.toString() || "",
                username: userLean.username || "",
                name: userLean.name || "",
                avatar: userLean.avatar || undefined,
            };
        });

        return NextResponse.json({
            users: usersList,
            count: usersList.length,
        });
    } catch (error: unknown) {
        console.error("User search error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            {
                error: "Failed to search users",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}

