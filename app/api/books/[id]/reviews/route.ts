import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/api/endpoints";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, status } = await goFetch(`/api/v1/books/${encodeURIComponent(id)}/reviews`);
  return NextResponse.json(data, { status });
}
