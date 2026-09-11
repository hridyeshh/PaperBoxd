import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/api/endpoints";

/**
 * Operator-only maintenance trigger (cron / manual curl).
 *
 * Fails closed: both CLEANUP_SECRET (caller → this route) and INTERNAL_SECRET
 * (this route → Go /admin) must be set. The Go side gates /api/v1/admin/* on
 * X-Internal-Secret, not on a user token, so this must never forward the
 * browser session.
 */
export async function DELETE(request: NextRequest) {
  const cleanupSecret = process.env.CLEANUP_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!cleanupSecret || !internalSecret) {
    return NextResponse.json({ error: "Cleanup is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cleanupSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, status } = await goFetch(`/api/v1/admin/cleanup-books`, {
    method: "DELETE",
    headers: { "X-Internal-Secret": internalSecret },
  });

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
    message: "Use DELETE with Authorization: Bearer <CLEANUP_SECRET> to trigger cleanup.",
    totalBooks: null,
  });
}
