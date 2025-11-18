import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import Book from '@/lib/db/models/Book';
import User from '@/lib/db/models/User';
import UserPreference from '@/lib/db/models/UserPreference';
import { RecommendationService } from '@/lib/services/RecommendationService';

/**
 * GET /api/books/personalized
 *
 * Get personalized book carousels for authenticated users.
 * Query params:
 * - type: 'recommended' | 'favorites' | 'authors' | 'genres' | 'continue-reading'
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'recommended';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const userId = session.user.id;
    let books: any[] = [];

    switch (type) {
      case 'onboarding': {
        // Books based on onboarding questionnaire (for new users)
        const preference = await UserPreference.findOne({ userId }).lean();
        
        if (!preference || !preference.onboarding) {
          break;
        }

        const onboarding = preference.onboarding;
        const genreNames = onboarding.genres?.map(g => g.genre) || [];
        const authorNames = onboarding.favoriteAuthors || [];

        // Build query for books matching onboarding preferences
        const query: any = {
          'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
        };

        // Add genre or author filter
        if (genreNames.length > 0 || authorNames.length > 0) {
          query.$or = [];
          
          if (genreNames.length > 0) {
            // Match any of the selected genres (case-insensitive regex match)
            // Genres in categories array might be stored in different formats
            for (const genre of genreNames) {
              query.$or.push({
                'volumeInfo.categories': { $regex: genre, $options: 'i' },
              });
            }
          }
          
          if (authorNames.length > 0) {
            // Match any of the favorite authors (case-insensitive)
            for (const author of authorNames) {
              query.$or.push({
                'volumeInfo.authors': { $regex: author, $options: 'i' },
              });
            }
          }
        }

        if (query.$or && query.$or.length > 0) {
          books = await Book.find(query)
            .sort({ 
              'volumeInfo.averageRating': -1, 
              'volumeInfo.ratingsCount': -1,
              'volumeInfo.publishedDate': -1 
            })
            .limit(limit * 2) // Fetch more to account for duplicates
            .lean();
        }
        break;
      }

      case 'recommended': {
        try {
          // Use the recommendation service
          console.log(`[Personalized API] Generating recommendations for user: ${userId}, limit: ${limit}`);
          const recommendationService = new RecommendationService(userId);
          const recommendations = await recommendationService.getRecommendations(
            userId,
            limit,
            { page: 'home' }
          );
          
          console.log(`[Personalized API] Generated ${recommendations.length} recommendations`);
          
          // Extract books from recommendations
          books = recommendations.map(rec => rec.book);
          
          if (books.length === 0) {
            console.warn(`[Personalized API] No books returned from recommendations (user may have no reading history)`);
          }
        } catch (error) {
          console.error('[Personalized API] Error getting recommendations:', error);
          // Return empty array if recommendations fail - don't crash the API
          books = [];
        }
        break;
      }

      case 'favorites': {
        // Get books similar to user's favorite books
        const user = await User.findById(userId)
          .select('favoriteBooks topBooks bookshelf')
          .lean();

        if (!user) {
          break;
        }

        // Get genres and authors from favorite books
        const favoriteBookIds = [
          ...(user.favoriteBooks || []).map((b: any) => b.bookId),
          ...(user.topBooks || []).map((b: any) => b.bookId),
        ].filter(Boolean);

        if (favoriteBookIds.length === 0) {
          // Fallback to bookshelf if no favorites
          const bookshelfIds = (user.bookshelf || []).map((b: any) => b.bookId).filter(Boolean);
          if (bookshelfIds.length > 0) {
            const favoriteBooks = await Book.find({
              _id: { $in: bookshelfIds.slice(0, 5) },
            }).lean();

            const genres = new Set<string>();
            const authors = new Set<string>();
            favoriteBooks.forEach((book: any) => {
              (book.volumeInfo?.categories || []).forEach((cat: string) => genres.add(cat));
              (book.volumeInfo?.authors || []).forEach((author: string) => authors.add(author));
            });

            // Find similar books
            if (genres.size > 0 || authors.size > 0) {
              books = await Book.find({
                _id: { $nin: favoriteBookIds },
                'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
                $or: [
                  { 'volumeInfo.categories': { $in: Array.from(genres) } },
                  { 'volumeInfo.authors': { $in: Array.from(authors) } },
                ],
              })
                .sort({ 'volumeInfo.averageRating': -1, 'volumeInfo.ratingsCount': -1 })
                .limit(limit * 2) // Fetch more to account for duplicates
                .lean();
            }
          }
          break;
        }

        // Get favorite books to extract genres/authors
        const favoriteBooks = await Book.find({
          _id: { $in: favoriteBookIds.slice(0, 10) },
        }).lean();

        const genres = new Set<string>();
        const authors = new Set<string>();
        favoriteBooks.forEach((book: any) => {
          (book.volumeInfo?.categories || []).forEach((cat: string) => genres.add(cat));
          (book.volumeInfo?.authors || []).forEach((author: string) => authors.add(author));
        });

        // Find similar books
        if (genres.size > 0 || authors.size > 0) {
          books = await Book.find({
            _id: { $nin: favoriteBookIds },
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
            $or: [
              { 'volumeInfo.categories': { $in: Array.from(genres) } },
              { 'volumeInfo.authors': { $in: Array.from(authors) } },
            ],
          })
            .sort({ 'volumeInfo.averageRating': -1, 'volumeInfo.ratingsCount': -1 })
            .limit(limit * 2) // Fetch more to account for duplicates
            .lean();
        }
        break;
      }

      case 'authors': {
        // Books by authors the user has read
        const user = await User.findById(userId)
          .select('authorsRead bookshelf')
          .lean();

        if (!user) {
          break;
        }

        const authorNames = new Set<string>();
        
        // Get authors from authorsRead
        (user.authorsRead || []).forEach((author: any) => {
          if (author.authorName) {
            authorNames.add(author.authorName);
          }
        });

        // Also get authors from bookshelf if authorsRead is empty
        if (authorNames.size === 0 && user.bookshelf && user.bookshelf.length > 0) {
          const bookshelfIds = user.bookshelf.map((b: any) => b.bookId).filter(Boolean);
          const bookshelfBooks = await Book.find({
            _id: { $in: bookshelfIds.slice(0, 20) },
          }).lean();

          bookshelfBooks.forEach((book: any) => {
            (book.volumeInfo?.authors || []).forEach((author: string) => {
              authorNames.add(author);
            });
          });
        }

        if (authorNames.size > 0) {
          const authorArray = Array.from(authorNames).slice(0, 10);
          books = await Book.find({
            'volumeInfo.authors': { $in: authorArray },
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          })
            .sort({ 'volumeInfo.averageRating': -1, 'volumeInfo.ratingsCount': -1 })
            .limit(limit * 2) // Fetch more to account for duplicates
            .lean();
        }
        break;
      }

      case 'genres': {
        // Trending books in user's favorite genres
        const preference = await UserPreference.findOne({ userId }).lean();
        
        if (!preference || !preference.implicitPreferences?.genreWeights) {
          break;
        }

        // Get top genres
        const genreWeights = preference.implicitPreferences.genreWeights;
        let topGenres: string[] = [];
        
        // Handle different formats (Map, object, or array)
        if (genreWeights instanceof Map) {
          topGenres = Array.from(genreWeights.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre]) => genre);
        } else if (typeof genreWeights === 'object' && genreWeights !== null) {
          topGenres = Object.entries(genreWeights as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre]) => genre);
        }

        if (topGenres.length > 0) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          books = await Book.find({
            'volumeInfo.categories': { $in: topGenres },
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
            $or: [
              { lastAccessed: { $gte: oneWeekAgo } },
              { usageCount: { $gt: 0 } },
            ],
          })
            .sort({ usageCount: -1, lastAccessed: -1, 'volumeInfo.averageRating': -1 })
            .limit(limit * 2) // Fetch more to account for duplicates
            .lean();
        }
        break;
      }

      case 'continue-reading': {
        // Books from currently reading list
        const user = await User.findById(userId)
          .select('currentlyReading')
          .lean();

        if (!user || !user.currentlyReading || user.currentlyReading.length === 0) {
          break;
        }

        const currentlyReadingIds = user.currentlyReading
          .map((b: any) => b.bookId)
          .filter(Boolean);

        if (currentlyReadingIds.length > 0) {
          books = await Book.find({
            _id: { $in: currentlyReadingIds },
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          })
            .limit(limit * 2) // Fetch more to account for duplicates
            .lean();
        }
        break;
      }

      case 'friends': {
        // Books that friends are liking
        const user = await User.findById(userId)
          .select('following bookshelf likedBooks')
          .lean();

        if (!user || !user.following || user.following.length === 0) {
          break;
        }

        // Get books from friends' liked books, favorite books, and high-rated bookshelf
        const friendIds = user.following;
        const friends = await User.find({
          _id: { $in: friendIds },
        })
          .select('likedBooks favoriteBooks topBooks bookshelf')
          .lean();

        // Collect book IDs from friends
        const friendBookIds = new Set<string>();
        const userBookIds = new Set<string>();

        // Track user's own books to exclude them
        if (user.bookshelf) {
          user.bookshelf.forEach((b: any) => {
            if (b.bookId) userBookIds.add(b.bookId.toString());
          });
        }
        if (user.likedBooks) {
          user.likedBooks.forEach((b: any) => {
            if (b.bookId) userBookIds.add(b.bookId.toString());
          });
        }

        // Collect books from friends
        friends.forEach((friend: any) => {
          // From liked books
          if (friend.likedBooks) {
            friend.likedBooks.forEach((b: any) => {
              if (b.bookId) friendBookIds.add(b.bookId.toString());
            });
          }
          // From favorite books
          if (friend.favoriteBooks) {
            friend.favoriteBooks.forEach((b: any) => {
              if (b.bookId) friendBookIds.add(b.bookId.toString());
            });
          }
          // From top books
          if (friend.topBooks) {
            friend.topBooks.forEach((b: any) => {
              if (b.bookId) friendBookIds.add(b.bookId.toString());
            });
          }
          // From high-rated bookshelf (4-5 stars)
          if (friend.bookshelf) {
            friend.bookshelf
              .filter((b: any) => b.rating && b.rating >= 4)
              .forEach((b: any) => {
                if (b.bookId) friendBookIds.add(b.bookId.toString());
              });
          }
        });

        // Remove user's own books
        const bookIdsToFetch = Array.from(friendBookIds).filter(
          (id) => !userBookIds.has(id)
        );

        if (bookIdsToFetch.length > 0) {
          books = await Book.find({
            _id: { $in: bookIdsToFetch },
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          })
            .limit(limit * 2) // Fetch more to account for duplicates
            .lean();
        }
        break;
      }

      default:
        // Default to recommended
        const recommendationService = new RecommendationService(userId);
        const recommendations = await recommendationService.getRecommendations(
          userId,
          limit,
          { page: 'home' }
        );
        books = recommendations.map(rec => rec.book);
    }

    // Transform books to carousel format, deduplicating by title+author
    const seenBooks = new Set<string>();
    const transformedBooks = books
      .filter((book: any) => {
        const hasCover =
          book.volumeInfo?.imageLinks?.thumbnail ||
          book.volumeInfo?.imageLinks?.smallThumbnail ||
          book.volumeInfo?.imageLinks?.medium ||
          book.volumeInfo?.imageLinks?.large;
        return hasCover && book.volumeInfo?.title && book.volumeInfo?.authors?.length > 0;
      })
      .map((book: any) => ({
        id: book._id.toString(),
        _id: book._id.toString(),
        title: book.volumeInfo?.title || 'Unknown Title',
        author: book.volumeInfo?.authors?.[0] || 'Unknown Author',
        authors: book.volumeInfo?.authors || [],
        description: book.volumeInfo?.description || '',
        publishedDate: book.volumeInfo?.publishedDate || '',
        cover:
          book.volumeInfo?.imageLinks?.thumbnail ||
          book.volumeInfo?.imageLinks?.smallThumbnail ||
          book.volumeInfo?.imageLinks?.medium ||
          book.volumeInfo?.imageLinks?.large ||
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80',
        isbn: book.isbn,
        isbn13: book.isbn13,
        openLibraryId: book.openLibraryId,
        isbndbId: book.isbndbId,
        averageRating: book.volumeInfo?.averageRating,
        ratingsCount: book.volumeInfo?.ratingsCount,
        pageCount: book.volumeInfo?.pageCount,
        categories: book.volumeInfo?.categories || [],
        publisher: book.volumeInfo?.publisher,
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
    console.error('Error fetching personalized books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personalized books', details: error.message },
      { status: 500 }
    );
  }
}

