"use client";

// "Readers to follow" rail. The reason under each name is written by the
// backend (handler/users.go suggestedUserReason) so web, iOS and Android all
// explain a suggestion the same way — and only ever with a claim the data
// supports.

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

type SuggestedReader = {
  id: string;
  username: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  books_read_count?: number;
  reason?: string;
};

function hue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function SuggestedReaders({
  enabled,
  serifClass,
}: {
  enabled: boolean;
  serifClass?: string;
}) {
  const router = useRouter();
  const [readers, setReaders] = React.useState<SuggestedReader[]>([]);
  const [followed, setFollowed] = React.useState<Set<string>>(new Set());
  const [pending, setPending] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/onboarding/suggested-readers?limit=8")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { users?: SuggestedReader[] } | null) => {
        if (!cancelled && d?.users) setReaders(d.users);
      })
      .catch(() => {
        /* non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const follow = React.useCallback(
    async (reader: SuggestedReader) => {
      setPending(reader.username);
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(reader.username)}/follow`, {
          method: "POST",
        });
        if (res.ok) {
          setFollowed((prev) => new Set(prev).add(reader.username));
          track("suggested_reader_followed", { reason: reader.reason ?? "" });
        }
      } catch {
        /* leave the button as-is; the reader can retry */
      } finally {
        setPending(null);
      }
    },
    [],
  );

  if (!enabled || readers.length < 3) return null;

  return (
    <section className="mt-6">
      <div className="mb-2.5">
        <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground">
          Readers to follow
        </div>
        <h2 className={cn(serifClass, "text-[22px] font-semibold text-foreground mt-0.5")}>
          People worth following.
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {readers.map((r) => {
          const name = r.name || r.username;
          const isFollowed = followed.has(r.username);
          return (
            <div
              key={r.id}
              className="shrink-0 w-[190px] bg-background border border-border rounded-2xl p-3.5 flex flex-col gap-2.5"
            >
              <button
                type="button"
                onClick={() => router.push(`/u/${r.username}`)}
                className="flex items-center gap-2.5 text-left"
              >
                {r.avatar_url ? (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
                    <Image src={r.avatar_url} alt={name} fill className="object-cover" sizes="36px" unoptimized />
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold text-white"
                    style={{ background: `hsl(${hue(r.username)},45%,55%)` }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">@{r.username}</div>
                </div>
              </button>

              {r.reason && (
                <div className="text-[11.5px] text-muted-foreground leading-snug line-clamp-2 min-h-[2.2em]">
                  {r.reason}
                </div>
              )}

              <button
                type="button"
                disabled={isFollowed || pending === r.username}
                onClick={() => follow(r)}
                className={cn(
                  "rounded-full py-1.5 text-xs font-semibold transition-opacity",
                  isFollowed
                    ? "bg-muted text-muted-foreground"
                    : "bg-foreground text-background hover:opacity-85",
                )}
              >
                {isFollowed ? "Following" : pending === r.username ? "…" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
