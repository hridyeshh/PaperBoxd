import { NextRequest, NextResponse } from "next/server";
import { listsApi } from "@/lib/api/endpoints";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  const { listId } = await context.params;
  const body = await request.json();
  const { action } = body;

  if (!listId || !action) {
    return NextResponse.json(
      { error: "listId and action are required" },
      { status: 400 }
    );
  }

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json(
      { error: "Action must be 'accept' or 'reject'" },
      { status: 400 }
    );
  }

  if (action === "reject") {
    return NextResponse.json({ message: "Collaboration request rejected successfully", action });
  }

  const { status } = await listsApi.acceptCollaboration(listId);
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to process collaboration request" }, { status });
  }

  return NextResponse.json({ message: "Collaboration request accepted successfully", action });
}
