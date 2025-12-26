import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

/**
 * Mobile API: Get current user profile
 * 
 * GET /api/mobile/v1/profile
 * Headers: Authorization: Bearer <token>
 * 
 * Returns: User profile data matching iOS UserProfile model
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Use our JWT helper (Bearer Token) - bypasses NextAuth session logic
    const authUser = await getUserFromRequest(req);
    
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: "Invalid Mobile Session" },
        { status: 401 }
      );
    }

    const user = await User.findById(authUser.id)
      .select("-password -__v")
      .lean();
      
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return a clean object exactly as the iOS UserProfile model expects
    // The backend already converts _id to id, so we match that format
    return NextResponse.json({
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        birthday: user.birthday,
        gender: user.gender,
        pronouns: Array.isArray(user.pronouns) ? user.pronouns : [],
        links: Array.isArray(user.links) ? user.links : [],
        isPublic: user.isPublic ?? true,
        
        // Books & Reading
        topBooks: Array.isArray(user.topBooks) ? user.topBooks : [],
        favoriteBooks: Array.isArray(user.favoriteBooks) ? user.favoriteBooks : [],
        bookshelf: Array.isArray(user.bookshelf) ? user.bookshelf : [],
        likedBooks: Array.isArray(user.likedBooks) ? user.likedBooks : [],
        tbrBooks: Array.isArray(user.tbrBooks) ? user.tbrBooks : [],
        currentlyReading: Array.isArray(user.currentlyReading) ? user.currentlyReading : [],
        readingLists: Array.isArray(user.readingLists) ? user.readingLists : [],
        
        // Statistics
        totalBooksRead: user.totalBooksRead ?? 0,
        totalPagesRead: user.totalPagesRead ?? 0,
        followers: Array.isArray(user.followers) ? user.followers.map((id) => String(id)) : [],
        following: Array.isArray(user.following) ? user.following.map((id) => String(id)) : [],
      },
    });
  } catch (error) {
    console.error("[Mobile Profile API] Error:", error);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}

