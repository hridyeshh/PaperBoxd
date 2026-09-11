import { NextResponse } from "next/server";
import { goFetch } from "@/lib/api/endpoints";
import { transformActivity } from "@/lib/activity-transform";

// Public "what is happening on Paperboxd" snapshot. No auth; the Go side caches
// it for five minutes and this route lets the CDN hold it for one more.

type GoBook = {
  id: string;
  _id?: string;
  slug?: string;
  adds_7d?: number;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: { large?: string; medium?: string; thumbnail?: string; smallThumbnail?: string; extraLarge?: string };
  };
};

type GoShelfBook = GoBook & { label?: string };

type GoCommunity = {
  trending_books?: GoBook[];
  popular_books?: GoBook[];
  rising?: GoShelfBook[];
  most_tbr?: GoShelfBook[];
  hidden_gems?: GoShelfBook[];
  activity?: Record<string, unknown>[];
  lists?: Array<{
    id: string;
    username: string;
    title: string;
    description?: string | null;
    book_count?: number;
    save_count?: number;
    cover_urls?: string[];
    owner_name?: string;
    owner_avatar_url?: string | null;
    updated_at?: string;
  }>;
  readers?: Array<{
    username: string;
    name?: string;
    avatar_url?: string | null;
    bio?: string | null;
    followers_count?: number;
    books_read_count?: number;
    favorite_covers?: string[];
  }>;
  generated_at?: string;
};

export type CommunityBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover: string;
  adds7d: number;
  /** Server-authored reason this book is on the shelf ("added by 7 readers this week"). */
  label?: string;
};

function flattenShelf(books: GoShelfBook[] | undefined): CommunityBook[] {
  return (books ?? []).map((b) => ({ ...flattenBook(b), label: b.label ?? "" }));
}

function flattenBook(b: GoBook): CommunityBook {
  const vi = b.volumeInfo ?? {};
  const il = vi.imageLinks ?? {};
  return {
    id: b.id || b._id || "",
    slug: b.slug || b.id || "",
    title: vi.title ?? "Untitled",
    author: vi.authors?.[0] ?? "",
    cover: il.medium || il.thumbnail || il.large || il.smallThumbnail || il.extraLarge || "",
    adds7d: b.adds_7d ?? 0,
  };
}

export async function GET() {
  try {
    const { data, status } = await goFetch<GoCommunity>("/api/v1/community");
    if (status >= 400 || !data) {
      return NextResponse.json({ error: "Failed to fetch community" }, { status: status || 502 });
    }
    return NextResponse.json(
      {
        trendingBooks: (data.trending_books ?? []).map(flattenBook),
        popularBooks: (data.popular_books ?? []).map(flattenBook),
        rising: flattenShelf(data.rising),
        mostTbr: flattenShelf(data.most_tbr),
        hiddenGems: flattenShelf(data.hidden_gems),
        activity: (data.activity ?? []).map(transformActivity),
        lists: (data.lists ?? []).map((l) => ({
          id: l.id,
          username: l.username,
          title: l.title,
          description: l.description ?? null,
          bookCount: l.book_count ?? 0,
          saveCount: l.save_count ?? 0,
          coverUrls: l.cover_urls ?? [],
          ownerName: l.owner_name || l.username,
          ownerAvatar: l.owner_avatar_url ?? null,
          updatedAt: l.updated_at ?? null,
        })),
        readers: (data.readers ?? []).map((r) => ({
          username: r.username,
          name: r.name || r.username,
          avatar: r.avatar_url ?? null,
          bio: r.bio ?? null,
          followersCount: r.followers_count ?? 0,
          booksReadCount: r.books_read_count ?? 0,
          favoriteCovers: r.favorite_covers ?? [],
        })),
        generatedAt: data.generated_at ?? null,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("[community] fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch community" }, { status: 500 });
  }
}
