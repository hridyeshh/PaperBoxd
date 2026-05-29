import { NextRequest, NextResponse } from "next/server";
import { userApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const { data, status } = await userApi.follow(username);

    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: extractGoError(err, "Failed") }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Failed to follow user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const { data, status } = await userApi.unfollow(username);

    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json({ error: extractGoError(err, "Failed") }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json({ error: "Failed to unfollow user" }, { status: 500 });
  }
}
