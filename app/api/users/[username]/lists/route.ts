import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

/**
 * Create a new reading list
 *
 * POST /api/users/[username]/lists
 * Body: {
 *   title: string,
 *   description?: string,
 *   books?: string[], // Array of Google Books IDs
 *   isPublic?: boolean
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const { title, description, books = [], isPublic = true } = body;

    if (!username || !title) {
      return NextResponse.json(
        { error: "Username and title are required" },
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

    // Create new reading list
    user.readingLists.push({
      title,
      description,
      books: books.map((id: string) => id as any), // Convert to ObjectId in practice
      isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await user.save();

    return NextResponse.json(
      {
        message: "Reading list created successfully",
        list: user.readingLists[user.readingLists.length - 1],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create list error:", error);
    return NextResponse.json(
      {
        error: "Failed to create reading list",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get user's reading lists
 *
 * GET /api/users/[username]/lists
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    // Connect to database
    await connectDB();

    // Find user
    const user = await User.findOne({ username })
      .select("readingLists")
      .populate("readingLists.books", "volumeInfo");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      lists: user.readingLists.map((list) => ({
        id: list._id,
        title: list.title,
        description: list.description,
        booksCount: list.books.length,
        books: list.books,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get lists error:", error);
    return NextResponse.json(
      {
        error: "Failed to get reading lists",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
