import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import {
  getBookByISBN,
  transformISBNdbBook,
} from "@/lib/api/isbndb";
import {
  getOpenLibraryWork,
  transformOpenLibraryBook,
} from "@/lib/api/open-library";

/**
 * Get a single reading list
 *
 * GET /api/users/[username]/lists/[listId]
 */
export async function GET(
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

    await connectDB();

    // Check authentication to determine if user is the owner
    const session = await auth();
    const isOwner = session?.user?.email ? (await User.findOne({ email: session.user.email }))?.username === username : false;

    const user = await User.findOne({ username })
      .select("readingLists email")
      .populate({
        path: "readingLists.books",
        model: Book,
        select: "volumeInfo",
      });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const list = user.readingLists.find(
      (l) => l._id?.toString() === listId || l._id?.toString() === listId.toString()
    );

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // If list is private and user is not the owner, check if they have access
    if (!list.isPublic && !isOwner) {
      const currentUser = session?.user?.email ? await User.findOne({ email: session.user.email }).select("username").lean() : null;
      const currentUsername = currentUser?.username;
      
      // Check if current user has been granted access
      const hasAccess = currentUsername && Array.isArray(list.allowedUsers) && list.allowedUsers.includes(currentUsername);
      
      if (!hasAccess) {
        return NextResponse.json({ 
          error: "This list is private",
          isPrivate: true,
          ownerUsername: username,
        }, { status: 403 });
      }
    }

    return NextResponse.json({
      list: {
        id: list._id,
        title: list.title,
        description: list.description,
        books: list.books || [],
        booksCount: list.books?.length || 0,
        isPublic: list.isPublic,
        allowedUsers: Array.isArray(list.allowedUsers) ? list.allowedUsers : [],
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get list error:", error);
    return NextResponse.json(
      {
        error: "Failed to get reading list",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Update a reading list (add/remove books)
 *
 * PUT /api/users/[username]/lists/[listId]
 * Body: {
 *   bookId?: string,        // MongoDB _id
 *   isbndbId?: string,      // ISBN-10 or ISBN-13
 *   openLibraryId?: string, // Open Library ID
 *   action: "add" | "remove"
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const body = await request.json();
    const { bookId, isbndbId, openLibraryId, action = "add" } = body;

    if (!username || !listId) {
      return NextResponse.json(
        { error: "Username and listId are required" },
        { status: 400 }
      );
    }

    if (action === "add" && !bookId && !isbndbId && !openLibraryId) {
      return NextResponse.json(
        { error: "bookId, isbndbId, or openLibraryId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const listIndex = user.readingLists.findIndex(
      (l) => l._id?.toString() === listId || l._id?.toString() === listId.toString()
    );

    if (listIndex === -1) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const list = user.readingLists[listIndex];

    // Check if this is a saved list (has "from @" in description) - prevent editing
    if (list.description && list.description.includes("from @")) {
      return NextResponse.json(
        { error: "Cannot edit saved lists. This list was saved from another user." },
        { status: 403 }
      );
    }

    if (action === "add") {
      // Find or create the book
      let bookIdObj: mongoose.Types.ObjectId;

      if (bookId) {
        // Use existing book ID
        if (!mongoose.Types.ObjectId.isValid(bookId)) {
          return NextResponse.json(
            { error: "Invalid bookId format" },
            { status: 400 }
          );
        }
        bookIdObj = new mongoose.Types.ObjectId(bookId);
      } else {
        // Need to find or create book from ISBNdb or Open Library
        let book = null;

        if (isbndbId) {
          // Try to find existing book by ISBNdb ID
          book = await Book.findOne({ isbndbId });
          if (!book) {
            // Fetch from ISBNdb API
            const isbndbBook = await getBookByISBN(isbndbId);
            if (isbndbBook) {
              const transformedBook = transformISBNdbBook(isbndbBook);
              book = new Book(transformedBook);
              await book.save();
            }
          }
        } else if (openLibraryId) {
          // Try to find existing book by Open Library ID
          book = await Book.findOne({ openLibraryId });
          if (!book) {
            // Fetch from Open Library API
            const olBook = await getOpenLibraryWork(openLibraryId);
            if (olBook) {
              const transformedBook = transformOpenLibraryBook(olBook);
              book = new Book(transformedBook);
              await book.save();
            }
          }
        }

        if (!book) {
          return NextResponse.json(
            { error: "Book not found" },
            { status: 404 }
          );
        }

        bookIdObj = book._id as mongoose.Types.ObjectId;
      }

      // Check if book is already in the list
      const bookExists = list.books.some(
        (b) => b.toString() === bookIdObj.toString()
      );

      if (!bookExists) {
        list.books.push(bookIdObj);
        list.updatedAt = new Date();
        await user.save();
      }
    } else if (action === "remove") {
      if (!bookId) {
        return NextResponse.json(
          { error: "bookId is required for remove action" },
          { status: 400 }
        );
      }

      list.books = list.books.filter(
        (b) => b.toString() !== bookId.toString()
      );
      list.updatedAt = new Date();
      await user.save();
    }

    // Populate books for response
    await user.populate({
      path: "readingLists.books",
      model: Book,
      select: "volumeInfo",
    });

    const updatedList = user.readingLists[listIndex];

    return NextResponse.json({
      message: `Book ${action === "add" ? "added to" : "removed from"} list successfully`,
      list: {
        id: updatedList._id,
        title: updatedList.title,
        description: updatedList.description,
        books: updatedList.books || [],
        booksCount: updatedList.books?.length || 0,
        isPublic: updatedList.isPublic,
        createdAt: updatedList.createdAt,
        updatedAt: updatedList.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update list error:", error);
    return NextResponse.json(
      {
        error: "Failed to update reading list",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Update a reading list (title, description, isPublic)
 *
 * PATCH /api/users/[username]/lists/[listId]
 * Body: {
 *   title?: string,
 *   description?: string,
 *   isPublic?: boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await context.params;
    const body = await request.json();
    const { title, description, isPublic } = body;

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

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the authenticated user owns the list
    if (user.email !== session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized - You can only edit your own lists" },
        { status: 403 }
      );
    }

    const listIndex = user.readingLists.findIndex(
      (l) => l._id?.toString() === listId || l._id?.toString() === listId.toString()
    );

    if (listIndex === -1) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const list = user.readingLists[listIndex];

    // Check if this is a saved list (has "from @" in description) - prevent editing
    if (list.description && list.description.includes("from @")) {
      return NextResponse.json(
        { error: "Cannot edit saved lists. This list was saved from another user." },
        { status: 403 }
      );
    }

    // Update fields if provided
    if (title !== undefined) {
      list.title = title;
    }
    if (description !== undefined) {
      list.description = description;
    }
    if (isPublic !== undefined) {
      list.isPublic = isPublic;
    }
    list.updatedAt = new Date();

    await user.save();

    return NextResponse.json({
      message: "List updated successfully",
      list: {
        id: list._id,
        title: list.title,
        description: list.description,
        books: list.books || [],
        booksCount: list.books?.length || 0,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update list error:", error);
    return NextResponse.json(
      {
        error: "Failed to update reading list",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a reading list
 *
 * DELETE /api/users/[username]/lists/[listId]
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

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the authenticated user owns the list
    if (user.email !== session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own lists" },
        { status: 403 }
      );
    }

    const listIndex = user.readingLists.findIndex(
      (l) => l._id?.toString() === listId || l._id?.toString() === listId.toString()
    );

    if (listIndex === -1) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const list = user.readingLists[listIndex];
    const listTitle = list.title;

    // Remove the list from the owner
    user.readingLists.splice(listIndex, 1);
    await user.save();

    // Find all users who have saved this list (lists with "from @username" in description)
    const savedListPattern = new RegExp(`from @${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    const usersWithSavedList = await User.find({
      "readingLists.description": savedListPattern,
    });

    // Remove the saved list from all users who saved it
    for (const savedUser of usersWithSavedList) {
      const savedListIndex = savedUser.readingLists.findIndex(
        (l) => l.description && savedListPattern.test(l.description) && l.title === listTitle
      );
      
      if (savedListIndex !== -1) {
        savedUser.readingLists.splice(savedListIndex, 1);
        await savedUser.save();
      }
    }

    return NextResponse.json({
      message: "List deleted successfully",
    });
  } catch (error) {
    console.error("Delete list error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete reading list",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

