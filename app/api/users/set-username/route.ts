import { NextRequest, NextResponse } from "next/server";
import { userApi } from "@/lib/api/endpoints";
import { getCurrentUser } from "@/lib/auth/jwt-session";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { username } = body as { username?: string };

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const { data, status } = await userApi.update(user.username, { username });

  if (status === 409) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
  }
  if (status === 400) {
    const err = data as { error?: { message?: string }; message?: string };
    return NextResponse.json(
      { error: err?.error?.message ?? err?.message ?? "Invalid username format" },
      { status: 400 }
    );
  }
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to set username" }, { status });
  }

  const updated = data as { username?: string };
  return NextResponse.json({
    message: "Username set successfully",
    username: updated?.username ?? username.toLowerCase(),
  });
}
