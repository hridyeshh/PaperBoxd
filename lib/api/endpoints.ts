/**
 * lib/api/endpoints.ts
 *
 * Server-side proxy helpers for calling the Go backend from Next.js API routes.
 * These functions read the pb_access_token httpOnly cookie and forward requests.
 *
 * Usage (in Next.js route handlers):
 *   import { goFetch, goFetchAuthed } from "@/lib/api/endpoints";
 */

import { cookies } from "next/headers";

const GO_API = process.env.NEXT_PUBLIC_API_URL ?? "https://paperboxd-backend-production-d9e0.up.railway.app";

// ── Core fetch helpers ────────────────────────────────────────────────────────

/** Raw fetch to Go backend — no auth header. */
export async function goFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T; status: number }> {
  const url = `${GO_API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    },
  });

  if (res.status === 204) return { data: undefined as T, status: 204 };

  const data = await res.json().catch(() => ({}));
  return { data: data as T, status: res.status };
}

/**
 * Fetch to Go backend, attaching the Bearer token from the pb_access_token cookie.
 *
 * The Go backend issues short-lived access tokens (15 min) and long-lived refresh
 * tokens (30 days). When a request fails with 401 due to an expired/invalid access
 * token, we transparently refresh using pb_refresh_token, update both cookies, and
 * retry the original request once. If refresh also fails, we return the original 401.
 *
 * Concurrent refresh dedup: if multiple requests all hit a 401 at the same time (e.g.
 * at the 15-min token expiry boundary), only one refresh call is made. All waiters share
 * the result so the refresh token is consumed exactly once per expiry cycle.
 */

type RefreshResult = { access_token: string; refresh_token?: string } | null;
let _refreshInFlight: Promise<RefreshResult> | null = null;

export async function goFetchAuthed<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T; status: number }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pb_access_token")?.value ?? "";

  const doFetch = (bearer: string) =>
    goFetch<T>(path, {
      ...init,
      headers: {
        Authorization: bearer ? `Bearer ${bearer}` : "",
        ...(init.headers as Record<string, string>),
      },
    });

  const first = await doFetch(token);
  if (first.status !== 401) return first;

  const refreshToken = cookieStore.get("pb_refresh_token")?.value ?? "";
  if (!refreshToken) return first;

  // Deduplicate: reuse an in-flight refresh rather than firing N parallel refresh calls.
  if (!_refreshInFlight) {
    _refreshInFlight = goFetch<{ access_token?: string; refresh_token?: string }>(
      "/api/v1/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }
    )
      .then(({ data, status }) =>
        status < 400 && data?.access_token
          ? (data as RefreshResult)
          : null
      )
      .finally(() => { _refreshInFlight = null; });
  }

  const refreshed = await _refreshInFlight;
  if (!refreshed?.access_token) return first;

  const isProduction = process.env.NODE_ENV === "production";
  const base = { secure: isProduction, sameSite: "lax" as const, path: "/", httpOnly: true };
  cookieStore.set("pb_access_token", refreshed.access_token, { ...base, maxAge: 60 * 60 * 24 * 7 });
  if (refreshed.refresh_token) {
    cookieStore.set("pb_refresh_token", refreshed.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 });
  }

  return doFetch(refreshed.access_token);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    goFetch("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (email: string, password: string, username: string, name: string) =>
    goFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username, name }),
    }),

  refresh: (refresh_token: string) =>
    goFetch("/api/v1/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token }) }),

  logout: () => goFetchAuthed("/api/v1/auth/logout", { method: "POST" }),

  me: () => goFetchAuthed("/api/v1/users/me"),

  checkUsername: (username: string) =>
    goFetch(`/api/v1/auth/check-username?username=${encodeURIComponent(username)}`),

  deleteMe: (reasons?: string[]) =>
    goFetchAuthed("/api/v1/users/me", {
      method: "DELETE",
      body: JSON.stringify({ reasons: reasons ?? [] }),
    }),

  sendRegistrationOTP: (data: { name: string; username: string; email: string; password: string }) =>
    goFetch<{ sent: boolean; code?: string; email?: string; name?: string }>(
      "/api/v1/auth/register/send-otp",
      { method: "POST", body: JSON.stringify(data) }
    ),

  verifyRegistrationOTP: (email: string, code: string) =>
    goFetch("/api/v1/auth/register/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  sendOTP: (email: string) =>
    goFetch<{ sent: boolean; code?: string; email?: string; username?: string; name?: string }>(
      "/api/v1/auth/otp/send",
      { method: "POST", body: JSON.stringify({ email }) }
    ),

  verifyOTP: (email: string, code: string) =>
    goFetch("/api/v1/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  forgotPassword: (email: string) =>
    goFetch<{
      sent: boolean;
      reset_token?: string;
      email?: string;
      username?: string;
    }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    goFetch("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const userApi = {
  getByUsername: (username: string) =>
    goFetch(`/api/v1/users/${encodeURIComponent(username)}`),

  update: (username: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  search: (q: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/users/search?q=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`),

  saveOnboarding: (genres: string[], authors: string[]) =>
    goFetchAuthed(`/api/v1/users/me/onboarding`, {
      method: "POST",
      body: JSON.stringify({ genres, authors }),
    }),

  follow: (username: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/follow`, { method: "POST" }),

  unfollow: (username: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/follow`, { method: "DELETE" }),

  getFollowers: (username: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/users/${encodeURIComponent(username)}/followers?page=${page}&page_size=${pageSize}`),

  getFollowing: (username: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/users/${encodeURIComponent(username)}/following?page=${page}&page_size=${pageSize}`),

  getLikes: (username: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/users/${encodeURIComponent(username)}/likes?page=${page}&page_size=${pageSize}`),
};

// ── Bookshelf ─────────────────────────────────────────────────────────────────

export const bookshelfApi = {
  get: (username: string, page = 1, pageSize = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (status) params.set("status", status);
    return goFetch(`/api/v1/users/${encodeURIComponent(username)}/bookshelf?${params}`);
  },

  add: (username: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/bookshelf`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  remove: (username: string, bookId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/bookshelf/${encodeURIComponent(bookId)}`, {
      method: "DELETE",
    }),

  updateProgress: (username: string, bookId: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/bookshelf/${encodeURIComponent(bookId)}/progress`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  markStarted: (username: string, bookId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/bookshelf/${encodeURIComponent(bookId)}/start`, {
      method: "POST",
    }),

  markFinished: (username: string, bookId: string, body?: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/bookshelf/${encodeURIComponent(bookId)}/finish`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  updateTBR: (username: string, bookId: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/bookshelf/${encodeURIComponent(bookId)}/tbr`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getTBR: (username: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/users/${encodeURIComponent(username)}/tbr?page=${page}&page_size=${pageSize}`),

  getCurrentlyReading: (username: string, page = 1, pageSize = 20) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/reading?page=${page}&page_size=${pageSize}`),
};

// ── Favorites ─────────────────────────────────────────────────────────────────

export const favoritesApi = {
  get: (username: string) =>
    goFetch(`/api/v1/users/${encodeURIComponent(username)}/favorites`),

  add: (username: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/favorites`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  remove: (username: string, bookId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/favorites/${encodeURIComponent(bookId)}`, {
      method: "DELETE",
    }),

  reorder: (username: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/favorites/reorder`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// ── Books ─────────────────────────────────────────────────────────────────────

export const bookApi = {
  search: (q: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/books/search?q=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`),

  getById: (id: string) =>
    goFetch(`/api/v1/books/${encodeURIComponent(id)}`),

  getBySlug: (slug: string) =>
    goFetch(`/api/v1/books/by-slug/${encodeURIComponent(slug)}`),

  getLatest: (page = 1, pageSize = 10) =>
    goFetch(`/api/v1/books/latest?page=${page}&page_size=${pageSize}`),

  getPublic: () =>
    goFetch(`/api/v1/books/public`),

  getByAuthor: (author: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/books/by-author?author=${encodeURIComponent(author)}&page=${page}&page_size=${pageSize}`),

  shareBook: (bookId: string, targetUsername: string) =>
    goFetchAuthed(`/api/v1/books/${encodeURIComponent(bookId)}/share`, {
      method: "POST",
      body: JSON.stringify({ target_username: targetUsername }),
    }),

  like: (bookId: string) =>
    goFetchAuthed(`/api/v1/books/${encodeURIComponent(bookId)}/like`, { method: "POST" }),

  unlike: (bookId: string) =>
    goFetchAuthed(`/api/v1/books/${encodeURIComponent(bookId)}/like`, { method: "DELETE" }),

  getDiaryEntries: (bookId: string, page = 1, pageSize = 20) =>
    goFetch(`/api/v1/books/${encodeURIComponent(bookId)}/diary?page=${page}&page_size=${pageSize}`),
};

// ── Diary ─────────────────────────────────────────────────────────────────────

export const diaryApi = {
  // Auth is optional on the backend, but when the viewer is logged in we must
  // forward their Bearer so their own private entries appear in the response.
  // Same reasoning for getEntry.
  getEntries: (username: string, page = 1, pageSize = 20) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/diary?page=${page}&page_size=${pageSize}`),

  createEntry: (username: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/diary`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getEntry: (username: string, entryId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/diary/${encodeURIComponent(entryId)}`),

  updateEntry: (username: string, entryId: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/diary/${encodeURIComponent(entryId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteEntry: (username: string, entryId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/diary/${encodeURIComponent(entryId)}`, {
      method: "DELETE",
    }),

  likeEntry: (username: string, entryId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/diary/${encodeURIComponent(entryId)}/like`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  unlikeEntry: (username: string, entryId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/diary/${encodeURIComponent(entryId)}/like`, {
      method: "DELETE",
    }),
};

// ── Lists ─────────────────────────────────────────────────────────────────────

export const listsApi = {
  getUserLists: (username: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists`),

  createList: (username: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getList: (username: string, listId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}`),

  updateList: (username: string, listId: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteList: (username: string, listId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}`, {
      method: "DELETE",
    }),

  addBook: (username: string, listId: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/books`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  removeBook: (username: string, listId: string, bookId: string) =>
    goFetchAuthed(
      `/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/books/${encodeURIComponent(bookId)}`,
      { method: "DELETE" }
    ),

  shareList: (username: string, listId: string, usernames: string[]) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/share`, {
      method: "POST",
      body: JSON.stringify({ usernames }),
    }),

  saveList: (username: string, listId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/save`, {
      method: "POST",
    }),

  unsaveList: (username: string, listId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/save`, {
      method: "DELETE",
    }),

  grantAccess: (username: string, listId: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/access`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  revokeAccess: (username: string, listId: string, body: Record<string, unknown>) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/access`, {
      method: "DELETE",
      body: JSON.stringify(body),
    }),

  getAccess: (username: string, listId: string) =>
    goFetchAuthed(`/api/v1/users/${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}/access`),

  acceptCollaboration: (listId: string) =>
    goFetchAuthed(`/api/v1/lists/${encodeURIComponent(listId)}/collaborators`, { method: "POST" }),
};

// ── Activities ────────────────────────────────────────────────────────────────

export const activityApi = {
  getMyActivities: (page = 1, pageSize = 20) =>
    goFetchAuthed(`/api/v1/activities/me?page=${page}&page_size=${pageSize}`),

  getFollowingActivities: (page = 1, pageSize = 20) =>
    goFetchAuthed(`/api/v1/activities/following?page=${page}&page_size=${pageSize}`),

  checkNew: (since?: string) => {
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    return goFetchAuthed(`/api/v1/activities/check-new${params}`);
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  cleanupBooks: () =>
    goFetchAuthed(`/api/v1/admin/cleanup-books`, { method: "DELETE" }),
};
