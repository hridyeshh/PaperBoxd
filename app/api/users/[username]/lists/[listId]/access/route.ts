import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import type { IReadingList } from "@/lib/db/models/User";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// Type for reading list with allowedUsers (can be Mongoose subdocument)
type ReadingListWithAccess = IReadingList & {
  allowedUsers?: string[];
  markModified?: (path: string) => void;
};

// Type for lean user query result
type UserLean = {
  _id: mongoose.Types.ObjectId | string;
  username?: string;
  name: string;
  avatar?: string;
};

/**
 * Grant or revoke access to a private list
 *
 * POST /api/users/[username]/lists/[listId]/access
 * Body: {
 *   username: string, // Username to grant/revoke access for
 *   action: "grant" | "revoke"
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const body = await request.json();
    const { targetUsername, action } = body;

    if (!username || !listId || !targetUsername || !action) {
      return NextResponse.json(
        { error: "Username, listId, targetUsername, and action are required" },
        { status: 400 }
      );
    }

    if (action !== "grant" && action !== "revoke") {
      return NextResponse.json(
        { error: "Action must be 'grant' or 'revoke'" },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the list owner
    const listOwner = await User.findOne({ username });
    if (!listOwner) {
      return NextResponse.json({ error: "List owner not found" }, { status: 404 });
    }

    // Verify the authenticated user owns the list
    if (listOwner.email !== session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized - You can only manage access to your own lists" },
        { status: 403 }
      );
    }

    // Find the list index
    const listIndex = listOwner.readingLists.findIndex(
      (l) => {
        if (!l._id) return false;
        const listIdStr = l._id.toString();
        const paramListIdStr = listId.toString();
        return listIdStr === paramListIdStr;
      }
    );

    if (listIndex === -1) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const list = listOwner.readingLists[listIndex];

    // Only allow access management for private lists
    if (list.isPublic) {
      return NextResponse.json(
        { error: "Access management is only available for private lists" },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Prevent owner from granting access to themselves
    if (targetUser._id?.toString() === listOwner._id?.toString()) {
      return NextResponse.json(
        { error: "You cannot grant access to yourself" },
        { status: 400 }
      );
    }

    // Cast list to type with allowedUsers
    const listWithAccess = list as ReadingListWithAccess;
    
    // Initialize allowedUsers array if it doesn't exist
    if (!Array.isArray(listWithAccess.allowedUsers)) {
      listWithAccess.allowedUsers = [];
    }

    if (action === "grant") {
      // Grant access if not already granted
      const allowedUsersArray = Array.isArray(listWithAccess.allowedUsers) ? listWithAccess.allowedUsers : [];
      if (!allowedUsersArray.includes(targetUsername)) {
        // Ensure listId is a string
        const listIdString = listId.toString();

        // Update the list - use direct assignment to ensure Mongoose tracks the change
        listWithAccess.allowedUsers = [...allowedUsersArray, targetUsername];
        list.updatedAt = new Date();
        
        // Mark the readingLists array as modified to ensure Mongoose saves the nested array changes
        listOwner.markModified('readingLists');
        
        try {
          await listOwner.save();
        } catch (saveError) {
          console.error("Error saving listOwner:", saveError);
          throw saveError;
        }

        // Create activity notification for the target user (NOT the owner)
        // Re-fetch targetUser to ensure we have the latest document
        // IMPORTANT: Use targetUsername (User B), NOT username (User A - the owner)
        const freshTargetUser = await User.findOne({ username: targetUsername });
        if (!freshTargetUser) {
          console.error(`Target user ${targetUsername} not found after saving list`);
          return NextResponse.json({ error: "Target user not found" }, { status: 404 });
        }

        // Double-check we're not accidentally using the owner
        if (freshTargetUser._id?.toString() === listOwner._id?.toString()) {
          console.error(`ERROR: Attempted to add activity to owner instead of target user!`);
          console.error(`Owner: ${username} (${listOwner.email}), Target: ${targetUsername} (${freshTargetUser.email})`);
          return NextResponse.json(
            { error: "Cannot add activity to owner" },
            { status: 500 }
          );
        }

        // Verify the target user's username matches what we expect
        if (freshTargetUser.username !== targetUsername) {
          console.error(`ERROR: Username mismatch! Expected ${targetUsername}, got ${freshTargetUser.username}`);
          return NextResponse.json(
            { error: "Target user username mismatch" },
            { status: 500 }
          );
        }

        console.log(`[GRANT ACCESS] Adding activity to TARGET USER: ${targetUsername} (${freshTargetUser.email})`);
        console.log(`[GRANT ACCESS] Owner is: ${username} (${listOwner.email})`);
        console.log(`[GRANT ACCESS] Target user ID: ${freshTargetUser._id}, Owner ID: ${listOwner._id}`);

        if (!freshTargetUser.activities) {
          freshTargetUser.activities = [];
        }

        const newActivity = {
          type: "granted_access" as const,
          listId: listIdString,
          listTitle: list.title,
          sharedBy: listOwner._id as mongoose.Types.ObjectId,
          sharedByUsername: username, // This is User A (the owner who granted access)
          timestamp: new Date(),
        };

        const activitiesBefore = freshTargetUser.activities.length;
        freshTargetUser.activities.push(newActivity);
        
        // Mark the activities array as modified to ensure Mongoose saves the change
        freshTargetUser.markModified('activities');
        
        try {
          const savedUser = await freshTargetUser.save();
          const activitiesAfter = savedUser.activities?.length || 0;
          console.log(`[GRANT ACCESS] Successfully saved activity to ${targetUsername}`);
          console.log(`[GRANT ACCESS] Activities before: ${activitiesBefore}, after: ${activitiesAfter}`);
          console.log(`[GRANT ACCESS] Saved user email: ${savedUser.email}, username: ${savedUser.username}`);
          console.log(`[GRANT ACCESS] Activity added to target user ${targetUsername} (${savedUser.email}), NOT owner ${username} (${listOwner.email})`);
        } catch (saveError) {
          console.error("[GRANT ACCESS] Error saving targetUser:", saveError);
          throw saveError;
        }
      }
      return NextResponse.json({
        message: `Access granted to @${targetUsername}`,
        allowedUsers: listWithAccess.allowedUsers || [],
      });
    } else {
      // Revoke access
      const allowedUsersArray = Array.isArray(listWithAccess.allowedUsers) ? listWithAccess.allowedUsers : [];
      const index = allowedUsersArray.indexOf(targetUsername);
      if (index > -1) {
        // Update the list - use direct assignment to ensure Mongoose tracks the change
        listWithAccess.allowedUsers = allowedUsersArray.filter((u: string) => u !== targetUsername);
        list.updatedAt = new Date();
        
        // Mark the readingLists array as modified to ensure Mongoose saves the nested array changes
        listOwner.markModified('readingLists');
        
        try {
          await listOwner.save();
        } catch (saveError) {
          console.error("Error saving listOwner during revoke:", saveError);
          throw saveError;
        }
      }
      return NextResponse.json({
        message: `Access revoked from @${targetUsername}`,
        allowedUsers: listWithAccess.allowedUsers || [],
      });
    }
  } catch (error: unknown) {
    console.error("Manage access error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      {
        error: "Failed to manage access",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Get list of users who have access to a private list
 *
 * GET /api/users/[username]/lists/[listId]/access
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;

    if (!username || !listId) {
      return NextResponse.json(
        { error: "Username and listId are required" },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the list owner
    const listOwner = await User.findOne({ username });
    if (!listOwner) {
      return NextResponse.json({ error: "List owner not found" }, { status: 404 });
    }

    // Verify the authenticated user owns the list
    if (listOwner.email !== session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized - You can only view access for your own lists" },
        { status: 403 }
      );
    }

    // Find the list index
    const listIndex = listOwner.readingLists.findIndex(
      (l) => {
        if (!l._id) return false;
        const listIdStr = l._id.toString();
        const paramListIdStr = listId.toString();
        return listIdStr === paramListIdStr;
      }
    );

    if (listIndex === -1) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const list = listOwner.readingLists[listIndex];

    // Get user details for allowed users
    const allowedUsers = Array.isArray(list.allowedUsers) ? list.allowedUsers : [];
    const usersWithAccess = await User.find({ username: { $in: allowedUsers } })
      .select("username name avatar")
      .lean();

    return NextResponse.json({
      allowedUsers: usersWithAccess.map((user) => {
        const userLean = user as unknown as UserLean;
        return {
          username: userLean.username,
          name: userLean.name,
          avatar: userLean.avatar,
        };
      }),
    });
  } catch (error: unknown) {
    console.error("Get access list error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to get access list",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

