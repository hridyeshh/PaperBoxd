import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { getUserFromRequest } from "@/lib/auth-token";

export const dynamic = "force-dynamic";

// Type for lean user query result
type UserLean = {
  _id: mongoose.Types.ObjectId | string;
  username?: string;
  name: string;
  avatar?: string;
};

/**
 * Get following list for a user
 *
 * GET /api/users/[username]/following
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Check if user is authenticated (supports both token and session auth)
    const authUser = await getUserFromRequest(request);

    if (!authUser?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find the user
    const user = await User.findOne({ username }).select("following");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get following IDs
    const followingIds = user.following || [];

    if (followingIds.length === 0) {
      return NextResponse.json({
        following: [],
        count: 0,
      });
    }

    // Fetch following user details
    const following = await User.find({
      _id: { $in: followingIds },
    }).select("_id username name avatar").lean();

    // Transform to response format
    const followingList = following.map((followedUser) => {
      const user = followedUser as unknown as UserLean;
      return {
        id: user._id?.toString() || "",
        username: user.username || "",
        name: user.name || "",
        avatar: user.avatar || undefined,
      };
    });

    return NextResponse.json({
      following: followingList,
      count: followingList.length,
    });
  } catch (error: unknown) {
    console.error("Following fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch following",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
