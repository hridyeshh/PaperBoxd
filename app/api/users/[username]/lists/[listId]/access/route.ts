import { NextRequest, NextResponse } from "next/server";
import { listsApi } from "@/lib/api/endpoints";
import { extractGoError } from "@/lib/api/error";

// POST: grant or revoke access (unified for backwards compat with old action field)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  const { username, listId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const { targetUsername, action } = body as { targetUsername?: string; action?: string };

  if (!targetUsername) {
    return NextResponse.json({ error: "targetUsername is required" }, { status: 400 });
  }

  // Route to grant or revoke based on action field (backwards compat)
  if (action === "revoke") {
    const { data, status } = await listsApi.revokeAccess(username, listId, { username: targetUsername });
    if (status >= 400) {
      const err = data as { error?: { message?: string }; message?: string };
      return NextResponse.json(
        { error: extractGoError(err, "Failed to revoke access") },
        { status }
      );
    }
    return NextResponse.json({ message: `Access revoked from @${targetUsername}` });
  }

  // Default: grant
  const { data, status } = await listsApi.grantAccess(username, listId, { username: targetUsername });
  if (status === 409) {
    return NextResponse.json({ message: `Access granted to @${targetUsername}` });
  }
  if (status >= 400) {
    const err = data as { error?: { message?: string }; message?: string };
    return NextResponse.json(
      { error: extractGoError(err, "Failed to grant access") },
      { status }
    );
  }

  return NextResponse.json({ message: `Access granted to @${targetUsername}` });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  const { username, listId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const { targetUsername } = body as { targetUsername?: string };

  if (!targetUsername) {
    return NextResponse.json({ error: "targetUsername is required" }, { status: 400 });
  }

  const { data, status } = await listsApi.revokeAccess(username, listId, { username: targetUsername });

  if (status >= 400) {
    const err = data as { error?: { message?: string }; message?: string };
    return NextResponse.json(
      { error: extractGoError(err, "Failed to revoke access") },
      { status }
    );
  }

  return NextResponse.json({ message: `Access revoked from @${targetUsername}` });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string; listId: string }> }
) {
  const { username, listId } = await context.params;

  const { data, status } = await listsApi.getAccess(username, listId);

  if (status >= 400) {
    return NextResponse.json({ error: "Failed to get access list" }, { status });
  }

  // Go returns array of {id, username, name, avatarUrl, grantedAt}
  // Map to old format {allowedUsers: [{username, name, avatar}]}
  type GoAccessEntry = { id?: string; username?: string; name?: string; avatarUrl?: string };
  const entries = (data as GoAccessEntry[] | null) ?? [];

  return NextResponse.json({
    allowedUsers: entries.map((u) => ({
      username: u.username,
      name: u.name,
      avatar: u.avatarUrl,
    })),
  });
}
