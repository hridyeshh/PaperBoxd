// Maps the Go ActivityResponse (snake_case) to the camelCase shape every web
// surface renders (feed, popover, home rails, community strip). The `action`
// string is the single place activity verbs are chosen — clients prefer it
// over re-deriving from `type`.

export type WebActivity = ReturnType<typeof transformActivity>;

function stars(metadata: unknown): string {
  const rating = (metadata as { rating?: number } | null | undefined)?.rating;
  return typeof rating === "number" && rating > 0 ? ` ${"★".repeat(Math.min(5, rating))}` : "";
}

export function transformActivity(a: Record<string, unknown>) {
  const type = (a.activity_type as string) || "";
  const metadata = (a.metadata as Record<string, unknown> | null | undefined) ?? null;

  // Determine the human-readable action + detail
  let action = "";
  let detail = (a.book_title as string | null) ?? null;

  switch (type) {
    case "added_book":
      action = "added to their shelf";
      break;
    case "finished_reading":
    case "read":
      action = `finished${stars(metadata)}`;
      break;
    case "started_reading":
      action = "started reading";
      break;
    case "wants_to_read":
      action = "wants to read";
      break;
    case "rated":
      action = `rated${stars(metadata)}`;
      break;
    case "liked":
      action = "liked";
      break;
    case "reviewed":
    case "diary_entry":
    case "created_thought":
      action = detail ? "wrote about" : "wrote";
      if (!detail) detail = (a.thought_title as string | null) ?? null;
      break;
    case "created_list":
      action = "created a list";
      detail = (a.list_title as string | null) ?? null;
      break;
    case "shared_list":
      action = "shared their list";
      detail = (a.list_title as string | null) ?? null;
      break;
    case "shared_book":
      action = "shared";
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
    case "liked_thought":
      action = "liked your thought on";
      detail = (a.thought_title as string | null) ?? (a.book_title as string | null) ?? null;
      break;
    case "reposted_thought":
      action = "reposted your thought on";
      detail = (a.thought_title as string | null) ?? (a.book_title as string | null) ?? null;
      break;
    case "fusion_joined":
      // The story is app-only; the web just says it happened.
      action = "fused with you. Open PaperBoxd on your phone to see your Fusion";
      detail = null;
      break;
    default:
      action = type.replace(/_/g, " ");
  }

  return {
    _id: a.id as string,
    type,
    username: a.username as string,
    userName: a.name as string | undefined,
    userAvatar: (a.avatar_url as string | null) ?? null,
    timestamp: a.created_at as string,
    bookId: (a.book_id as string | null) ?? null,
    bookTitle: (a.book_title as string | null) ?? null,
    bookSlug: (a.book_slug as string | null) ?? null,
    bookCover: (a.book_cover as string | null) ?? null,
    listId: (a.list_id as string | null) ?? null,
    listTitle: (a.list_title as string | null) ?? null,
    diaryEntryId: (a.thought_id as string | null) ?? null,
    subject: (a.thought_title as string | null) ?? null,
    targetUsername: (a.target_username as string | null) ?? null,
    rating: (metadata?.rating as number | undefined) ?? undefined,
    // Pre-computed for the frontend formatActivity / render path
    action,
    detail,
  };
}

export function timeAgo(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  const t = new Date(timestamp).getTime();
  if (isNaN(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
