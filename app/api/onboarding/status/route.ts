import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

/**
 * GET /api/onboarding/status
 *
 * Check if user has completed onboarding based on Go backend user data.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const hasToken = !!cookieStore.get("pb_access_token")?.value;

    if (!hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user from Go backend
    const { data, status } = await goFetchAuthed("/api/v1/users/me");

    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (status >= 400) {
      return NextResponse.json({ error: "Failed to fetch user" }, { status });
    }

    const user = data as {
      username?: string;
      books_read_count?: number;
      favorites_count?: number;
      lists_count?: number;
      diary_entries_count?: number;
      favorite_genres?: string[];
      created_at?: string;
    };

    const hasUsername = !!user?.username;
    const username = user?.username ?? null;

    const hasActivity =
      (user?.books_read_count ?? 0) > 0 ||
      (user?.favorites_count ?? 0) > 0;

    // The questionnaire persists picks into users.favorite_genres on the Go backend,
    // so a non-empty array is the authoritative "onboarding done" signal.
    const hasOnboardingGenres = (user?.favorite_genres?.length ?? 0) > 0;

    const accountAge = user?.created_at
      ? Date.now() - new Date(user.created_at).getTime()
      : Infinity;
    const isRecentlyCreated = accountAge < 24 * 60 * 60 * 1000;

    const completed =
      hasUsername && (hasOnboardingGenres || hasActivity || !isRecentlyCreated);
    const isNewUser = !completed && isRecentlyCreated;

    return NextResponse.json({
      completed,
      completedAt: completed ? user?.created_at : null,
      hasUsername,
      username,
      isNewUser,
      hasActivity,
      hasOnboardingGenres,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
