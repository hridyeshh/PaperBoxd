import { NextRequest, NextResponse } from "next/server";
import { diaryApi } from "@/lib/api/endpoints";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ username: string; entryId: string }> }
) {
  try {
    const { username, entryId } = await context.params;
    const { data, status } = await diaryApi.likeEntry(username, entryId);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: err?.error?.message ?? "Failed to like entry" }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Like diary entry error:", error);
    return NextResponse.json({ error: "Failed to like entry" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ username: string; entryId: string }> }
) {
  try {
    const { username, entryId } = await context.params;
    const { data, status } = await diaryApi.unlikeEntry(username, entryId);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: err?.error?.message ?? "Failed to unlike entry" }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unlike diary entry error:", error);
    return NextResponse.json({ error: "Failed to unlike entry" }, { status: 500 });
  }
}
