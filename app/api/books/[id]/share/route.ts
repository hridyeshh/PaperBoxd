import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await context.params;
  const body = await request.json();
  const { targetUsername } = body;

  if (!bookId || !targetUsername) {
    return NextResponse.json(
      { error: "bookId and targetUsername are required" },
      { status: 400 }
    );
  }

  const { status } = await bookApi.shareBook(bookId, targetUsername);
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to share book" }, { status });
  }

  return NextResponse.json({ message: "Book shared successfully", sharedWith: targetUsername });
}
