import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import type { IActivity } from "@/lib/db/models/User";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// Type for activity with _id (can be Mongoose subdocument)
type ActivityWithId = IActivity & {
  _id?: mongoose.Types.ObjectId | string;
};

/**
 * Accept or reject a collaboration request
 *
 * POST /api/users/[username]/lists/[listId]/collaborate
 * Body: {
 *   action: "accept" | "reject",
 *   activityId: string // The activity ID to remove after processing
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const body = await request.json();
    const { action, activityId } = body;

    if (!username || !listId || !action || !activityId) {
      return NextResponse.json(
        { error: "Username, listId, action, and activityId are required" },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'reject'" },
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

    // Find the current user (the one accepting/rejecting)
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the activity belongs to the current user
    if (!currentUser.activities || currentUser.activities.length === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const activityIndex = currentUser.activities.findIndex(
      (activity) => {
        const activityWithId = activity as ActivityWithId;
        const activityIdStr = activityWithId._id?.toString() || "";
        return activityIdStr === activityId && 
               activity.type === "collaboration_request" &&
               activity.listId === listId;
      }
    );

    if (activityIndex === -1) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const activity = currentUser.activities[activityIndex];
    const listOwnerUsername = activity.sharedByUsername || username;

    // Find the list owner
    const listOwner = await User.findOne({ username: listOwnerUsername });
    if (!listOwner) {
      return NextResponse.json({ error: "List owner not found" }, { status: 404 });
    }

    // Find the list
    const list = listOwner.readingLists.find(
      (l) => {
        if (!l._id) return false;
        const listIdStr = l._id.toString();
        return listIdStr === listId;
      }
    );

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (action === "accept") {
      // Add current user as collaborator to the list
      if (!list.collaborators) {
        list.collaborators = [];
      }

      const currentUserId = currentUser._id as mongoose.Types.ObjectId;
      if (!list.collaborators.some((id) => {
        const idObj = id as mongoose.Types.ObjectId | string;
        return idObj.toString() === currentUserId.toString();
      })) {
        list.collaborators.push(currentUserId);
        list.updatedAt = new Date();
        await listOwner.save();
      }
    }

    // Remove the activity from current user's activities
    currentUser.activities.splice(activityIndex, 1);
    await currentUser.save();

    return NextResponse.json({
      message: `Collaboration request ${action}ed successfully`,
      action,
    });
  } catch (error: unknown) {
    console.error("Collaboration request error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to process collaboration request",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

