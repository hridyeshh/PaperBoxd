import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

/**
 * Check if there are new activities from followed users
 * GET /api/users/[username]/activities/check-new
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { username } = await context.params;
    await connectDB();

    // Find the user
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify the user is requesting their own data
    if (user.email !== session.user.email) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get following list
    const followingIds = Array.isArray(user.following) ? user.following : [];
    
    if (followingIds.length === 0) {
      return NextResponse.json({
        hasNewActivities: false,
        count: 0,
      });
    }

    // Get last viewed timestamp from query params (optional)
    const { searchParams } = new URL(request.url);
    const lastViewedParam = searchParams.get("lastViewed");
    const lastViewed = lastViewedParam ? new Date(lastViewedParam) : null;

    // Fetch activities from all followed users
    const followedUsers = await User.find({
      _id: { $in: followingIds },
    })
      .select("_id username name activities diaryEntries")
      .lean();

    // Collect all activities from followed users
    const allActivities: any[] = [];

    followedUsers.forEach((followedUser: any) => {
      // Add regular activities
      const activities = Array.isArray(followedUser.activities) ? followedUser.activities : [];
      // Filter out search-related activities
      const filteredActivities = activities.filter((activity: any) => 
        activity.type !== "search"
      );
      
      filteredActivities.forEach((activity: any) => {
        const activityTimestamp = activity.timestamp 
          ? new Date(activity.timestamp).getTime() 
          : activity.createdAt 
          ? new Date(activity.createdAt).getTime() 
          : 0;
        
        // If lastViewed is provided, only count activities newer than that
        if (lastViewed) {
          const lastViewedTime = new Date(lastViewed).getTime();
          if (activityTimestamp <= lastViewedTime) {
            return; // Skip this activity, it's not new
          }
        }
        
        allActivities.push({
          ...activity,
          timestamp: activityTimestamp,
        });
      });

      // Add diary entries as activities
      const diaryEntries = Array.isArray(followedUser.diaryEntries) ? followedUser.diaryEntries : [];
      diaryEntries.forEach((entry: any) => {
        const entryDate = entry.updatedAt ? new Date(entry.updatedAt) : (entry.createdAt ? new Date(entry.createdAt) : new Date());
        const entryTimestamp = entryDate.getTime();
        
        // If lastViewed is provided, only count entries newer than that
        if (lastViewed) {
          const lastViewedTime = new Date(lastViewed).getTime();
          if (entryTimestamp <= lastViewedTime) {
            return; // Skip this entry, it's not new
          }
        }
        
        allActivities.push({
          type: "diary_entry",
          timestamp: entryTimestamp,
          _id: entry._id,
        });
      });
    });

    // Count new activities
    const count = allActivities.length;
    const hasNewActivities = count > 0;

    return NextResponse.json({
      hasNewActivities,
      count,
    });
  } catch (error) {
    console.error("Error checking for new activities:", error);
    return NextResponse.json(
      {
        error: "Failed to check for new activities",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

