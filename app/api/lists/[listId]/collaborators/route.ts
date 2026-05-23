import { NextResponse } from "next/server";
import { listsApi } from "@/lib/api/endpoints";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params;
  const { action } = await request.json();

  if (!listId || !action) {
    return NextResponse.json({ error: "Missing listId or action" }, { status: 400 });
  }

  if (action === "reject") {
    return NextResponse.json({ success: true });
  }

  const { status } = await listsApi.acceptCollaboration(listId);
  if (status >= 400) {
    return NextResponse.json({ error: "Internal Server Error" }, { status });
  }

  return NextResponse.json({ success: true });
}
