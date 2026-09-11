import { NextRequest, NextResponse } from "next/server";
import { activityApi } from "@/lib/api/endpoints";
import { transformActivity } from "@/lib/activity-transform";

export async function GET(
  request: NextRequest,
  _context: { params: Promise<Record<string, string>> }
) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    const { data, status } = await activityApi.getFollowingActivities(page, pageSize);
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status >= 400) return NextResponse.json({ error: "Failed to fetch activities" }, { status });

    const payload = data as { activities?: Record<string, unknown>[]; page?: number; total_pages?: number } | null;
    const transformed = Array.isArray(payload?.activities)
      ? payload.activities.map(transformActivity)
      : [];

    return NextResponse.json({
      activities: transformed,
      page: payload?.page ?? page,
      totalPages: payload?.total_pages ?? 1,
    });
  } catch (error) {
    console.error("Following activities error:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
