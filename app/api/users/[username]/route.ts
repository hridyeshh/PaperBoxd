import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import type { IActivity } from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book"; // Import Book model to register it with Mongoose
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// Type for activity from MongoDB (includes _id and createdAt)
type ActivityFromDB = IActivity & {
  _id?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
};

// Type for activity with _id and book info
type ActivityWithBook = IActivity & {
  _id?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  bookTitle?: string;
  bookCover?: string;
};

// Type for reading list with allowedUsers
type ReadingListWithAccess = {
  _id?: mongoose.Types.ObjectId | string;
  title: string;
  description?: string;
  books: mongoose.Types.ObjectId[];
  isPublic: boolean;
  allowedUsers?: string[];
  collaborators?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

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

    // Check authentication to determine if user is the owner
    const session = await auth();
    const currentUser = session?.user?.email ? await User.findOne({ email: session.user.email }).select("username").lean() : null;
    const isOwner = currentUser?.username === username;

    // Find user by username with optional populate
    // IMPORTANT: Don't use .lean() yet - we need to check the raw Mongoose document first
    let user;
    try {
      user = await User.findOne({ username })
        .select("-password"); // Exclude password
      
      // Try to populate readingLists.books if user exists
      if (user) {
        try {
          await user.populate({
          path: "readingLists.books",
          select: "volumeInfo.title volumeInfo.authors volumeInfo.imageLinks",
          model: "Book",
        });
    } catch (populateError) {
          console.warn("Failed to populate readingLists.books:", populateError);
        }
      }
    } catch (error) {
      console.error("Error finding user:", error);
      user = null;
    }
    
    // Convert to plain object AFTER all operations
    const userPlain = user ? user.toObject() : null;

    if (!user || !userPlain) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Debug: Log raw user data from database BEFORE processing
    console.log(`[User API] ✅ Found user: ${userPlain.username || userPlain.email}`);
    console.log(`[User API] Raw user._id:`, userPlain._id?.toString());
    console.log(`[User API] Raw followers (type: ${typeof userPlain.followers}, isArray: ${Array.isArray(userPlain.followers)}, length: ${Array.isArray(userPlain.followers) ? userPlain.followers.length : 'N/A'}):`, JSON.stringify(userPlain.followers));
    console.log(`[User API] Raw following (type: ${typeof userPlain.following}, isArray: ${Array.isArray(userPlain.following)}, length: ${Array.isArray(userPlain.following) ? userPlain.following.length : 'N/A'}):`, JSON.stringify(userPlain.following));
    console.log(`[User API] Raw bookshelf (type: ${typeof userPlain.bookshelf}, isArray: ${Array.isArray(userPlain.bookshelf)}, length: ${Array.isArray(userPlain.bookshelf) ? userPlain.bookshelf.length : 'N/A'}):`, Array.isArray(userPlain.bookshelf) ? `${userPlain.bookshelf.length} items` : 'not an array');
    console.log(`[User API] Raw avatar:`, userPlain.avatar ? `${userPlain.avatar.substring(0, 50)}...` : 'null/undefined');
    console.log(`[User API] User object keys:`, Object.keys(userPlain).slice(0, 20));

    // Update lastActive separately using updateOne
    try {
      await User.updateOne(
        { _id: user._id },
        { $set: { lastActive: new Date() } }
      );
    } catch (saveError) {
      console.warn("Failed to update lastActive:", saveError);
      // Continue even if save fails - this is not critical
    }

    // Use userPlain (plain object) instead of user (Mongoose document)
    // Safely extract arrays and handle undefined values
    const activities = (Array.isArray(userPlain.activities) ? userPlain.activities : []) as ActivityFromDB[];
    const followers = Array.isArray(userPlain.followers) ? userPlain.followers : [];
    const following = Array.isArray(userPlain.following) ? userPlain.following : [];
    
    console.log(`[User API] After extraction - followers: ${followers.length}, following: ${following.length}, bookshelf: ${Array.isArray(userPlain.bookshelf) ? userPlain.bookshelf.length : 0}`);

    // Populate activities with book information
    const activitiesWithBooks = await Promise.all(
      activities.slice(-20).reverse().map(async (activity): Promise<ActivityWithBook> => {
        // Ensure timestamp is preserved (don't default to new Date() as it creates "Just now")
        const activityData: ActivityWithBook = {
          _id: activity._id,
          type: activity.type,
          bookId: activity.bookId,
          timestamp: activity.timestamp || activity.createdAt || undefined,
          rating: activity.rating,
        };
        
        if (activity.bookId) {
          try {
            // Convert bookId to ObjectId if it's a string
            const bookId = activity.bookId?.toString ? activity.bookId.toString() : activity.bookId;
            const book = await Book.findById(bookId).lean();
            if (book) {
              activityData.bookTitle = book.volumeInfo?.title || undefined;
              activityData.bookCover = book.volumeInfo?.imageLinks?.thumbnail || 
                        book.volumeInfo?.imageLinks?.smallThumbnail ||
                        book.volumeInfo?.imageLinks?.medium ||
                        undefined;
            }
          } catch (error) {
            console.warn(`Failed to fetch book for activity ${activity._id}:`, error);
          }
        }
        return activityData;
      })
    );

    return NextResponse.json({
      user: {
        id: userPlain._id?.toString() || userPlain._id,
        username: userPlain.username,
        name: userPlain.name,
        email: userPlain.email,
        avatar: userPlain.avatar,
        bio: userPlain.bio,
        birthday: userPlain.birthday,
        gender: userPlain.gender,
        pronouns: Array.isArray(userPlain.pronouns) ? userPlain.pronouns : [],
        links: Array.isArray(userPlain.links) ? userPlain.links : [],
        isPublic: userPlain.isPublic,

        // Books & Reading
        topBooks: Array.isArray(userPlain.topBooks) ? userPlain.topBooks : [],
        favoriteBooks: Array.isArray(userPlain.favoriteBooks) ? userPlain.favoriteBooks : [],
        bookshelf: Array.isArray(userPlain.bookshelf) ? userPlain.bookshelf : [],
        likedBooks: Array.isArray(userPlain.likedBooks) ? userPlain.likedBooks : [],
        tbrBooks: Array.isArray(userPlain.tbrBooks) ? userPlain.tbrBooks : [],
        currentlyReading: Array.isArray(userPlain.currentlyReading) ? userPlain.currentlyReading : [],
        // Filter reading lists: if not owner, return public lists OR private lists the user has access to
        readingLists: Array.isArray(userPlain.readingLists) 
          ? (isOwner 
              ? userPlain.readingLists 
              : (() => {
                  const currentUsername = currentUser?.username;
                  return userPlain.readingLists.filter((list) => {
                    const listWithAccess = list as unknown as ReadingListWithAccess;
                    // Include public lists
                    if (listWithAccess.isPublic !== false) return true;
                    // Include private lists if user has been granted access
                    if (currentUsername && Array.isArray(listWithAccess.allowedUsers) && listWithAccess.allowedUsers.includes(currentUsername)) {
                      return true;
                    }
                    return false;
                  });
                })())
          : [],
        diaryEntries: Array.isArray(userPlain.diaryEntries) ? userPlain.diaryEntries : [],

        // Social
        followers: followers.map((id) => id.toString()),
        following: following.map((id) => id.toString()),
        followersCount: followers.length,
        followingCount: following.length,

        // Stats
        totalBooksRead: userPlain.totalBooksRead ?? 0,
        totalPagesRead: userPlain.totalPagesRead ?? 0,
        readingGoal: userPlain.readingGoal ?? null,
        authorsRead: Array.isArray(userPlain.authorsRead) ? userPlain.authorsRead : [],

        // Activity - with populated book information
        recentActivities: activitiesWithBooks,

        // Metadata
        createdAt: userPlain.createdAt,
        lastActive: userPlain.lastActive,
      },
    });
  } catch (error) {
    console.error("User fetch error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
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
    // TEMPORARILY DISABLED: Avatar storage to prevent cookie size issues
    // TODO: Implement proper image upload/storage solution (e.g., Cloudinary, S3)
    // if (body.avatar !== undefined) {
    //   if (typeof body.avatar === "string" && body.avatar.trim().length > 0) {
    //     // Save the avatar (base64 data URL or URL string)
    //     user.avatar = body.avatar;
    //   } else if (body.avatar === "" || body.avatar === null) {
    //     // Empty string or null means remove avatar, set to undefined
    //     user.avatar = undefined;
    //   }
    //   // If avatar is undefined in body, don't update (preserve existing)
    // }

    // Update other allowed fields
    const otherAllowedFields = [
      "name",
      "bio",
      "birthday",
      "gender",
      "pronouns",
      "links",
    ];

    // Type-safe field updates
    type UserUpdateFields = {
      name?: string;
      bio?: string;
      birthday?: Date;
      gender?: string;
      pronouns?: string[];
      links?: string[];
    };
    
    const updateFields: UserUpdateFields = {};
    otherAllowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateFields[field as keyof UserUpdateFields] = body[field];
      }
    });
    
    // Apply updates
    if (updateFields.name !== undefined) user.name = updateFields.name;
    if (updateFields.bio !== undefined) user.bio = updateFields.bio;
    if (updateFields.birthday !== undefined) user.birthday = updateFields.birthday;
    if (updateFields.gender !== undefined) user.gender = updateFields.gender;
    if (updateFields.pronouns !== undefined) user.pronouns = updateFields.pronouns;
    if (updateFields.links !== undefined) user.links = updateFields.links;

    // Always set isPublic to true (all profiles are public)
    user.isPublic = true;

    await user.save();

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar || undefined, // Return existing avatar or undefined
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
