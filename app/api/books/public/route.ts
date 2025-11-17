import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Book from '@/lib/db/models/Book';

/**
 * GET /api/books/public
 *
 * Get diverse books from different genres for public home page carousels.
 * Query params:
 * - type: 'newly-published' | 'popular' | 'trending'
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'popular';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    let books: any[] = [];

    // Common genres to ensure diversity
    const commonGenres = [
      'Fiction',
      'Nonfiction',
      'Mystery',
      'Thriller',
      'Romance',
      'Science Fiction',
      'Fantasy',
      'Horror',
      'Biography',
      'History',
      'Self-Help',
      'Business',
      'Philosophy',
      'Poetry',
      'Young Adult',
      'Children',
      'Cooking',
      'Travel',
      'Art',
      'Music',
    ];

    // Helper function to get diverse books from different genres
    const getDiverseBooks = async (baseQuery: any, sortCriteria: any, targetLimit: number) => {
      const selectedBooks: any[] = [];
      const usedBookIds = new Set<string>();
      const usedTitleAuthor = new Set<string>(); // Track by title+author to avoid duplicates
      const genreCounts = new Map<string, number>();
      const booksPerGenre = Math.ceil(targetLimit / 5); // Aim for ~5 genres represented

      // First, try to get books from different genres
      for (const genre of commonGenres) {
        if (selectedBooks.length >= targetLimit) break;

        // Build query excluding already selected books
        const excludeIds = selectedBooks.map((b: any) => b._id);
        const genreQuery = {
          ...baseQuery,
          'volumeInfo.categories': { $regex: genre, $options: 'i' },
          'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
        };
        if (excludeIds.length > 0) {
          genreQuery._id = { $nin: excludeIds };
        }

        const genreBooks = await Book.find(genreQuery)
          .sort(sortCriteria)
          .limit(booksPerGenre * 2) // Fetch more to account for duplicates
          .lean();

        for (const book of genreBooks) {
          if (selectedBooks.length >= targetLimit) break;
          const bookId = book._id.toString();
          const title = (book.volumeInfo?.title || '').toLowerCase().trim();
          const author = (book.volumeInfo?.authors?.[0] || '').toLowerCase().trim();
          const titleAuthorKey = `${title}|${author}`;
          
          // Skip if we've already seen this book ID or title+author combination
          if (usedBookIds.has(bookId) || usedTitleAuthor.has(titleAuthorKey)) {
            continue;
          }
          
          selectedBooks.push(book);
          usedBookIds.add(bookId);
          usedTitleAuthor.add(titleAuthorKey);
          const bookGenres = book.volumeInfo?.categories || [];
          bookGenres.forEach((g: string) => {
            genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
          });
        }
      }

      // If we don't have enough books, fill with any books that have covers
      if (selectedBooks.length < targetLimit) {
        const excludeIds = selectedBooks.map((b: any) => b._id);
        const fillQuery = {
          ...baseQuery,
          'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
        };
        if (excludeIds.length > 0) {
          fillQuery._id = { $nin: excludeIds };
        }

        const additionalBooks = await Book.find(fillQuery)
          .sort(sortCriteria)
          .limit((targetLimit - selectedBooks.length) * 2) // Fetch more to account for duplicates
          .lean();

        for (const book of additionalBooks) {
          if (selectedBooks.length >= targetLimit) break;
          const bookId = book._id.toString();
          const title = (book.volumeInfo?.title || '').toLowerCase().trim();
          const author = (book.volumeInfo?.authors?.[0] || '').toLowerCase().trim();
          const titleAuthorKey = `${title}|${author}`;
          
          // Skip if we've already seen this book ID or title+author combination
          if (usedBookIds.has(bookId) || usedTitleAuthor.has(titleAuthorKey)) {
            continue;
          }
          
          selectedBooks.push(book);
          usedBookIds.add(bookId);
          usedTitleAuthor.add(titleAuthorKey);
        }
      }

      return selectedBooks.slice(0, targetLimit);
    };

    switch (type) {
      case 'newly-published': {
        // Get recently added books from diverse genres
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        books = await getDiverseBooks(
          {
            createdAt: { $gte: oneMonthAgo },
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          },
          { createdAt: -1 },
          limit
        );

        // If still not enough, get any books with covers
        if (books.length < limit) {
          const excludeIds = books.map((b: any) => b._id);
          const fillQuery: any = {
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          };
          if (excludeIds.length > 0) {
            fillQuery._id = { $nin: excludeIds };
          }
          const additionalBooks = await Book.find(fillQuery)
            .sort({ createdAt: -1 })
            .limit(limit - books.length)
            .lean();
          books = [...books, ...additionalBooks];
        }
        break;
      }

      case 'popular': {
        // Get diverse books from different genres, prioritizing those with ratings
        books = await getDiverseBooks(
          {
            $or: [
              { 'volumeInfo.averageRating': { $exists: true, $gte: 3 } },
              { paperboxdRating: { $exists: true, $gte: 3 } },
              { 'volumeInfo.ratingsCount': { $exists: true, $gt: 0 } },
            ],
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          },
          {
            'volumeInfo.averageRating': -1,
            'volumeInfo.ratingsCount': -1,
            paperboxdRating: -1,
          },
          limit
        );
        break;
      }

      case 'trending': {
        // Get diverse books that have been accessed recently
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        books = await getDiverseBooks(
          {
            $or: [
              { lastAccessed: { $gte: twoWeeksAgo } },
              { usageCount: { $gt: 0 } },
            ],
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          },
          { usageCount: -1, lastAccessed: -1 },
          limit
        );
        break;
      }

      default: {
        // Default: diverse books with good ratings
        books = await getDiverseBooks(
          {
            $or: [
              { 'volumeInfo.averageRating': { $exists: true, $gte: 3 } },
              { paperboxdRating: { $exists: true, $gte: 3 } },
            ],
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          },
          {
            'volumeInfo.averageRating': -1,
            'volumeInfo.ratingsCount': -1,
          },
          limit
        );
      }
    }

    // Transform books to carousel format, ensuring we have covers and deduplicating by title+author
    const seenBooks = new Set<string>();
    const transformedBooks = books
      .filter((book: any) => {
        // Only include books with valid covers
        const hasCover =
          book.volumeInfo?.imageLinks?.thumbnail ||
          book.volumeInfo?.imageLinks?.smallThumbnail ||
          book.volumeInfo?.imageLinks?.medium ||
          book.volumeInfo?.imageLinks?.large;
        return hasCover && book.volumeInfo?.title && book.volumeInfo?.authors?.length > 0;
      })
      .map((book: any) => ({
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
        // Create a unique key from title and author (case-insensitive, normalized)
        const key = `${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`;
        if (seenBooks.has(key)) {
          return false; // Skip duplicate
        }
        seenBooks.add(key);
        return true;
      })
      .slice(0, limit);

    return NextResponse.json({
      books: transformedBooks,
      type,
      count: transformedBooks.length,
    });
  } catch (error: any) {
    console.error('Error fetching public books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books', details: error.message },
      { status: 500 }
    );
  }
}

