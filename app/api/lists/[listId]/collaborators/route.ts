import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export async function POST(
  request: Request,
  { params }: { params: { listId: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = params;
  const { userId, action } = await request.json();

  if (!userId || !action) {
    return NextResponse.json(
      { error: "Missing userId or action" },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the list owner by finding the user who has this list
    const listOwner = await User.findOne({
      "readingLists._id": listId
    });

    if (!listOwner) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const list = listOwner.readingLists.find(
      (l: any) => l._id?.toString() === listId
    );

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "accept") {
      // Add user to collaborators if not already there
      if (!list.collaborators) {
        list.collaborators = [];
      }
      const userIdObj = user._id as any;
      if (!list.collaborators.some((id: any) => id.toString() === userIdObj.toString())) {
        list.collaborators.push(userIdObj);
        await listOwner.save();
      }
    }

    // Remove the collaboration_request activity
    user.activities = user.activities.filter(
      (activity: any) =>
        !(
          activity.type === "collaboration_request" &&
          activity.listId?.toString() === listId
        )
    );
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling collaboration request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}