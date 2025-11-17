import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
    const session = await auth();

    if (!session?.user?.email) {
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

    // Find the user
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = user._id;
    const userEmail = user.email;
    const username = user.username;

    // Save deletion reason to database before deleting the account
    try {
      await AccountDeletion.create({
        email: userEmail,
        username: username,
        reasons: reasons,
        deletedAt: new Date(),
      });
      console.log(`[Delete Account] Saved deletion record for user: ${userEmail}`);
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
      { following: userId },
      { $pull: { following: userId } }
    );

    // Remove user from all following users' followers lists
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );

    // Delete the user account
    await User.findByIdAndDelete(userId);

    console.log(`[Delete Account] Successfully deleted user: ${session.user.email}`);

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

