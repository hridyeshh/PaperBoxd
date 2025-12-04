import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { auth } from "@/lib/auth";
import { EventTracker } from "@/lib/services/EventTracker";
import mongoose from "mongoose";

/**
 * Follow/Unfollow a user
 *
 * POST /api/users/[username]/follow
 */
export async function POST(
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

    // Get current user session
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find the target user (the one being followed)
    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the current user (the one doing the following)
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser) {
      return NextResponse.json({ error: "Current user not found" }, { status: 404 });
    }

    // Check if user is trying to follow themselves
    if (currentUser._id?.toString() === targetUser._id?.toString()) {
      return NextResponse.json(
        { error: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if already following
    const isFollowing = currentUser.following.some(
      (id) => id.toString() === targetUser._id?.toString()
    );

    if (isFollowing) {
      // Unfollow: Remove target user from current user's following
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUser._id?.toString()
      );

      // Remove current user from target user's followers
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUser._id?.toString()
      );

      await currentUser.save();
      await targetUser.save();

      // Track unfollow event
      try {
        const eventTracker = new EventTracker();
        if (currentUser._id && targetUser._id) {
          await eventTracker.trackFollow(
            currentUser._id as mongoose.Types.ObjectId,
            targetUser._id as mongoose.Types.ObjectId,
            false
          );
        }
      } catch (error) {
        console.error("Failed to track unfollow event:", error);
        // Don't fail the request if tracking fails
      }

      return NextResponse.json({
        message: "Successfully unfollowed",
        isFollowing: false,
        followersCount: targetUser.followers.length,
        followingCount: currentUser.following.length,
      });
    } else {
      // Follow: Add target user to current user's following
      if (targetUser._id) {
        currentUser.following.push(targetUser._id as mongoose.Types.ObjectId);
      }

      // Add current user to target user's followers
      if (currentUser._id) {
        targetUser.followers.push(currentUser._id as mongoose.Types.ObjectId);
      }

      await currentUser.save();
      await targetUser.save();

      // Track follow event
      try {
        const eventTracker = new EventTracker();
        if (currentUser._id && targetUser._id) {
          await eventTracker.trackFollow(
            currentUser._id as mongoose.Types.ObjectId,
            targetUser._id as mongoose.Types.ObjectId,
            true
          );
        }
      } catch (error) {
        console.error("Failed to track follow event:", error);
        // Don't fail the request if tracking fails
      }

      return NextResponse.json({
        message: "Successfully followed",
        isFollowing: true,
        followersCount: targetUser.followers.length,
        followingCount: currentUser.following.length,
      });
    }
  } catch (error) {
    console.error("Follow/unfollow error:", error);
    return NextResponse.json(
      {
        error: "Failed to follow/unfollow user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
