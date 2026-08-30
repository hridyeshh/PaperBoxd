import { NextRequest, NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

// PATCH /api/users/me/visibility — flip the account between public and private.
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.isPublic !== "boolean") {
      return NextResponse.json({ error: "isPublic is required" }, { status: 400 });
    }

    const { data, status } = await goFetchAuthed("/api/v1/users/me/visibility", {
      method: "PATCH",
      body: JSON.stringify({ is_public: body.isPublic }),
    });

    if (status >= 400) {
      return NextResponse.json({ error: "Failed to update visibility" }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Update visibility error:", error);
    return NextResponse.json({ error: "Failed to update visibility" }, { status: 500 });
  }
}
