"use client";

import { useEffect, useState } from "react";

// Client view of /api/books/[id]/social — what Paperboxd readers did with a
// book, who the viewer follows that has it, and the public lists it appears in.

/** "Why you'll like this" — the feed's reason for this book, for this reader. */
export type BookFit = {
  reason?: string;
  reasonType?: string;
  confidence?: string;
  isHiddenGem?: boolean;
};

/**
 * Fetches the personal fit line for a book. `null` when signed out or when
 * the engine has nothing personal to say — the caller renders nothing then.
 */
export function useBookFit(bookId: string | null) {
  const [fit, setFit] = useState<BookFit | null>(null);
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    fetch(`/api/books/${encodeURIComponent(bookId)}/fit`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BookFit | null) => {
        if (!cancelled) setFit(data && data.reason ? data : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookId]);
  return fit;
}

export type BookSocialFriend = {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  status: "read" | "reading" | "to-read" | string;
  rating: number | null;
  currentPage: number | null;
};

export type BookSocialList = {
  id: string;
  title: string;
  username: string;
  ownerName: string;
  avatarUrl: string | null;
  bookCount: number;
  saveCount: number;
  coverUrls: string[];
};

export type BookSocial = {
  readers: {
    rating: number | null;
    ratingsCount: number;
    /** Counts for 1★…5★, index 0 = 1★. */
    histogram: number[];
    reads: number;
    reading: number;
    tbr: number;
    tbr30d: number;
  };
  friends: BookSocialFriend[];
  friendsRead: number;
  friendsReading: number;
  friendsTbr: number;
  lists: BookSocialList[];
};

const EMPTY: BookSocial = {
  readers: { rating: null, ratingsCount: 0, histogram: [0, 0, 0, 0, 0], reads: 0, reading: 0, tbr: 0, tbr30d: 0 },
  friends: [],
  friendsRead: 0,
  friendsReading: 0,
  friendsTbr: 0,
  lists: [],
};

type GoFriend = {
  user_id: string;
  username: string;
  name?: string;
  avatar_url?: string | null;
  status: string;
  rating?: number | null;
  current_page?: number | null;
};

type GoList = {
  id: string;
  title: string;
  username: string;
  owner_name?: string;
  avatar_url?: string | null;
  book_count?: number;
  save_count?: number;
  cover_urls?: string[];
};

type GoSocial = {
  readers?: {
    rating?: number | null;
    ratings_count?: number;
    histogram?: number[];
    reads?: number;
    reading?: number;
    tbr?: number;
    tbr_30d?: number;
  };
  friends?: GoFriend[];
  friends_read?: number;
  friends_reading?: number;
  friends_tbr?: number;
  lists?: GoList[];
};

export function useBookSocial(bookId: string | null | undefined): {
  social: BookSocial;
  loaded: boolean;
} {
  const [social, setSocial] = useState<BookSocial>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/books/${encodeURIComponent(bookId)}/social`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: GoSocial | null) => {
        if (cancelled) return;
        if (d) {
          setSocial({
            readers: {
              rating: d.readers?.rating ?? null,
              ratingsCount: d.readers?.ratings_count ?? 0,
              histogram: d.readers?.histogram ?? [0, 0, 0, 0, 0],
              reads: d.readers?.reads ?? 0,
              reading: d.readers?.reading ?? 0,
              tbr: d.readers?.tbr ?? 0,
              tbr30d: d.readers?.tbr_30d ?? 0,
            },
            friends: (d.friends ?? []).map((f) => ({
              userId: f.user_id,
              username: f.username,
              name: f.name || f.username,
              avatarUrl: f.avatar_url ?? null,
              status: f.status,
              rating: f.rating ?? null,
              currentPage: f.current_page ?? null,
            })),
            friendsRead: d.friends_read ?? 0,
            friendsReading: d.friends_reading ?? 0,
            friendsTbr: d.friends_tbr ?? 0,
            lists: (d.lists ?? []).map((l) => ({
              id: l.id,
              title: l.title,
              username: l.username,
              ownerName: l.owner_name || l.username,
              avatarUrl: l.avatar_url ?? null,
              bookCount: l.book_count ?? 0,
              saveCount: l.save_count ?? 0,
              coverUrls: l.cover_urls ?? [],
            })),
          });
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return { social, loaded };
}

/**
 * One sentence about the people the viewer follows, or null when there is
 * nothing true to say. Read count leads because it is the strongest signal;
 * a 4★+ tally is added only when it is not the whole story repeated.
 */
export function friendsSentence(social: BookSocial): string | null {
  const { friendsRead, friendsReading, friendsTbr, friends } = social;
  const people = (n: number) => (n === 1 ? "1 person you follow" : `${n} people you follow`);
  const parts: string[] = [];
  if (friendsRead > 0) parts.push(`${people(friendsRead)} ${friendsRead === 1 ? "has" : "have"} read this`);
  if (friendsReading > 0) {
    parts.push(
      parts.length
        ? `${friendsReading} ${friendsReading === 1 ? "is" : "are"} reading it`
        : `${people(friendsReading)} ${friendsReading === 1 ? "is" : "are"} reading this`,
    );
  }
  if (!parts.length && friendsTbr > 0) {
    parts.push(`${people(friendsTbr)} ${friendsTbr === 1 ? "wants" : "want"} to read this`);
  }
  if (!parts.length) return null;

  const highRated = friends.filter((f) => (f.rating ?? 0) >= 4).length;
  if (highRated > 0 && friendsRead > 1) {
    parts.push(`${highRated} rated it 4★ or higher`);
  }
  return parts.join(" · ");
}
