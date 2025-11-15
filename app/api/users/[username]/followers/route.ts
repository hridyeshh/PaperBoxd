import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { auth } from "@/lib/auth";

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

    // Check if user is authenticated
    const session = await auth();

    if (!session?.user?.email) {
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
    const followersList = followers.map((follower: any) => ({
      id: follower._id?.toString() || "",
      username: follower.username || "",
      name: follower.name || "",
      avatar: follower.avatar || undefined,
    }));

    return NextResponse.json({
      followers: followersList,
      count: followersList.length,
    });
  } catch (error) {
    console.error("Followers fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch followers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
