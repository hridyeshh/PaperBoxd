import { NextRequest, NextResponse } from "next/server";
import { userApi } from "@/lib/api/endpoints";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    const { data, status } = await userApi.getFollowing(username, page, pageSize);
    if (status >= 400) return NextResponse.json({ error: "Failed to fetch following" }, { status });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Following error:", error);
    return NextResponse.json({ error: "Failed to fetch following" }, { status: 500 });
  }
}
