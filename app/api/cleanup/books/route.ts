import { NextRequest, NextResponse } from "next/server";
import { adminApi } from "@/lib/api/endpoints";

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cleanupSecret = process.env.CLEANUP_SECRET;
  if (cleanupSecret && authHeader !== `Bearer ${cleanupSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, status } = await adminApi.cleanupBooks();

  if (status >= 400) {
    return NextResponse.json({ error: "Failed to clean up books" }, { status });
  }

  const result = data as { deleted?: number; message?: string } | null;
  return NextResponse.json({
    message: result?.message ?? "Cleanup completed",
    deletedCount: result?.deleted ?? 0,
  });
}

export async function GET() {
  return NextResponse.json({
    message: "Use DELETE to trigger cleanup. Stats are managed by the Go backend.",
    totalBooks: null,
  });
}
