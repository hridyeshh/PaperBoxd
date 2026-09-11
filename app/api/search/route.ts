import { NextRequest, NextResponse } from "next/server";
import { goFetch, goFetchAuthed } from "@/lib/api/endpoints";
import { cookies } from "next/headers";

/**
 * Personalised, conversational search.
 *
 * Proxies POST /api/v1/search. The Go side keeps a short-lived session in
 * Redis so a follow-up like "shorter" is read against the previous query
 * rather than as a search for the word "shorter". The client sends back the
 * session_id it was given; a missing one starts fresh.
 *
 * Uses goFetch (no bearer) when there is no session cookie: goFetchAuthed
 * would try to spend the refresh token on every logged-out search.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cookieStore = await cookies();
    const hasAuth = !!cookieStore.get("pb_access_token")?.value;

    const fetch = hasAuth ? goFetchAuthed : goFetch;
    const { data, status } = await fetch("/api/v1/search", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (status >= 500) {
      return NextResponse.json({ error: "Search unavailable" }, { status: 503 });
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("Search proxy error:", error);
    return NextResponse.json({ error: "Search unavailable" }, { status: 500 });
  }
}
