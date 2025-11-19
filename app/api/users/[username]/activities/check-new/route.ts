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

    // Find the user (don't use lean() to ensure activities subdocuments are properly accessible)
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

    // Ensure activities array is properly loaded
    if (!user.activities) {
      user.activities = [];
    }
    
    console.log(`[check-new] User ${username} has ${user.activities.length} activities in database`);

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

    // First, add shared_list and collaboration_request activities from the current user's activities array
    // (These are lists that were shared TO the current user or collaboration requests sent TO the current user)
    const currentUserActivities = Array.isArray(user.activities) ? user.activities : [];
    console.log(`[check-new] Current user has ${currentUserActivities.length} total activities`);
    
    // Helper to get activity type (handles Mongoose subdocuments)
    const getActivityType = (activity: any) => {
      if (activity.type) return activity.type;
      if (activity.toObject) {
        const obj = activity.toObject();
        return obj.type;
      }
      return null;
    };
    
    const activityTypes = currentUserActivities.map((a: any) => getActivityType(a)).filter(Boolean);
    console.log(`[check-new] Activity types: ${activityTypes.join(", ")}`);
    
    const sharedListActivities = currentUserActivities.filter((activity: any) =>
      getActivityType(activity) === "shared_list"
    );
    const collaborationRequestActivities = currentUserActivities.filter((activity: any) =>
      getActivityType(activity) === "collaboration_request"
    );
    const sharedBookActivities = currentUserActivities.filter((activity: any) =>
      getActivityType(activity) === "shared_book"
    );
    const grantedAccessActivities = currentUserActivities.filter((activity: any) =>
      getActivityType(activity) === "granted_access"
    );
    
    console.log(`[check-new] Found ${sharedListActivities.length} shared_list, ${collaborationRequestActivities.length} collaboration_request, ${sharedBookActivities.length} shared_book, and ${grantedAccessActivities.length} granted_access activities`);

    sharedListActivities.forEach((activity: any) => {
      // Convert Mongoose subdocument to plain object if needed
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        listId: activity.listId,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      const activityTimestamp = activityObj.timestamp
        ? new Date(activityObj.timestamp).getTime()
        : activityObj.createdAt
        ? new Date(activityObj.createdAt).getTime()
        : 0;

      // If lastViewed is provided, only count activities newer than that
      if (lastViewed) {
        const lastViewedTime = new Date(lastViewed).getTime();
        if (activityTimestamp <= lastViewedTime) {
          return; // Skip this activity, it's not new
        }
      }

      allActivities.push({
        ...activityObj,
        timestamp: activityTimestamp,
      });
    });

    collaborationRequestActivities.forEach((activity: any) => {
      // Convert Mongoose subdocument to plain object if needed
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        listId: activity.listId,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      const activityTimestamp = activityObj.timestamp
        ? new Date(activityObj.timestamp).getTime()
        : activityObj.createdAt
        ? new Date(activityObj.createdAt).getTime()
        : 0;

      // If lastViewed is provided, only count activities newer than that
      if (lastViewed) {
        const lastViewedTime = new Date(lastViewed).getTime();
        if (activityTimestamp <= lastViewedTime) {
          return; // Skip this activity, it's not new
        }
      }

      allActivities.push({
        ...activityObj,
        timestamp: activityTimestamp,
      });
    });

    // Add shared_book activities from current user's activities
    sharedBookActivities.forEach((activity: any) => {
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        bookId: activity.bookId,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      const activityTimestamp = activityObj.timestamp
        ? new Date(activityObj.timestamp).getTime()
        : activityObj.createdAt
        ? new Date(activityObj.createdAt).getTime()
        : 0;

      if (lastViewed) {
        const lastViewedTime = new Date(lastViewed).getTime();
        if (activityTimestamp <= lastViewedTime) {
          return;
        }
      }

      allActivities.push({
        ...activityObj,
        timestamp: activityTimestamp,
      });
    });

    // Add granted_access activities from current user's activities
    grantedAccessActivities.forEach((activity: any) => {
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        listId: activity.listId,
        listTitle: activity.listTitle,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      const activityTimestamp = activityObj.timestamp
        ? new Date(activityObj.timestamp).getTime()
        : activityObj.createdAt
        ? new Date(activityObj.createdAt).getTime()
        : 0;

      console.log(`[check-new] Processing granted_access activity: timestamp=${activityTimestamp}, lastViewed=${lastViewed ? new Date(lastViewed).getTime() : 'null'}`);

      if (lastViewed) {
        const lastViewedTime = new Date(lastViewed).getTime();
        if (activityTimestamp <= lastViewedTime) {
          console.log(`[check-new] Skipping granted_access activity - not new (${activityTimestamp} <= ${lastViewedTime})`);
          return;
        }
      }

      console.log(`[check-new] Adding granted_access activity to allActivities`);
      allActivities.push({
        ...activityObj,
        timestamp: activityTimestamp,
      });
    });

    followedUsers.forEach((followedUser: any) => {
      // Add regular activities
      const activities = Array.isArray(followedUser.activities) ? followedUser.activities : [];
      // Filter out search-related activities, shared_list, collaboration_request, shared_book, and granted_access (handled separately above)
      const filteredActivities = activities.filter((activity: any) =>
        activity.type !== "search" && 
        activity.type !== "shared_list" && 
        activity.type !== "collaboration_request" &&
        activity.type !== "shared_book" &&
        activity.type !== "granted_access"
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
    
    const collaborationRequestCount = allActivities.filter((a: any) => {
      const type = a.type || (a.toObject ? a.toObject().type : null);
      return type === "collaboration_request";
    }).length;
    
    const grantedAccessCount = allActivities.filter((a: any) => {
      const type = a.type || (a.toObject ? a.toObject().type : null);
      return type === "granted_access";
    }).length;
    
    const sharedBookCount = allActivities.filter((a: any) => {
      const type = a.type || (a.toObject ? a.toObject().type : null);
      return type === "shared_book";
    }).length;
    
    console.log(`[check-new] Returning: hasNewActivities=${hasNewActivities}, count=${count}`);
    console.log(`[check-new] Breakdown: shared_list=${allActivities.filter(a => (a.type || (a.toObject ? a.toObject().type : null)) === "shared_list").length}, collaboration_request=${collaborationRequestCount}, shared_book=${sharedBookCount}, granted_access=${grantedAccessCount}, diary_entry=${allActivities.filter(a => (a.type || (a.toObject ? a.toObject().type : null)) === "diary_entry").length}, other=${allActivities.filter(a => !["shared_list", "collaboration_request", "shared_book", "granted_access", "diary_entry"].includes(a.type || (a.toObject ? a.toObject().type : null))).length}`);

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

