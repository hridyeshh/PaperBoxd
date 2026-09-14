import { NextResponse } from "next/server";
import { thoughtsApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";

type Ctx = { params: Promise<{ username: string; thoughtId: string }> };

async function toggle(ctx: Ctx, on: boolean) {
  try {
    const { username, thoughtId } = await ctx.params;
    const { data, status } = on
      ? await thoughtsApi.like(username, thoughtId)
      : await thoughtsApi.unlike(username, thoughtId);
    if (status >= 400) {
      return NextResponse.json({ error: extractGoError(data, on ? "Failed to like thought" : "Failed to unlike thought") }, { status });
    }
    return NextResponse.json(data ?? {});
  } catch {
    return NextResponse.json({ error: on ? "Failed to like thought" : "Failed to unlike thought" }, { status: 500 });
  }
}

export const POST = (_req: Request, ctx: Ctx) => toggle(ctx, true);
export const DELETE = (_req: Request, ctx: Ctx) => toggle(ctx, false);
