import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book";
import { auth } from "@/lib/auth";

/**
 * Get activities from users that the logged-in user follows
 *
 * GET /api/users/[username]/activities/following?page=1&pageSize=20
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

    // Check if user is authenticated
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find the logged-in user
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the username matches the logged-in user
    if (currentUser.username !== username) {
      return NextResponse.json(
        { error: "Unauthorized - Can only fetch your own following activities" },
        { status: 403 }
      );
    }

    // Get following IDs
    const followingIds = currentUser.following || [];

    if (followingIds.length === 0) {
      return NextResponse.json({
        activities: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Fetch activities from all followed users
    const followedUsers = await User.find({
      _id: { $in: followingIds },
    })
      .select("_id username name avatar activities")
      .lean();

    // Collect all activities from followed users
    const allActivities: any[] = [];

    followedUsers.forEach((user: any) => {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      // Filter out any search-related activities if they exist
      const filteredActivities = activities.filter((activity: any) => 
        activity.type !== "search"
      );
      filteredActivities.forEach((activity: any) => {
        allActivities.push({
          ...activity,
          userId: user._id.toString(),
          username: user.username,
          userName: user.name || user.username,
          userAvatar: user.avatar,
        });
      });
    });

    // Sort by timestamp (newest first)
    allActivities.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    // Apply pagination
    const total = allActivities.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedActivities = allActivities.slice(startIndex, endIndex);

    // Populate activities with book information
    const activitiesWithBooks = await Promise.all(
      paginatedActivities.map(async (activity: any) => {
        if (activity.bookId) {
          try {
            // Convert bookId to ObjectId if it's a string
            const bookId = activity.bookId?.toString ? activity.bookId.toString() : activity.bookId;
            const book = await Book.findById(bookId).lean();
            if (book) {
              return {
                ...activity,
                bookTitle: book.volumeInfo?.title || undefined,
                bookCover: book.volumeInfo?.imageLinks?.thumbnail || 
                          book.volumeInfo?.imageLinks?.smallThumbnail ||
                          book.volumeInfo?.imageLinks?.medium ||
                          undefined,
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch book for activity ${activity._id}:`, error);
          }
        }
        return activity;
      })
    );

    return NextResponse.json({
      activities: activitiesWithBooks,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Following activities fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch following activities",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

