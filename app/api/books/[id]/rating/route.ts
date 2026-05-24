import { NextRequest, NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const username = request.headers.get("x-username");
  if (!username) return NextResponse.json({ error: "x-username header required" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data, status } = await goFetchAuthed(
    `/api/v1/users/${encodeURIComponent(username)}/bookshelf/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  return NextResponse.json(data, { status });
}
