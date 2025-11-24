import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import Book from '@/lib/db/models/Book';
import User from '@/lib/db/models/User';
import UserPreference from '@/lib/db/models/UserPreference';
import { RecommendationService } from '@/lib/services/RecommendationService';
import { RecommendationConfig } from '@/lib/config/recommendation.config';

// Types for MongoDB lean documents
type BookLean = {
  _id: { toString(): string };
  isbn?: string;
  isbn13?: string;
  openLibraryId?: string;
  isbndbId?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    averageRating?: number;
    ratingsCount?: number;
    pageCount?: number;
    categories?: string[];
    publisher?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      medium?: string;
      large?: string;
    };
  };
};

type BookReference = {
  bookId?: string | { toString(): string };
  rating?: number;
};

type UserLean = {
  _id: { toString(): string };
  favoriteBooks?: BookReference[];
  topBooks?: BookReference[];
  bookshelf?: BookReference[];
  likedBooks?: BookReference[];
  currentlyReading?: BookReference[];
  authorsRead?: Array<{ authorName?: string }>;
  following?: Array<{ toString(): string }>;
};

type MongoQuery = {
  [key: string]: unknown;
  $or?: Array<Record<string, unknown>>;
};

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
    let books: BookLean[] = [];

    switch (type) {
      case 'onboarding': {
        // Books based on onboarding questionnaire (for new users)
        const preference = await UserPreference.findOne({ userId }).lean();
        
        if (!preference || !preference.onboarding) {
          console.log(`[Personalized API] No onboarding data found for user: ${userId}`);
          break;
        }

        const onboarding = preference.onboarding;
        const genreNames = onboarding.genres?.map(g => g.genre) || [];
        const authorNames = onboarding.favoriteAuthors || [];

        console.log(`[Personalized API] Onboarding query for user ${userId}:`, {
          genres: genreNames,
          authors: authorNames,
        });

        // Build query for books matching onboarding preferences
        const query: MongoQuery = {
          'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
        };

        // Add genre or author filter
        if (genreNames.length > 0 || authorNames.length > 0) {
          query.$or = [];
          
          if (genreNames.length > 0) {
            // Get all variations for each genre from the genre mapping
            const genrePatterns: string[] = [];
            for (const normalizedGenre of genreNames) {
              // Add the normalized genre itself
              genrePatterns.push(normalizedGenre);
              
              // Find all variations from the genre mapping
              const genreMapping = RecommendationConfig.genreMapping;
              for (const [standard, variations] of Object.entries(genreMapping)) {
                if (standard.toLowerCase() === normalizedGenre.toLowerCase()) {
                  // Add all variations for this genre
                  variations.forEach(variation => {
                    genrePatterns.push(variation);
                  });
                }
              }
              
              // Also try common variations (e.g., "Fiction" -> "Fiction / Literary", "Literary Fiction")
              const commonVariations: Record<string, string[]> = {
                'fiction': ['literary fiction', 'contemporary fiction', 'general fiction'],
                'mystery': ['mystery & thriller', 'detective', 'crime'],
                'thriller': ['mystery & thriller', 'suspense', 'psychological thriller'],
                'romance': ['romantic', 'love story', 'romantic fiction'],
                'science-fiction': ['sci-fi', 'science fiction', 'sf'],
                'fantasy': ['fantasy fiction', 'epic fantasy', 'urban fantasy'],
                'horror': ['horror fiction', 'supernatural', 'gothic'],
                'historical': ['historical fiction', 'history'],
                'biography': ['biography & autobiography', 'memoir', 'autobiography'],
                'self-help': ['self improvement', 'personal development', 'motivational'],
                'business': ['business & economics', 'management', 'entrepreneurship'],
                'non-fiction': ['nonfiction', 'non fiction', 'general nonfiction'],
                'young-adult': ['ya', 'young adult', 'teen'],
                'classics': ['classic literature', 'literary classics'],
                'poetry': ['poems', 'verse', 'poetic'],
              };
              
              const lowerGenre = normalizedGenre.toLowerCase();
              if (commonVariations[lowerGenre]) {
                commonVariations[lowerGenre].forEach(variation => {
                  genrePatterns.push(variation);
                });
              }
            }
            
            // Remove duplicates and create regex patterns
            const uniquePatterns = [...new Set(genrePatterns)];
            console.log(`[Personalized API] Genre patterns to search:`, uniquePatterns);
            
            // Create regex that matches any of the patterns
            for (const pattern of uniquePatterns) {
              query.$or.push({
                'volumeInfo.categories': { $regex: pattern, $options: 'i' },
              });
            }
          }
          
          if (authorNames.length > 0) {
            // Match any of the favorite authors (case-insensitive)
            for (const author of authorNames) {
              // Split author name and match each part (e.g., "J.K. Rowling" -> match "Rowling")
              const authorParts = author.trim().split(/\s+/).filter(part => part.length > 2);
              for (const part of authorParts) {
                query.$or.push({
                  'volumeInfo.authors': { $regex: part, $options: 'i' },
                });
              }
            }
          }
        }

        if (query.$or && query.$or.length > 0) {
          console.log(`[Personalized API] Executing query with ${query.$or.length} conditions`);
          
          // Use userId to create a consistent but unique seed for randomization
          // This ensures different users get different books even with same genres
          const userIdHash = userId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const randomSeed = userIdHash % 1000; // Use modulo to get a seed value
          
          // Fetch more books to allow for randomization
          const fetchLimit = limit * 5;
          books = await Book.find(query)
            .sort({ 
              'volumeInfo.averageRating': -1, 
              'volumeInfo.ratingsCount': -1,
              'volumeInfo.publishedDate': -1 
            })
            .limit(fetchLimit)
            .lean() as BookLean[];
          
          console.log(`[Personalized API] Found ${books.length} books for onboarding user ${userId}`);
          
          // If we found very few books, try a more lenient query
          if (books.length < limit && genreNames.length > 0) {
            console.log(`[Personalized API] Found only ${books.length} books, trying more lenient query`);
            const lenientQuery: MongoQuery = {
              'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
              $or: genreNames.map(genre => ({
                'volumeInfo.categories': { $regex: genre.split(' ')[0], $options: 'i' },
              })),
            };
            
            const additionalBooks = await Book.find(lenientQuery)
              .sort({ 
                'volumeInfo.averageRating': -1, 
                'volumeInfo.ratingsCount': -1,
              })
              .limit(limit * 3)
              .lean() as BookLean[];
            
            // Merge and deduplicate
            const existingIds = new Set(books.map((b) => b._id.toString()));
            const newBooks = additionalBooks.filter((b) => !existingIds.has(b._id.toString()));
            books = [...books, ...newBooks];
            console.log(`[Personalized API] After lenient query: ${books.length} total books`);
          }
          
          // Shuffle books using user-specific seed to ensure different users get different books
          if (books.length > limit) {
            // Simple seeded shuffle algorithm
            const shuffled: BookLean[] = [];
            const remaining = [...books];
            
            // Use seed to determine starting position
            let currentIndex = randomSeed % remaining.length;
            
            while (remaining.length > 0 && shuffled.length < limit * 2) {
              shuffled.push(remaining.splice(currentIndex, 1)[0]);
              if (remaining.length > 0) {
                // Move to next position based on seed
                currentIndex = (currentIndex + randomSeed + 1) % remaining.length;
              }
            }
            
            // Take top books (highest rated) and mix with shuffled
            const topBooks = books.slice(0, Math.floor(limit / 2));
            const shuffledBooks = shuffled.slice(0, Math.ceil(limit / 2));
            
            // Merge top books with shuffled books, prioritizing top books
            const merged: BookLean[] = [];
            const usedIds = new Set<string>();
            
            // Add top books first
            for (const book of topBooks) {
              const id = book._id.toString();
              if (!usedIds.has(id)) {
                merged.push(book);
                usedIds.add(id);
              }
            }
            
            // Add shuffled books
            for (const book of shuffledBooks) {
              const id = book._id.toString();
              if (!usedIds.has(id) && merged.length < limit * 2) {
                merged.push(book);
                usedIds.add(id);
              }
            }
            
            books = merged;
            console.log(`[Personalized API] After shuffling: ${books.length} books for user ${userId}`);
          }
        } else {
          console.log(`[Personalized API] No query conditions, returning empty array`);
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
          books = recommendations.map(rec => rec.book) as BookLean[];
          
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
          ...(user.favoriteBooks || []).map((b: BookReference) => typeof b.bookId === 'string' ? b.bookId : b.bookId?.toString()),
          ...(user.topBooks || []).map((b: BookReference) => typeof b.bookId === 'string' ? b.bookId : b.bookId?.toString()),
        ].filter(Boolean) as string[];

        if (favoriteBookIds.length === 0) {
          // Fallback to bookshelf if no favorites
          const bookshelfIds = (user.bookshelf || []).map((b: BookReference) => typeof b.bookId === 'string' ? b.bookId : b.bookId?.toString()).filter(Boolean) as string[];
          if (bookshelfIds.length > 0) {
            const favoriteBooks = await Book.find({
              _id: { $in: bookshelfIds.slice(0, 5) },
            }).lean() as BookLean[];

            const genres = new Set<string>();
            const authors = new Set<string>();
            favoriteBooks.forEach((book) => {
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
        favoriteBooks.forEach((book) => {
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
            .lean() as BookLean[];
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
        (user.authorsRead || []).forEach((author) => {
          if (author.authorName) {
            authorNames.add(author.authorName);
          }
        });

        // Also get authors from bookshelf if authorsRead is empty
        if (authorNames.size === 0 && user.bookshelf && user.bookshelf.length > 0) {
          const bookshelfIds = user.bookshelf.map((b: BookReference) => typeof b.bookId === 'string' ? b.bookId : b.bookId?.toString()).filter(Boolean) as string[];
          const bookshelfBooks = await Book.find({
            _id: { $in: bookshelfIds.slice(0, 20) },
          }).lean() as BookLean[];

          bookshelfBooks.forEach((book) => {
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
            .lean() as BookLean[];
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
            .lean() as BookLean[];
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
          .map((b: BookReference) => typeof b.bookId === 'string' ? b.bookId : b.bookId?.toString())
          .filter(Boolean) as string[];

        if (currentlyReadingIds.length > 0) {
          books = await Book.find({
            _id: { $in: currentlyReadingIds },
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          })
            .limit(limit * 2) // Fetch more to account for duplicates
            .lean() as BookLean[];
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
          user.bookshelf.forEach((b: BookReference) => {
            if (b.bookId) userBookIds.add(typeof b.bookId === 'string' ? b.bookId : b.bookId.toString());
          });
        }
        if (user.likedBooks) {
          user.likedBooks.forEach((b: BookReference) => {
            if (b.bookId) userBookIds.add(typeof b.bookId === 'string' ? b.bookId : b.bookId.toString());
          });
        }

        // Collect books from friends
        friends.forEach((friend: UserLean) => {
          // From liked books
          if (friend.likedBooks) {
            friend.likedBooks.forEach((b: BookReference) => {
              if (b.bookId) friendBookIds.add(typeof b.bookId === 'string' ? b.bookId : b.bookId.toString());
            });
          }
          // From favorite books
          if (friend.favoriteBooks) {
            friend.favoriteBooks.forEach((b: BookReference) => {
              if (b.bookId) friendBookIds.add(typeof b.bookId === 'string' ? b.bookId : b.bookId.toString());
            });
          }
          // From top books
          if (friend.topBooks) {
            friend.topBooks.forEach((b: BookReference) => {
              if (b.bookId) friendBookIds.add(typeof b.bookId === 'string' ? b.bookId : b.bookId.toString());
            });
          }
          // From high-rated bookshelf (4-5 stars)
          if (friend.bookshelf) {
            friend.bookshelf
              .filter((b: BookReference) => b.rating && b.rating >= 4)
              .forEach((b: BookReference) => {
                if (b.bookId) friendBookIds.add(typeof b.bookId === 'string' ? b.bookId : b.bookId.toString());
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
            .lean() as BookLean[];
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
        books = recommendations.map(rec => rec.book) as BookLean[];
    }

    // Transform books to carousel format, deduplicating by title+author
    const seenBooks = new Set<string>();
    const transformedBooks = books
      .filter((book) => {
        const hasCover =
          book.volumeInfo?.imageLinks?.thumbnail ||
          book.volumeInfo?.imageLinks?.smallThumbnail ||
          book.volumeInfo?.imageLinks?.medium ||
          book.volumeInfo?.imageLinks?.large;

        const hasAuthors = (book.volumeInfo?.authors?.length ?? 0) > 0;
        return hasCover && book.volumeInfo?.title && hasAuthors;
      })
      .map((book) => ({
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
  } catch (error: unknown) {
    console.error('Error fetching personalized books:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch personalized books', details: errorMessage },
      { status: 500 }
    );
  }
}

