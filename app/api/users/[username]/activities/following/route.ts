import { NextRequest, NextResponse } from "next/server";
import { activityApi } from "@/lib/api/endpoints";

// Maps Go snake_case ActivityResponse to the camelCase shape the frontend expects.
function transformActivity(a: Record<string, unknown>) {
  const type = (a.activity_type as string) || "";

  // Determine the human-readable action + detail
  let action = "";
  let detail = (a.book_title as string | null) ?? null;

  switch (type) {
    case "added_book":
      action = "added to their shelf";
      break;
    case "read":
      action = "finished reading";
      break;
    case "started_reading":
      action = "started reading";
      break;
    case "rated":
      action = "rated";
      break;
    case "liked":
      action = "liked";
      break;
    case "reviewed":
    case "diary_entry":
      action = detail ? "wrote about" : "wrote";
      break;
    case "created_list":
      action = "created a list";
      detail = (a.list_title as string | null) ?? null;
      break;
    case "shared_list":
      action = "shared their list";
      detail = (a.list_title as string | null) ?? null;
      break;
    case "collaboration_request":
      action = "invited you to collaborate on";
      detail = (a.list_title as string | null) ?? null;
      break;
    case "granted_access":
      action = "granted you access to";
      detail = (a.list_title as string | null) ?? null;
      break;
    case "followed":
      action = "started following you";
      detail = null;
      break;
    case "liked_diary_entry":
      action = "liked your note on";
      detail = (a.entry_title as string | null) ?? null;
      break;
    default:
      action = type.replace(/_/g, " ");
  }

  return {
    _id: a.id,
    type,
    username: a.username,
    userName: a.name,
    userAvatar: a.avatar_url,
    timestamp: a.created_at,
    bookId: a.book_id,
    bookTitle: a.book_title,
    bookSlug: a.book_slug,
    listId: a.list_id,
    listTitle: a.list_title,
    diaryEntryId: a.entry_id,
    subject: a.entry_title,
    targetUsername: a.target_username,
    // Pre-computed for the frontend formatActivity / render path
    action,
    detail,
  };
}

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
