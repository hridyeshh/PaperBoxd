import { NextRequest, NextResponse } from "next/server";
import { listsApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  const { username, listId } = await context.params;

  const { data, status } = await listsApi.saveList(username, listId);

  if (status >= 400) {
    const err = data as { error?: { message?: string }; message?: string };
    return NextResponse.json(
      { error: extractGoError(err, "Failed to save list") },
      { status }
    );
  }

  return NextResponse.json({ message: "List saved successfully" });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  const { username, listId } = await context.params;

  const { data, status } = await listsApi.unsaveList(username, listId);

  if (status >= 400) {
    const err = data as { error?: { message?: string }; message?: string };
    return NextResponse.json(
      { error: extractGoError(err, "Failed to remove list") },
      { status }
    );
  }

  return NextResponse.json({ message: "List removed successfully" });
}
