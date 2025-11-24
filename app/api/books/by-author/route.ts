import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Book from '@/lib/db/models/Book';
import mongoose from 'mongoose';

/**
 * GET /api/books/by-author
 *
 * Get books by a specific author, excluding a specific book.
 * Query params:
 * - author: author name (required)
 * - excludeBookId: book ID to exclude (required)
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const author = searchParams.get('author');
    const excludeBookId = searchParams.get('excludeBookId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!author) {
      return NextResponse.json(
        { error: 'Author name is required' },
        { status: 400 }
      );
    }

    if (!excludeBookId) {
      return NextResponse.json(
        { error: 'excludeBookId is required' },
        { status: 400 }
      );
    }

    const excludeBookIdObj = new mongoose.Types.ObjectId(excludeBookId);

    // Find books by the same author, excluding the current book
    const books = await Book.find({
      _id: { $ne: excludeBookIdObj },
      'volumeInfo.authors': { $in: [author] },
      'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
    })
      .sort({ 'volumeInfo.averageRating': -1, 'volumeInfo.ratingsCount': -1 })
      .limit(limit * 2) // Fetch more to account for duplicates
      .lean();

    // Deduplicate by title+author
    const seenBooks = new Set<string>();
    type BookWithVolumeInfo = {
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
    const transformedBooks = books
      .filter((book: BookWithVolumeInfo) => {
        const hasCover =
          book.volumeInfo?.imageLinks?.thumbnail ||
          book.volumeInfo?.imageLinks?.smallThumbnail ||
          book.volumeInfo?.imageLinks?.medium ||
          book.volumeInfo?.imageLinks?.large;
        const hasAuthors = (book.volumeInfo?.authors?.length ?? 0) > 0;
        return hasCover && book.volumeInfo?.title && hasAuthors;
      })
      .map((book: BookWithVolumeInfo) => ({
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
      author,
      count: transformedBooks.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching books by author:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch books by author', details: errorMessage },
      { status: 500 }
    );
  }
}

