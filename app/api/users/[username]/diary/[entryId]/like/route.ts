import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GO_API =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://paperboxd-backend-production-d9e0.up.railway.app";

async function callLike(
  entryId: string,
  username: string,
  method: "POST" | "DELETE"
): Promise<{ status: number; body: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pb_access_token")?.value ?? "";

  const url = `${GO_API}/api/v1/users/${encodeURIComponent(username)}/diary/${encodeURIComponent(entryId)}/like`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({}) } : {}),
  });

  const body = await res.text();
  return { status: res.status, body };
}

function parseError(body: string, fallback: string): string {
  try {
    const j = JSON.parse(body) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof j.error === "string") return j.error;
    if (j.error?.message) return j.error.message;
    if (j.message) return j.message;
  } catch { /* plain text */ }
  return body.trim() || fallback;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ username: string; entryId: string }> }
) {
  try {
    const { username, entryId } = await context.params;
    const { status, body } = await callLike(entryId, username, "POST");
    if (status < 400) {
      let data: unknown = {};
      try { data = body ? JSON.parse(body) : {}; } catch { /* empty */ }
      return NextResponse.json(data);
    }
    return NextResponse.json(
      { error: parseError(body, "Failed to like entry") },
      { status }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to like entry" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ username: string; entryId: string }> }
) {
  try {
    const { username, entryId } = await context.params;
    const { status, body } = await callLike(entryId, username, "DELETE");
    if (status < 400) return NextResponse.json({});
    return NextResponse.json(
      { error: parseError(body, "Failed to unlike entry") },
      { status }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to unlike entry" }, { status: 500 });
  }
}
