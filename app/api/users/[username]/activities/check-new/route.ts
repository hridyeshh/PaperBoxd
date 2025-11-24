import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import type { IActivity, IDiaryEntry } from "@/lib/db/models/User";
import mongoose from "mongoose";

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

    // Type for activity objects (can be Mongoose subdocument or plain object)
    type ActivityObject = IActivity & {
      _id?: mongoose.Types.ObjectId | string;
      createdAt?: Date;
      toObject?: () => IActivity & { _id?: mongoose.Types.ObjectId | string; createdAt?: Date };
    };

    type DiaryEntryObject = IDiaryEntry & {
      _id?: mongoose.Types.ObjectId | string;
      createdAt?: Date;
      updatedAt?: Date;
    };

    // Activity with timestamp as number (for sorting/comparison)
    type ActivityWithTimestamp = Omit<ActivityObject, 'timestamp'> & {
      timestamp: number; // Override timestamp to be number instead of Date
    };

    // Collect all activities from followed users
    const allActivities: ActivityWithTimestamp[] = [];

    // First, add shared_list and collaboration_request activities from the current user's activities array
    // (These are lists that were shared TO the current user or collaboration requests sent TO the current user)
    const currentUserActivities = Array.isArray(user.activities) ? user.activities : [];
    console.log(`[check-new] Current user has ${currentUserActivities.length} total activities`);
    
    // Helper to get activity type (handles Mongoose subdocuments)
    const getActivityType = (activity: ActivityObject): string | null => {
      if (activity.type) return activity.type;
      if (activity.toObject) {
        const obj = activity.toObject();
        return obj.type || null;
      }
      return null;
    };
    
    const activityTypes = currentUserActivities.map((a) => getActivityType(a)).filter(Boolean);
    console.log(`[check-new] Activity types: ${activityTypes.join(", ")}`);
    
    const sharedListActivities = currentUserActivities.filter((activity) =>
      getActivityType(activity) === "shared_list"
    );
    const collaborationRequestActivities = currentUserActivities.filter((activity) =>
      getActivityType(activity) === "collaboration_request"
    );
    const sharedBookActivities = currentUserActivities.filter((activity) =>
      getActivityType(activity) === "shared_book"
    );
    const grantedAccessActivities = currentUserActivities.filter((activity) =>
      getActivityType(activity) === "granted_access"
    );
    
    console.log(`[check-new] Found ${sharedListActivities.length} shared_list, ${collaborationRequestActivities.length} collaboration_request, ${sharedBookActivities.length} shared_book, and ${grantedAccessActivities.length} granted_access activities`);

    sharedListActivities.forEach((activity) => {
      // Convert Mongoose subdocument to plain object if needed
      const activityWithMethods = activity as ActivityObject;
      const activityObj: ActivityObject = activityWithMethods.toObject ? activityWithMethods.toObject() : {
        _id: activityWithMethods._id,
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

    collaborationRequestActivities.forEach((activity) => {
      // Convert Mongoose subdocument to plain object if needed
      const activityWithMethods = activity as ActivityObject;
      const activityObj: ActivityObject = activityWithMethods.toObject ? activityWithMethods.toObject() : {
        _id: activityWithMethods._id,
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
    sharedBookActivities.forEach((activity) => {
      const activityWithMethods = activity as ActivityObject;
      const activityObj: ActivityObject = activityWithMethods.toObject ? activityWithMethods.toObject() : {
        _id: activityWithMethods._id,
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
    grantedAccessActivities.forEach((activity) => {
      const activityWithMethods = activity as ActivityObject;
      const activityObj: ActivityObject = activityWithMethods.toObject ? activityWithMethods.toObject() : {
        _id: activityWithMethods._id,
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

    // Type for lean user query result
    type FollowedUserLean = {
      _id: mongoose.Types.ObjectId | string;
      username: string;
      name: string;
      activities?: (IActivity & { _id?: mongoose.Types.ObjectId | string })[];
      diaryEntries?: DiaryEntryObject[];
    };

    followedUsers.forEach((followedUser) => {
      // Cast to our expected type
      const user = followedUser as unknown as FollowedUserLean;
      // Add regular activities
      const activities = Array.isArray(user.activities) ? user.activities : [];
      // Filter out shared_list, collaboration_request, shared_book, and granted_access (handled separately above)
      // Note: "search" is not a valid activity type, so we don't need to filter it
      const filteredActivities = activities.filter((activity) =>
        activity.type !== "shared_list" && 
        activity.type !== "collaboration_request" &&
        activity.type !== "shared_book" &&
        activity.type !== "granted_access"
      );
      
      filteredActivities.forEach((activity) => {
        const activityWithTimestamp = activity as ActivityObject;
        const activityTimestamp = activityWithTimestamp.timestamp 
          ? new Date(activityWithTimestamp.timestamp).getTime() 
          : activityWithTimestamp.createdAt 
          ? new Date(activityWithTimestamp.createdAt).getTime() 
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
        } as ActivityWithTimestamp);
      });

      // Add diary entries as activities
      const diaryEntries = Array.isArray(user.diaryEntries) ? user.diaryEntries : [];
      diaryEntries.forEach((entry: DiaryEntryObject) => {
        const entryDate = entry.updatedAt ? new Date(entry.updatedAt) : (entry.createdAt ? new Date(entry.createdAt) : new Date());
        const entryTimestamp = entryDate.getTime();
        
        // If lastViewed is provided, only count entries newer than that
        if (lastViewed) {
          const lastViewedTime = new Date(lastViewed).getTime();
          if (entryTimestamp <= lastViewedTime) {
            return; // Skip this entry, it's not new
          }
        }
        
        // Create a diary entry activity (not a standard IActivity type)
        allActivities.push({
          type: "diary_entry" as IActivity['type'] | "diary_entry",
          timestamp: entryTimestamp,
          _id: entry._id,
        } as ActivityWithTimestamp);
      });
    });

    // Count new activities
    const count = allActivities.length;
    const hasNewActivities = count > 0;
    
    const collaborationRequestCount = allActivities.filter((a) => {
      const type = a.type;
      return type === "collaboration_request";
    }).length;
    
    const grantedAccessCount = allActivities.filter((a) => {
      const type = a.type;
      return type === "granted_access";
    }).length;
    
    const sharedBookCount = allActivities.filter((a) => {
      const type = a.type;
      return type === "shared_book";
    }).length;
    
    // Helper to get activity type string (handles diary_entry which is not in IActivity type)
    const getActivityTypeString = (a: ActivityWithTimestamp): string => {
      return a.type as string;
    };
    
    console.log(`[check-new] Returning: hasNewActivities=${hasNewActivities}, count=${count}`);
    console.log(`[check-new] Breakdown: shared_list=${allActivities.filter(a => getActivityTypeString(a) === "shared_list").length}, collaboration_request=${collaborationRequestCount}, shared_book=${sharedBookCount}, granted_access=${grantedAccessCount}, diary_entry=${allActivities.filter(a => getActivityTypeString(a) === "diary_entry").length}, other=${allActivities.filter(a => !["shared_list", "collaboration_request", "shared_book", "granted_access", "diary_entry"].includes(getActivityTypeString(a))).length}`);

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

