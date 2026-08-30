import { NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

type Ctx = { params: Promise<{ username: string }> };

// POST accepts a pending follow request; DELETE declines it.
export async function POST(_request: Request, { params }: Ctx) {
  return forward(await params, "POST");
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return forward(await params, "DELETE");
}

async function forward({ username }: { username: string }, method: "POST" | "DELETE") {
  try {
    const { data, status } = await goFetchAuthed(
      `/api/v1/users/me/follow-requests/${encodeURIComponent(username)}`,
      { method }
    );
    if (status >= 400) {
      return NextResponse.json({ error: "Failed to update follow request" }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Follow request action error:", error);
    return NextResponse.json({ error: "Failed to update follow request" }, { status: 500 });
  }
}
