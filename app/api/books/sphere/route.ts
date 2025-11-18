import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Book from '@/lib/db/models/Book';

/**
 * GET /api/books/sphere
 * 
 * Get diverse books from different genres for the 3D sphere visualization.
 * Returns books from various genres: Fiction, Non-fiction, Manga, Comics, etc.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '80'), 100);

    // Diverse genres including manga and comics
    const genres = [
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
      'Manga',
      'Comics',
      'Graphic Novel',
      'Comic Book',
      'Cooking',
      'Travel',
      'Art',
      'Music',
    ];

    const booksPerGenre = Math.ceil(limit / genres.length);
    const selectedBooks: any[] = [];
    const usedBookIds = new Set<string>();
    const usedTitleAuthor = new Set<string>();

    // Get books from each genre
    for (const genre of genres) {
      if (selectedBooks.length >= limit) break;

      const genreBooks = await Book.find({
        'volumeInfo.categories': { $regex: new RegExp(genre, 'i') },
        'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
        _id: { $nin: Array.from(usedBookIds) },
      })
        .limit(booksPerGenre * 2) // Fetch more to account for duplicates
        .lean();

      for (const book of genreBooks) {
        const title = book.volumeInfo?.title?.toLowerCase().trim();
        const author = book.volumeInfo?.authors?.[0]?.toLowerCase().trim();
        const key = title && author ? `${title}|${author}` : null;

        if (book._id && !usedBookIds.has(book._id.toString()) && (!key || !usedTitleAuthor.has(key))) {
          selectedBooks.push(book);
          usedBookIds.add(book._id.toString());
          if (key) usedTitleAuthor.add(key);
          if (selectedBooks.length >= limit) break;
        }
      }
    }

    // If we still need more books, fill with any available books
    if (selectedBooks.length < limit) {
      const remainingLimit = limit - selectedBooks.length;
      const additionalBooks = await Book.find({
        'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
        _id: { $nin: Array.from(usedBookIds) },
      })
        .limit(remainingLimit * 2)
        .lean();

      for (const book of additionalBooks) {
        const title = book.volumeInfo?.title?.toLowerCase().trim();
        const author = book.volumeInfo?.authors?.[0]?.toLowerCase().trim();
        const key = title && author ? `${title}|${author}` : null;

        if (book._id && !usedBookIds.has(book._id.toString()) && (!key || !usedTitleAuthor.has(key))) {
          selectedBooks.push(book);
          usedBookIds.add(book._id.toString());
          if (key) usedTitleAuthor.add(key);
          if (selectedBooks.length >= limit) break;
        }
      }
    }

    // Transform to sphere format
    const transformedBooks = selectedBooks
      .slice(0, limit)
      .map((book: any, index: number) => {
        const bookId = book._id?.toString() || 
                       book.isbn13 || 
                       book.isbn || 
                       book.openLibraryId || 
                       book.isbndbId ||
                       `book-${index}`;
        
        return {
          id: bookId,
          bookId: bookId,
          src:
            book.volumeInfo?.imageLinks?.large ||
            book.volumeInfo?.imageLinks?.medium ||
            book.volumeInfo?.imageLinks?.thumbnail ||
            book.volumeInfo?.imageLinks?.smallThumbnail ||
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80',
          alt: book.volumeInfo?.title || 'Book cover',
          title: book.volumeInfo?.title || 'Unknown Title',
          author: book.volumeInfo?.authors?.[0] || 'Unknown Author',
          description: book.volumeInfo?.description 
            ? book.volumeInfo.description.substring(0, 150) + '...'
            : undefined,
        };
      });

    return NextResponse.json({
      books: transformedBooks,
      count: transformedBooks.length,
    });
  } catch (error: any) {
    console.error('Error fetching sphere books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books', details: error.message },
      { status: 500 }
    );
  }
}

