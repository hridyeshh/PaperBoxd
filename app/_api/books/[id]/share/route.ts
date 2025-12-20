import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { getUserFromRequest } from "@/lib/auth-token";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Share a book to a user (creates an activity for the recipient)
 *
 * POST /api/books/[id]/share
 * Body: {
 *   targetUsername: string // Username of the user to share with
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await context.params;
    console.log("[Share Book API] Received request:", { bookId });

    const body = await request.json();
    const { targetUsername } = body;
    console.log("[Share Book API] Target username:", targetUsername);

    if (!bookId || !targetUsername) {
      return NextResponse.json(
        { error: "bookId and targetUsername are required" },
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

    // Find the current user (sharer)
    const currentUser = await User.findById(authUser.id);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the target user
    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Add activity to target user
    if (!targetUser.activities) {
      targetUser.activities = [];
    }

    // Ensure bookId is a string
    const bookIdString = bookId.toString();

    // Convert bookId to ObjectId if it's a valid MongoDB ObjectId string
    let bookIdObj: mongoose.Types.ObjectId | undefined;
    if (mongoose.Types.ObjectId.isValid(bookIdString)) {
      bookIdObj = new mongoose.Types.ObjectId(bookIdString);
    }

    const newActivity = {
      type: "shared_book" as const,
      bookId: bookIdObj,
      sharedBy: currentUser._id as mongoose.Types.ObjectId,
      sharedByUsername: currentUser.username,
      timestamp: new Date(),
    };

    targetUser.activities.push(newActivity);

    await targetUser.save();

    console.log(`Successfully shared book ${bookIdString} from ${currentUser.username} to ${targetUsername}`);
    console.log(`Target user now has ${targetUser.activities.length} activities`);

    return NextResponse.json({
      message: "Book shared successfully",
      sharedWith: targetUsername,
    });
  } catch (error) {
    console.error("Share book error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      {
        error: "Failed to share book",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

