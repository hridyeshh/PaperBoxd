import { NextResponse } from "next/server";
import { goFetchAuthed } from "@/lib/api/endpoints";

/** Fusion invite preview. Auth optional: signed-in viewers also learn "own" / "joined". */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const { data, status } = await goFetchAuthed(`/api/v1/fusions/invites/${encodeURIComponent(token)}`);
    return NextResponse.json(data, { status });
  } catch (err) {
    console.error("[fusion] preview failed:", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  }
}
