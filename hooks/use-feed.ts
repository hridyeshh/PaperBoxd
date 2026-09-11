"use client";

import * as React from "react";

/**
 * Server-assembled home modules. Mirrors `service.FeedModule` on the Go side.
 * Each module carries its own title and reason for existing; the client only
 * decides how to draw it.
 */
export type FeedBook = {
  id: string;
  title: string;
  authors: string[];
  cover_url: string;
  categories?: string[];
  reason?: string;
  reasonType?: string;
  confidence?: string;
  isHiddenGem?: boolean;
};

export type FeedTwin = {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  overlap_pct: number;
  shared_count: number;
  is_following: boolean;
};

export type FeedModule = {
  kind: string;
  title: string;
  subtitle?: string;
  books: FeedBook[];
  twin?: FeedTwin;
};

export type FeedResponse = {
  greeting: string;
  modules: FeedModule[];
  source: string;
};

export function useFeed(enabled: boolean) {
  const [feed, setFeed] = React.useState<FeedResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    // The greeting is written server-side; it needs to know where the
    // reader is, or "Good morning" lands at dinner time.
    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {
      /* fall back to UTC on the server */
    }
    fetch(`/api/recommendations/feed${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FeedResponse | null) => {
        if (!cancelled && data && Array.isArray(data.modules)) setFeed(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { feed, loading };
}
