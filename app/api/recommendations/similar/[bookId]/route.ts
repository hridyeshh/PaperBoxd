import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type GoCandidate = {
  id: string;
  title?: string;
  authors?: string[];
  cover_url?: string;
  reason?: string;
  reasonType?: string;
};

const GO_API = process.env.NEXT_PUBLIC_API_URL ?? 'https://paperboxd-backend-production-d9e0.up.railway.app';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  if (!bookId) {
    return NextResponse.json({ similar: [] });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('pb_access_token')?.value ?? '';

  try {
    const res = await fetch(`${GO_API}/api/v1/recommendations/similar/${encodeURIComponent(bookId)}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ similar: [], books: [] });
    }

    // Go returns { similar: BookCandidate[] }; the book page reads `books` and
    // has therefore rendered an empty "Similar books" section since it shipped.
    // Return both keys, flattened to the carousel's shape, and carry the
    // server-authored reason through.
    const data = (await res.json()) as { similar?: GoCandidate[] };
    const similar = Array.isArray(data.similar) ? data.similar : [];
    const books = similar.map((b) => ({
      id: b.id,
      title: b.title ?? '',
      author: Array.isArray(b.authors) ? (b.authors[0] ?? '') : '',
      cover: b.cover_url ?? '',
      reason: b.reason,
      reasonType: b.reasonType,
    }));
    return NextResponse.json({ similar, books });
  } catch {
    return NextResponse.json({ similar: [], books: [] });
  }
}
