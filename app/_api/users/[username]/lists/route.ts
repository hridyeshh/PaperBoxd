import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import mongoose from "mongoose";
import { getUserFromRequest } from "@/lib/auth-token";

export const dynamic = "force-dynamic";

/**
 * Create a new reading list
 *
 * POST /api/users/[username]/lists
 * Body: {
 *   title: string,
 *   description?: string,
 *   books?: string[], // Array of book IDs (ISBNdb IDs or Open Library IDs)
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

    console.log("[Create List] Request Body:", body);

    if (!username || !title) {
      console.log("[Create List] Missing username or title");
      return NextResponse.json(
        { error: "Username and title are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();
    console.log("[Create List] DB Connected");

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      console.log(`[Create List] User not found: ${username}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log(`[Create List] Found user: ${user.username}`);

    // Create new reading list
    // Books will be stored as strings initially, converted to ObjectIds when needed
    const newList = {
      title,
      description,
      books: books.map((id: string) => {
        // Try to convert to ObjectId if it's a valid MongoDB ObjectId string
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          // If not a valid ObjectId, keep as string (could be ISBNdb ID, Open Library ID, etc.)
          return id;
        }
      }),
      isPublic,
      collaborators: [], // Empty for now - collaborator feature not implemented
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    user.readingLists.push(newList);
    await user.save();
    console.log("[Create List] User saved with new list");

    // Get the created list ID
    const createdList = user.readingLists[user.readingLists.length - 1];
    const listId = createdList._id?.toString() || "";

    if (!listId) {
      console.error("[Create List] Failed to get list ID after creation");
      return NextResponse.json(
        { error: "Failed to create list - could not get list ID" },
        { status: 500 }
      );
    }
    console.log(`[Create List] Created list with ID: ${listId}`);

    return NextResponse.json(
      {
        message: "Reading list created successfully",
        list: createdList,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Create List] Error:", error);
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

    // Check authentication to determine if user is the owner
    const authUser = await getUserFromRequest(request);
    const currentUser = authUser?.id ? await User.findById(authUser.id).select("username").lean() : null;
    const isOwner = currentUser?.username === username;

    // Find user
    const user = await User.findOne({ username })
      .select("readingLists email")
      .populate("readingLists.books", "volumeInfo");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Filter lists: if not owner, return public lists OR private lists the user has access to
    let filteredLists;
    if (isOwner) {
      filteredLists = user.readingLists;
    } else {
      const currentUsername = currentUser?.username;
      filteredLists = user.readingLists.filter((list) => {
        // Include public lists
        if (list.isPublic) return true;
        // Include private lists if user has been granted access
        if (currentUsername && Array.isArray(list.allowedUsers) && list.allowedUsers.includes(currentUsername)) {
          return true;
        }
        return false;
      });
    }

    return NextResponse.json({
      lists: filteredLists.map((list) => ({
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
