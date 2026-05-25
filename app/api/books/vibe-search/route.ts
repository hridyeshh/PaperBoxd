import { NextRequest, NextResponse } from "next/server";
import { goFetch, goFetchAuthed } from "@/lib/api/endpoints";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward auth cookie if present — Go backend uses it for personalisation
    const cookieStore = await cookies();
    const hasAuth = !!cookieStore.get("pb_access_token")?.value;

    const fetch = hasAuth ? goFetchAuthed : goFetch;
    const { data, status } = await fetch("/api/v1/search/vibe", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (status >= 500) {
      return NextResponse.json(
        { error: "Vibe search unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("Vibe search proxy error:", error);
    return NextResponse.json(
      { error: "Vibe search unavailable" },
      { status: 500 }
    );
  }
}
