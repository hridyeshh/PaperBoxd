import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { RecommendationService } from '@/lib/services/RecommendationService';

// Type for book from recommendation
type BookFromRecommendation = {
  _id: { toString(): string };
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      medium?: string;
      large?: string;
    };
  };
};

/**
 * GET /api/recommendations/similar/[bookId]
 *
 * Get books similar to a specific book.
 * Public endpoint - doesn't require authentication.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    await connectDB();

    const { bookId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    const recommendationService = new RecommendationService();
    const similar = await recommendationService.getSimilarBooks(bookId, limit * 2); // Fetch more to account for duplicates

    // Transform to carousel format and deduplicate
    const seenBooks = new Set<string>();
    const transformedBooks = similar
      .map((rec) => rec.book)
      .filter((book: BookFromRecommendation) => {
        const hasCover =
          book.volumeInfo?.imageLinks?.thumbnail ||
          book.volumeInfo?.imageLinks?.smallThumbnail ||
          book.volumeInfo?.imageLinks?.medium ||
          book.volumeInfo?.imageLinks?.large;
        const hasAuthors = (book.volumeInfo?.authors?.length ?? 0) > 0;
        return hasCover && book.volumeInfo?.title && hasAuthors;
      })
      .map((book: BookFromRecommendation) => ({
        id: book._id.toString(),
        title: book.volumeInfo?.title || 'Unknown Title',
        author: book.volumeInfo?.authors?.[0] || 'Unknown Author',
        cover:
          book.volumeInfo?.imageLinks?.thumbnail ||
          book.volumeInfo?.imageLinks?.smallThumbnail ||
          book.volumeInfo?.imageLinks?.medium ||
          book.volumeInfo?.imageLinks?.large ||
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80',
      }))
      .filter((book) => {
        const key = `${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`;
        if (seenBooks.has(key)) {
          return false;
        }
        seenBooks.add(key);
        return true;
      })
      .slice(0, limit);

    return NextResponse.json({
      books: transformedBooks,
      bookId,
      count: transformedBooks.length,
    });
  } catch (error: unknown) {
    console.error('Error getting similar books:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get similar books', details: errorMessage },
      { status: 500 }
    );
  }
}
