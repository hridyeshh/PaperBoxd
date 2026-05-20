import { NextRequest, NextResponse } from 'next/server';
import { goFetch } from '@/lib/api/endpoints';

type GoBook = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      medium?: string;
      large?: string;
    };
  };
};

type GoBookList = {
  items?: GoBook[];
};

/**
 * GET /api/books/sphere
 * Returns books with cover images for the 3D sphere visualization.
 * Proxies to Go backend — no MongoDB.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '80'), 100);

    const { data, status } = await goFetch<GoBookList>(
      `/api/v1/books/latest?page=1&page_size=100`,
    );

    if (status >= 400) {
      return NextResponse.json({ error: 'Failed to fetch books' }, { status });
    }

    const books = (data.items ?? [])
      .filter((b) => {
        const links = b.volumeInfo?.imageLinks;
        return links?.thumbnail || links?.medium || links?.large || links?.smallThumbnail;
      })
      .slice(0, limit)
      .map((b, index) => {
        const links = b.volumeInfo?.imageLinks ?? {};
        return {
          id: b.id || `book-${index}`,
          bookId: b.id || `book-${index}`,
          src: links.large || links.medium || links.thumbnail || links.smallThumbnail || '',
          alt: b.volumeInfo?.title || 'Book cover',
          title: b.volumeInfo?.title || 'Unknown Title',
          author: b.volumeInfo?.authors?.[0] || 'Unknown Author',
          description: b.volumeInfo?.description
            ? b.volumeInfo.description.substring(0, 150) + '...'
            : undefined,
        };
      });

    return NextResponse.json({ books, count: books.length });
  } catch (error: unknown) {
    console.error('[Sphere] fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}
