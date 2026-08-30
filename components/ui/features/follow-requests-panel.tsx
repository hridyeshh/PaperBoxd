"use client";

// Pending follow requests on a private account. Renders nothing when the
// account is public or the queue is empty, so it can sit unconditionally at the
// top of the owner's own profile.

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { cn, DEFAULT_AVATAR } from "@/lib/utils";

type FollowRequest = {
  request_id: string;
  requested_at: string;
  id: string;
  username: string;
  name: string;
  avatar_url?: string | null;
  bio?: string | null;
};

export function FollowRequestsPanel({ enabled }: { enabled: boolean }) {
  const [requests, setRequests] = React.useState<FollowRequest[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setRequests([]);
      return;
    }
    let cancelled = false;
    fetch("/api/users/me/follow-requests")
      .then((res) => (res.ok ? res.json() : { requests: [] }))
      .then((data) => {
        if (!cancelled) setRequests(Array.isArray(data?.requests) ? data.requests : []);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => { cancelled = true; };
  }, [enabled]);

  const respond = React.useCallback(
    async (username: string, accept: boolean) => {
      setBusy(username);
      try {
        const response = await fetch(
          `/api/users/me/follow-requests/${encodeURIComponent(username)}`,
          { method: accept ? "POST" : "DELETE" },
        );
        if (!response.ok) throw new Error("Request failed");
        setRequests((prev) => prev.filter((r) => r.username !== username));
        toast.success(accept ? `${username} can now see your profile` : "Request declined");
      } catch {
        toast.error("Could not update that request");
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  if (!enabled || requests.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground">
        Follow requests
        <span className="ml-2 text-xs font-normal text-muted-foreground">{requests.length}</span>
      </h2>
      <ul className="mt-3 space-y-3">
        {requests.map((request) => (
          <li key={request.request_id} className="flex items-center gap-3">
            <Image
              src={request.avatar_url || DEFAULT_AVATAR}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/u/${request.username}`}
                className="block truncate text-sm font-medium text-foreground hover:underline"
              >
                {request.name || request.username}
              </Link>
              <div className="truncate text-xs text-muted-foreground">@{request.username}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busy === request.username}
                onClick={() => respond(request.username, true)}
                className={cn(
                  "rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background",
                  busy === request.username && "opacity-50",
                )}
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={busy === request.username}
                onClick={() => respond(request.username, false)}
                className={cn(
                  "rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground",
                  busy === request.username && "opacity-50",
                )}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
