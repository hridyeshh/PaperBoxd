import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") ?? searchParams.get("query") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("maxResults") ?? searchParams.get("pageSize") ?? "20");

    if (!q) {
      return NextResponse.json({ kind: "books#volumes", totalItems: 0, items: [] });
    }

    const { data, status } = await bookApi.search(q, page, pageSize);
    if (status >= 400) {
      return NextResponse.json({ error: "Failed to search books" }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Book search error:", error);
    return NextResponse.json({ error: "Failed to search books" }, { status: 500 });
  }
}
