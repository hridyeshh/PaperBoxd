"use client";

import { useEffect, useState } from "react";
import type { WebActivity } from "@/lib/activity-transform";

// Client view of /api/community. One fetch per mount, no polling — the data
// is a five-minute snapshot server-side anyway.

export type CommunityBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover: string;
  adds7d: number;
  /** Server-authored reason this book is on its shelf. */
  label?: string;
};

export type CommunityList = {
  id: string;
  username: string;
  title: string;
  description: string | null;
  bookCount: number;
  saveCount: number;
  coverUrls: string[];
  ownerName: string;
  ownerAvatar: string | null;
};

export type CommunityReader = {
  username: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  followersCount: number;
  booksReadCount: number;
  favoriteCovers: string[];
};

export type Community = {
  trendingBooks: CommunityBook[];
  popularBooks: CommunityBook[];
  rising: CommunityBook[];
  mostTbr: CommunityBook[];
  hiddenGems: CommunityBook[];
  activity: WebActivity[];
  lists: CommunityList[];
  readers: CommunityReader[];
};

const EMPTY: Community = {
  trendingBooks: [],
  popularBooks: [],
  rising: [],
  mostTbr: [],
  hiddenGems: [],
  activity: [],
  lists: [],
  readers: [],
};

export function useCommunity(enabled = true): { community: Community; loaded: boolean } {
  const [community, setCommunity] = useState<Community>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/community")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Partial<Community> | null) => {
        if (cancelled) return;
        if (d) setCommunity({ ...EMPTY, ...d });
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [enabled]);
  return { community, loaded };
}
