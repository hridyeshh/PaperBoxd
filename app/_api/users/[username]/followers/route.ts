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
 * Get followers list for a user
 *
 * GET /api/users/[username]/followers
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
    const user = await User.findOne({ username }).select("followers");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get follower IDs
    const followerIds = user.followers || [];

    if (followerIds.length === 0) {
      return NextResponse.json({
        followers: [],
        count: 0,
      });
    }

    // Fetch follower user details
    const followers = await User.find({
      _id: { $in: followerIds },
    }).select("_id username name avatar").lean();

    // Transform to response format
    const followersList = followers.map((follower) => {
      const user = follower as unknown as UserLean;
      return {
        id: user._id?.toString() || "",
        username: user.username || "",
        name: user.name || "",
        avatar: user.avatar || undefined,
      };
    });

    return NextResponse.json({
      followers: followersList,
      count: followersList.length,
    });
  } catch (error: unknown) {
    console.error("Followers fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch followers",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
