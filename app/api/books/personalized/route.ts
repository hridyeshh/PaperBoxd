import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { goFetchAuthed } from '@/lib/api/endpoints';

type BookCandidate = {
  id: string;
  reason?: string;
  [key: string]: unknown;
};

// Maps the frontend `type` param to the Go source hint.
// The source hint is forwarded as ?source= so the Go handler can support
// native filtering in future without changing this proxy.
const TYPE_TO_SOURCE: Record<string, string> = {
  recommended:       '',
  friends:           'friends',
  favorites:         'favorites',
  authors:           'authors',
  genres:            'genres',
  'continue-reading': 'continue',
};

// Client-side filter applied while Go does not yet discriminate by source.
// Each filter matches the Reason strings set by buildReason() in
// internal/service/recommendation_service.go.
function filterBySource(recs: BookCandidate[], source: string): BookCandidate[] {
  switch (source) {
    case 'friends':
      // "X read this" / "X & Y read this" / "X & N others read this"
      return recs.filter((r) => r.reason?.includes('read this'));
    case 'authors':
      // "You read <author>"
      return recs.filter((r) => r.reason?.startsWith('You read'));
    case 'genres':
      // "Matches your <genre> taste"
      return recs.filter((r) => r.reason?.startsWith('Matches your'));
    case 'favorites':
      // Pure vector match with no stronger signal
      return recs.filter((r) => r.reason === 'Picked for you');
    case 'continue':
      // Exploration slot — books from genres the user has never read
      return recs.filter((r) => r.reason === 'Something different');
    default:
      // 'recommended' — return the full ranked pool
      return recs;
  }
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('pb_access_token')?.value ?? '';

  if (!token) {
    console.warn('[personalized] no pb_access_token cookie — returning fallback');
    return NextResponse.json({ recommendations: [], source: 'no-auth' });
  }

  const type = req.nextUrl.searchParams.get('type') ?? 'recommended';
  const goSource = TYPE_TO_SOURCE[type] ?? '';
  const endpoint = goSource
    ? `/api/v1/recommendations/home?source=${goSource}`
    : '/api/v1/recommendations/home';

  try {
    const { data, status } = await goFetchAuthed(endpoint);

    if (status === 401) {
      // Auth failed and refresh couldn't recover (goFetchAuthed cleared cookies). Propagate
      // the 401 so the client knows to skip caching and re-check auth state, rather than
      // silently caching an empty book list for 5 minutes.
      return NextResponse.json({ recommendations: [], books: [], source: 'unauthorized' }, { status: 401 });
    }
    if (status >= 400) {
      console.error('[personalized] backend returned', status);
      return NextResponse.json({ recommendations: [], books: [], source: 'backend-error' });
    }

    const body = data as { recommendations?: BookCandidate[]; source?: string };
    const recs = body.recommendations ?? [];
    const filtered = filterBySource(recs, goSource);

    // Flat format for the home carousel (BookCarouselBook shape)
    const books = filtered.map((rec) => ({
      id: rec.id,
      title: (rec.title as string) || '',
      author: Array.isArray(rec.authors) ? ((rec.authors as string[])[0] ?? '') : '',
      cover: (rec.cover_url as string) || '',
      reason: rec.reason,
    }));

    console.log(
      `[personalized] type=${type} source=${body.source} total=${recs.length} filtered=${filtered.length}`,
    );
    return NextResponse.json({ ...body, recommendations: filtered, books });
  } catch (err) {
    console.error('[personalized] fetch failed:', err);
    return NextResponse.json({ recommendations: [], source: 'fetch-error' });
  }
}
