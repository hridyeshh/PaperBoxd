/**
 * Shared logic: where to send the user after login (matches GET /api/onboarding/status).
 */

export type PostLoginUserPayload = {
  username?: string;
  books_read_count?: number;
  favorites_count?: number;
  lists_count?: number;
  diary_entries_count?: number;
  favorite_genres?: string[];
  created_at?: string;
};

/** Returns pathname to navigate to after successful auth. */
export function getPostLoginRedirectPath(user: PostLoginUserPayload): string {
  const hasUsername = !!user?.username;
  const username = user?.username ?? null;

  const hasActivity =
    (user?.books_read_count ?? 0) > 0 || (user?.favorites_count ?? 0) > 0;

  const hasOnboardingGenres = (user?.favorite_genres?.length ?? 0) > 0;

  const accountAge = user?.created_at
    ? Date.now() - new Date(user.created_at).getTime()
    : Infinity;
  const isRecentlyCreated = accountAge < 24 * 60 * 60 * 1000;

  const completed =
    hasUsername && (hasOnboardingGenres || hasActivity || !isRecentlyCreated);
  const isNewUser = !completed && isRecentlyCreated;

  if (!hasUsername) {
    return "/choose-username";
  }
  if (isNewUser) {
    return "/onboarding";
  }
  if (username) {
    return `/u/${username}`;
  }
  return "/";
}
