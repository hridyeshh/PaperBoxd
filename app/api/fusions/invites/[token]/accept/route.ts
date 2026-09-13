import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { goFetchAuthed } from "@/lib/api/endpoints";

/** The invitee's one tap on Fuse. 409 carries the link status word. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const cookieStore = await cookies();
  if (!cookieStore.get("pb_access_token")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { token } = await params;
  try {
    const { data, status } = await goFetchAuthed(`/api/v1/fusions/invites/${encodeURIComponent(token)}/accept`, {
      method: "POST",
    });
    return NextResponse.json(data, { status });
  } catch (err) {
    console.error("[fusion] accept failed:", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  }
}
