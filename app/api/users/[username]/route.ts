import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book"; // Import Book model to register it with Mongoose

/**
 * Get user profile by username
 *
 * GET /api/users/[username]
 */
export async function GET(
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

    // Connect to database
    await connectDB();

    // Find user by username
    const user = await User.findOne({ username })
      .select("-password") // Exclude password
      .populate("readingLists.books", "volumeInfo.title volumeInfo.authors volumeInfo.imageLinks");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    return NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        birthday: user.birthday,
        gender: user.gender,
        pronouns: user.pronouns,
        links: user.links,
        isPublic: user.isPublic,

        // Books & Reading
        topBooks: user.topBooks,
        favoriteBooks: user.favoriteBooks,
        bookshelf: user.bookshelf,
        likedBooks: user.likedBooks,
        tbrBooks: user.tbrBooks,
        currentlyReading: user.currentlyReading,
        readingLists: user.readingLists,

        // Social
        followersCount: user.followers.length,
        followingCount: user.following.length,

        // Stats
        totalBooksRead: user.totalBooksRead,
        totalPagesRead: user.totalPagesRead,
        readingGoal: user.readingGoal,
        authorsRead: user.authorsRead,

        // Activity
        recentActivities: user.activities.slice(-20).reverse(), // Last 20 activities

        // Metadata
        createdAt: user.createdAt,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    console.error("User fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Update user profile
 *
 * PATCH /api/users/[username]
 * Body: { name?, bio?, avatar?, pronouns?, links?, isPublic?, etc. }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle username change separately to enforce uniqueness
    if (body.username && body.username !== user.username) {
      if (typeof body.username !== "string" || body.username.length < 3 || body.username.length > 30) {
        return NextResponse.json(
          { error: "Username must be between 3 and 30 characters" },
          { status: 400 }
        );
      }

      const existingUsername = await User.findOne({ username: body.username });
      if (existingUsername) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        );
      }

      user.username = body.username;
    }

    // Normalize arrays - ensure pronouns is always an array
    if (body.pronouns !== undefined) {
      if (typeof body.pronouns === "string") {
        // If it's a string, convert to array (split by comma if needed, or empty array if empty string)
        body.pronouns = body.pronouns.trim() ? body.pronouns.split(",").map((p: string) => p.trim()).filter(Boolean) : [];
      } else if (!Array.isArray(body.pronouns)) {
        body.pronouns = [];
      } else {
        // Filter out empty strings from array
        body.pronouns = body.pronouns.filter((p: string) => p && typeof p === "string" && p.trim().length > 0);
      }
    }
    
    // Normalize links
    if (body.links !== undefined) {
      if (typeof body.links === "string") {
        body.links = body.links.trim() ? body.links.split(",").map((l: string) => l.trim()).filter(Boolean) : [];
      } else if (!Array.isArray(body.links)) {
        body.links = [];
      } else {
        // Filter out empty strings from array
        body.links = body.links.filter((l: string) => l && typeof l === "string" && l.trim().length > 0);
      }
    }

    // Update allowed fields
    const allowedFields = [
      "name",
      "bio",
      "avatar",
      "birthday",
      "gender",
      "pronouns",
      "links",
      "isPublic",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        (user as any)[field] = body[field];
      }
    });

    await user.save();

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        birthday: user.birthday,
        gender: user.gender,
        pronouns: user.pronouns,
        links: user.links,
        isPublic: user.isPublic,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
