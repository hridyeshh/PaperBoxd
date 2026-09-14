import { NextResponse } from "next/server";
import { thoughtsApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";
import { toThought, type GoThought } from "@/lib/thoughts";

export const dynamic = "force-dynamic";

/** GET /api/users/[username]/thoughts/[thoughtId]/thread — username is the author. */
export async function GET(_req: Request, ctx: { params: Promise<{ username: string; thoughtId: string }> }) {
  try {
    const { username, thoughtId } = await ctx.params;
    const { data, status } = await thoughtsApi.getThread(username, thoughtId);
    if (status >= 400) {
      return NextResponse.json({ error: extractGoError(data, "Couldn't load thread") }, { status });
    }
    const thoughts = ((data as { thoughts?: GoThought[] })?.thoughts ?? []).map(toThought);
    return NextResponse.json({ thoughts });
  } catch {
    return NextResponse.json({ error: "Couldn't load thread" }, { status: 500 });
  }
}
