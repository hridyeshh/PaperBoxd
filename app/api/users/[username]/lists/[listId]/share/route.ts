import { NextRequest, NextResponse } from "next/server";
import { listsApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  const { username, listId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const { targetUsername } = body as { targetUsername?: string };

  if (!targetUsername) {
    return NextResponse.json({ error: "targetUsername is required" }, { status: 400 });
  }

  const { data, status } = await listsApi.shareList(username, listId, [targetUsername]);

  if (status >= 400) {
    const err = data as { error?: { message?: string }; message?: string };
    return NextResponse.json(
      { error: extractGoError(err, "Failed to share list") },
      { status }
    );
  }

  return NextResponse.json({
    message: "List shared successfully",
    sharedWith: targetUsername,
  });
}
