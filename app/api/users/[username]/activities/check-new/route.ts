import { NextRequest, NextResponse } from "next/server";
import { activityApi } from "@/lib/api/endpoints";

export async function GET(
  request: NextRequest,
  _context: { params: Promise<{ username: string }> }
) {
  const { searchParams } = new URL(request.url);
  const lastViewed = searchParams.get("lastViewed") ?? undefined;

  const { data, status } = await activityApi.checkNew(lastViewed);

  if (status === 401) {
    // Token expired mid-session — degrade gracefully instead of surfacing 401 to the browser.
    // The polling component already handles !res.ok, but a visible 401 in DevTools is noisy
    // and a failed refresh (race between concurrent requests) should not break the activity badge.
    return NextResponse.json({ hasNewActivities: false, count: 0 });
  }
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to check for new activities" }, { status });
  }

  const result = data as { has_new?: boolean };
  return NextResponse.json({
    hasNewActivities: result?.has_new ?? false,
    count: result?.has_new ? 1 : 0,
  });
}
