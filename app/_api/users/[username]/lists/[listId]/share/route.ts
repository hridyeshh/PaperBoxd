import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { getUserFromRequest } from "@/lib/auth-token";
import mongoose from "mongoose";

/**
 * Share a list to a user (creates an activity for the recipient)
 *
 * POST /api/users/[username]/lists/[listId]/share
 * Body: {
 *   targetUsername: string // Username of the user to share with
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const body = await request.json();
    const { targetUsername } = body;

    if (!username || !listId || !targetUsername) {
      return NextResponse.json(
        { error: "Username, listId, and targetUsername are required" },
        { status: 400 }
      );
    }

    // Check authentication (supports both token and session auth)
    const authUser = await getUserFromRequest(request);
    if (!authUser?.id) {
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
    const listOwnerId = listOwner._id?.toString();
    if (listOwnerId !== authUser.id) {
      return NextResponse.json(
        { error: "Unauthorized - You can only share your own lists" },
        { status: 403 }
      );
    }

    // Find the list
    const list = listOwner.readingLists.find(
      (l) => {
        if (!l._id) return false;
        const listIdStr = l._id.toString();
        const paramListIdStr = listId.toString();
        return listIdStr === paramListIdStr;
      }
    );

    if (!list) {
      console.error("List not found. listId:", listId, "Available lists:", listOwner.readingLists.map(l => l._id?.toString()));
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Find the target user
    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Check if user is following the list owner (optional check - you might want to remove this)
    // For now, we'll allow sharing to anyone

    // Add activity to target user
    if (!targetUser.activities) {
      targetUser.activities = [];
    }

    // Ensure listId is a string
    const listIdString = listId.toString();

    const newActivity = {
      type: "shared_list" as const,
      listId: listIdString,
      sharedBy: listOwner._id as mongoose.Types.ObjectId,
      sharedByUsername: username,
      timestamp: new Date(),
    };

    targetUser.activities.push(newActivity);

    await targetUser.save();

    console.log(`Successfully shared list ${listIdString} from ${username} to ${targetUsername}`);
    console.log(`Target user now has ${targetUser.activities.length} activities`);

    return NextResponse.json({
      message: "List shared successfully",
      sharedWith: targetUsername,
    });
  } catch (error) {
    console.error("Share list error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      {
        error: "Failed to share list",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

