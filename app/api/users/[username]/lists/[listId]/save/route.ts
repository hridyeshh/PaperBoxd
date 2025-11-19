import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { auth } from "@/lib/auth";

/**
 * Save a shared list to the current user's lists
 *
 * POST /api/users/[username]/lists/[listId]/save
 * Body: {} (no body needed, uses authenticated user)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;

    if (!username || !listId) {
      return NextResponse.json(
        { error: "Username and listId are required" },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the list owner
    const listOwner = await User.findOne({ username });
    if (!listOwner) {
      return NextResponse.json({ error: "List owner not found" }, { status: 404 });
    }

    // Find the list
    const sharedList = listOwner.readingLists.find(
      (l) => l._id?.toString() === listId || l._id?.toString() === listId.toString()
    );

    if (!sharedList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Find the current user (who wants to save the list)
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has this list saved
    const existingList = currentUser.readingLists.find(
      (l) => l.title === sharedList.title && l.description?.includes(`from @${username}`)
    );

    if (existingList) {
      return NextResponse.json(
        { error: "List already saved", listId: existingList._id },
        { status: 400 }
      );
    }

    // Create a copy of the list with creator attribution
    const savedList = {
      title: sharedList.title,
      description: sharedList.description 
        ? `${sharedList.description} (from @${username})`
        : `List from @${username}`,
      books: [...sharedList.books], // Copy book references
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    currentUser.readingLists.push(savedList);
    await currentUser.save();

    const newList = currentUser.readingLists[currentUser.readingLists.length - 1];

    return NextResponse.json({
      message: "List saved successfully",
      list: {
        id: newList._id,
        title: newList.title,
        description: newList.description,
        booksCount: newList.books?.length || 0,
      },
    });
  } catch (error) {
    console.error("Save list error:", error);
    return NextResponse.json(
      {
        error: "Failed to save list",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Remove a saved list from the current user's lists
 *
 * DELETE /api/users/[username]/lists/[listId]/save
 * (username and listId refer to the current user and their saved list ID)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;

    if (!username || !listId) {
      return NextResponse.json(
        { error: "Username and listId are required" },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the current user (who wants to remove the saved list)
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the username matches the logged-in user
    if (currentUser.username !== username) {
      return NextResponse.json(
        { error: "Unauthorized - You can only remove your own saved lists" },
        { status: 403 }
      );
    }

    // Find the saved list in the user's lists
    const listIndex = currentUser.readingLists.findIndex(
      (l) => l._id?.toString() === listId || l._id?.toString() === listId.toString()
    );

    if (listIndex === -1) {
      return NextResponse.json({ error: "Saved list not found" }, { status: 404 });
    }

    const savedList = currentUser.readingLists[listIndex];

    // Verify this is a saved list (has "from @" in description)
    if (!savedList.description || !savedList.description.includes("from @")) {
      return NextResponse.json(
        { error: "This is not a saved list" },
        { status: 400 }
      );
    }

    // Remove the saved list
    currentUser.readingLists.splice(listIndex, 1);
    await currentUser.save();

    return NextResponse.json({
      message: "List removed successfully",
    });
  } catch (error) {
    console.error("Remove saved list error:", error);
    return NextResponse.json(
      {
        error: "Failed to remove saved list",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

