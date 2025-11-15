import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

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

    // Search for users by username or name (case-insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: query.trim(), $options: "i" } },
        { name: { $regex: query.trim(), $options: "i" } },
      ],
    })
      .select("username name avatar")
      .limit(limit)
      .lean();

    const usersList = users.map((user: any) => ({
      id: user._id?.toString() || "",
      username: user.username || "",
      name: user.name || "",
      avatar: user.avatar || undefined,
    }));

    return NextResponse.json({
      users: usersList,
      count: usersList.length,
    });
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

