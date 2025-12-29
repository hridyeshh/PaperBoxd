import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import AccountDeletion from "@/lib/db/models/AccountDeletion";

/**
 * Delete user account and all associated data
 *
 * DELETE /api/users/delete-account
 * Body: { reasons: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Support both Bearer token (mobile) and NextAuth session (web)
    let userEmail: string | null = null;
    let userId: string | null = null;
    
    // Try Bearer token first (for mobile apps)
    const authUser = await getUserFromRequest(request);
    if (authUser) {
      userEmail = authUser.email;
      userId = authUser.id;
      console.log('[Delete Account] Authenticated via Bearer token:', { userId, userEmail });
    } else {
      // Fall back to NextAuth session (for web)
      const session = await auth();
      if (session?.user?.email) {
        userEmail = session.user.email;
        userId = session.user.id;
        console.log('[Delete Account] Authenticated via NextAuth session:', { userId, userEmail });
      }
    }

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reasons } = body;

    if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
      return NextResponse.json(
        { error: "Deletion reasons are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the user by email (more reliable than ID for cross-platform)
    const user = await User.findOne({ email: userEmail.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userMongoId = user._id;
    const userEmailFromDB = user.email;
    const username = user.username;

    // Save deletion reason to database before deleting the account
    try {
      await AccountDeletion.create({
        email: userEmailFromDB,
        username: username,
        reasons: reasons,
        deletedAt: new Date(),
      });
      console.log(`[Delete Account] Saved deletion record for user: ${userEmailFromDB}`);
    } catch (error) {
      console.error("[Delete Account] Failed to save deletion record:", error);
      // Continue with deletion even if saving the record fails
      // This ensures the user can still delete their account
    }

    // Delete all user's books from their collections
    // Note: We don't delete the Book documents themselves, just the references
    // The books remain in the database for other users

    // Remove user from all followers' following lists
    await User.updateMany(
      { following: userMongoId },
      { $pull: { following: userMongoId } }
    );

    // Remove user from all following users' followers lists
    await User.updateMany(
      { followers: userMongoId },
      { $pull: { followers: userMongoId } }
    );

    // Delete the user account
    await User.findByIdAndDelete(userMongoId);

    console.log(`[Delete Account] Successfully deleted user: ${userEmailFromDB}`);

    return NextResponse.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      {
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

