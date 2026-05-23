import { NextRequest, NextResponse } from "next/server";
import { userApi } from "@/lib/api/endpoints";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") ?? searchParams.get("query") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("limit") ?? "20");

    if (!q) {
      return NextResponse.json({ users: [], total: 0 });
    }

    const { data, status } = await userApi.search(q, page, pageSize);
    if (status >= 400) {
      return NextResponse.json({ error: "Failed to search users" }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
