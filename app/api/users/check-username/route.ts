import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const { data, status } = await authApi.checkUsername(username);
  return NextResponse.json(data, { status });
}
