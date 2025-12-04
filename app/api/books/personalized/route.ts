import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import Book from '@/lib/db/models/Book';
import User from '@/lib/db/models/User';
import UserPreference from '@/lib/db/models/UserPreference';
import { RecommendationService } from '@/lib/services/RecommendationService';
import { RecommendationConfig } from '@/lib/config/recommendation.config';
import mongoose from 'mongoose';

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

type BookWithPagination = BookLean & {
  __pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

/**
 * Genre relationships for finding related books
 * Maps each genre to related genres that users might also enjoy
 */
const genreRelationships: Record<string, string[]> = {
  'fiction': ['literary fiction', 'contemporary fiction', 'literature', 'drama'],
  'mystery': ['thriller', 'crime', 'detective', 'suspense', 'noir'],
  'thriller': ['mystery', 'suspense', 'crime', 'psychological thriller', 'action'],
  'romance': ['contemporary romance', 'historical romance', 'women\'s fiction', 'chick lit'],
  'science-fiction': ['fantasy', 'speculative fiction', 'dystopian', 'space opera', 'cyberpunk'],
  'fantasy': ['science-fiction', 'urban fantasy', 'epic fantasy', 'magical realism', 'paranormal'],
  'horror': ['thriller', 'supernatural', 'gothic', 'paranormal', 'dark fantasy'],
  'historical': ['historical fiction', 'biography', 'war', 'literary fiction'],
  'biography': ['memoir', 'autobiography', 'history', 'non-fiction'],
  'self-help': ['psychology', 'philosophy', 'business', 'motivational', 'spirituality'],
  'business': ['economics', 'management', 'entrepreneurship', 'self-help', 'finance'],
  'non-fiction': ['biography', 'history', 'science', 'philosophy', 'journalism'],
  'young-adult': ['fiction', 'fantasy', 'romance', 'coming of age', 'teen'],
  'classics': ['literary fiction', 'literature', 'historical', 'philosophy'],
  'poetry': ['literature', 'literary fiction', 'classics'],
};

/**
 * GET /api/books/personalized
 *
 * Get personalized book carousels for authenticated users.
 * Query params:
 * - type: 'recommended' | 'favorites' | 'authors' | 'genres' | 'continue-reading' | 'onboarding'
 * - limit: number (default: 20, max: 200 for onboarding type)
 * - page: number (default: 1, for pagination)
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const defaultLimit = type === 'onboarding' ? 50 : 20;
    const maxLimit = type === 'onboarding' ? 200 : 50;
    const limit = Math.min(parseInt(searchParams.get('limit') || defaultLimit.toString()), maxLimit);

    const userId = session.user.id;
    let books: BookLean[] = [];

    switch (type) {
      case 'onboarding': {
        // Enhanced endless feed algorithm based on onboarding questionnaire
        const preference = await UserPreference.findOne({ userId }).lean();
        
        if (!preference || !preference.onboarding) {
          console.log(`[Personalized API] No onboarding data found for user: ${userId}`);
          break;
        }

        const onboarding = preference.onboarding;
        const genreNames = onboarding.genres?.map(g => g.genre) || [];
        const authorNames = onboarding.favoriteAuthors || [];

        console.log(`[Personalized API] Onboarding feed for user ${userId}, page ${page}:`, {
          genres: genreNames,
          authors: authorNames,
        });

        // Multi-tier strategy for endless feed
        // Tier 1: Exact matches (onboarding genres/authors) - highest priority
        // Tier 2: Related genres (similar genres) - medium priority  
        // Tier 3: Popular books (any genre) - lower priority but ensures endless feed

        const skip = (page - 1) * limit;
        const allBooks: BookLean[] = [];
        const seenIds = new Set<string>();

        // Tier 1: Exact matches from onboarding preferences
        if (genreNames.length > 0 || authorNames.length > 0) {
          const tier1Query: MongoQuery = {
            'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
            $or: [],
          };

          // Build genre patterns for exact matches
          if (genreNames.length > 0) {
            const genrePatterns: string[] = [];
            for (const normalizedGenre of genreNames) {
              genrePatterns.push(normalizedGenre);
              
              // Add variations from genre mapping
              const genreMapping = RecommendationConfig.genreMapping;
              for (const [standard, variations] of Object.entries(genreMapping)) {
                if (standard.toLowerCase() === normalizedGenre.toLowerCase()) {
                  variations.forEach(variation => genrePatterns.push(variation));
                }
              }
            }
            
            const uniquePatterns = [...new Set(genrePatterns)];
            for (const pattern of uniquePatterns) {
              tier1Query.$or!.push({
                'volumeInfo.categories': { $regex: pattern, $options: 'i' },
              });
            }
          }

          // Add author matches
          if (authorNames.length > 0) {
            for (const author of authorNames) {
              const authorParts = author.trim().split(/\s+/).filter(part => part.length > 2);
              for (const part of authorParts) {
                tier1Query.$or!.push({
                  'volumeInfo.authors': { $regex: part, $options: 'i' },
                });
              }
            }
          }

          if (tier1Query.$or!.length > 0) {
            // Fetch a large batch for tier 1 (exact matches get priority)
            // Fetch more books for later pages to ensure endless feed
            const tier1Limit = Math.max(limit * 10, (skip + limit) * 2);
            const tier1Books = await Book.find(tier1Query)
              .sort({ 
                'volumeInfo.averageRating': -1, 
                'volumeInfo.ratingsCount': -1,
                'volumeInfo.publishedDate': -1 
              })
              .limit(tier1Limit)
              .lean() as BookLean[];
            
            tier1Books.forEach(book => {
              const id = book._id.toString();
              if (!seenIds.has(id)) {
                allBooks.push(book);
                seenIds.add(id);
              }
            });
            
            console.log(`[Personalized API] Tier 1 (exact matches): ${tier1Books.length} books`);
          }
        }

        // Tier 2: Related genres (always fetch for variety, especially on later pages)
        // Fetch related genres to ensure we have enough books for pagination
        if (genreNames.length > 0) {
          const relatedGenres = new Set<string>();
          
          // Collect related genres for each selected genre
          for (const genre of genreNames) {
            const lowerGenre = genre.toLowerCase();
            if (genreRelationships[lowerGenre]) {
              genreRelationships[lowerGenre].forEach(related => relatedGenres.add(related));
            }
          }

          if (relatedGenres.size > 0) {
            const tier2Query: MongoQuery = {
              'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
              $or: Array.from(relatedGenres).map(genre => ({
                'volumeInfo.categories': { $regex: genre, $options: 'i' },
              })),
            };

            // Exclude books we've already seen
            if (seenIds.size > 0) {
              tier2Query._id = { $nin: Array.from(seenIds).map(id => new mongoose.Types.ObjectId(id)) };
            }

            // Fetch more related books for later pages
            const tier2Limit = Math.max(limit * 5, (skip + limit) * 1.5);
            const tier2Books = await Book.find(tier2Query)
              .sort({ 
                'volumeInfo.averageRating': -1, 
                'volumeInfo.ratingsCount': -1,
              })
              .limit(Math.ceil(tier2Limit))
              .lean() as BookLean[];

            tier2Books.forEach(book => {
              const id = book._id.toString();
              if (!seenIds.has(id)) {
                allBooks.push(book);
                seenIds.add(id);
              }
            });

            console.log(`[Personalized API] Tier 2 (related genres): ${tier2Books.length} books`);
          }
        }

        // Tier 3: Popular books (ensures truly endless feed)
        // Always fetch tier 3 to ensure we have enough books for any page
        // This guarantees the feed never runs out
        const tier3Query: MongoQuery = {
          'volumeInfo.imageLinks.thumbnail': { $exists: true, $ne: null },
          'volumeInfo.averageRating': { $gte: 3.5 },
          'volumeInfo.ratingsCount': { $gte: 10 },
        };

        // Exclude books we've already seen
        if (seenIds.size > 0) {
          tier3Query._id = { $nin: Array.from(seenIds).map(id => new mongoose.Types.ObjectId(id)) };
        }

        // Use user-specific seed for consistent randomization
        const userIdHash = userId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const randomSeed = (userIdHash + page) % 10000;

        // Fetch popular books with randomization
        // Fetch enough to cover current page + several more pages
        const tier3Limit = Math.max(limit * 3, (skip + limit) + limit * 5);
        const tier3Books = await Book.find(tier3Query)
          .sort({ 
            'volumeInfo.averageRating': -1, 
            'volumeInfo.ratingsCount': -1,
          })
          .limit(Math.ceil(tier3Limit))
          .lean() as BookLean[];

        // Shuffle using seed for consistent but varied results
        const shuffled = [...tier3Books];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = (randomSeed + i) % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        shuffled.forEach(book => {
          const id = book._id.toString();
          if (!seenIds.has(id)) {
            allBooks.push(book);
            seenIds.add(id);
          }
        });

        console.log(`[Personalized API] Tier 3 (popular books): ${tier3Books.length} books`);

        // Store total count before pagination for metadata
        const totalBooksCount = allBooks.length;
        const hasMore = skip + limit < totalBooksCount;
        
        // Apply pagination
        const paginatedBooks = allBooks.slice(skip, skip + limit);
        
        // Store pagination info
        const booksWithPagination = paginatedBooks as BookWithPagination[];
        booksWithPagination.forEach(book => {
          book.__pagination = {
            page,
            limit,
            total: totalBooksCount,
            hasMore,
          };
        });
        
        books = paginatedBooks;
        
        console.log(`[Personalized API] Total books found: ${totalBooksCount}, returning page ${page}: ${books.length} books`);
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

    // Extract pagination metadata if available (for onboarding type)
    const firstBook = books[0] as BookWithPagination | undefined;
    const paginationInfo = firstBook?.__pagination;
    
    return NextResponse.json({
      books: transformedBooks,
      type,
      count: transformedBooks.length,
      ...(paginationInfo && {
        page: paginationInfo.page,
        hasMore: paginationInfo.hasMore,
        total: paginationInfo.total,
      }),
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

