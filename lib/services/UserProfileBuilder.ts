/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import User, { IBookshelfBook } from '../db/models/User';
import Book from '../db/models/Book';
import UserPreference, { IUserPreference } from '../db/models/UserPreference';
import { RecommendationConfig, normalizeGenre } from '../config/recommendation.config';

/**
 * UserProfileBuilder Service
 *
 * Builds comprehensive user profiles from their reading history, ratings, likes, and interactions.
 * The profile is used by the recommendation engine to personalize book suggestions.
 */

// Type for lean user documents (returned by .lean())
// Mongoose's lean() returns a complex type that's hard to type precisely
type LeanUser = any;

// Type for lean book documents (returned by .lean())
// Mongoose's lean() returns a complex type that's hard to type precisely
type LeanBook = any;

export class UserProfileBuilder {
  /**
   * Build complete user profile from all available data
   */
  async buildProfile(userId: string | mongoose.Types.ObjectId): Promise<IUserPreference> {
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    // Get or create user preference document
    const preference = await UserPreference.findOrCreate(userIdObj);

    // Fetch user data
    const user = await User.findById(userIdObj)
      .select('bookshelf likedBooks tbrBooks currentlyReading favoriteBooks topBooks')
      .lean();

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Compute all preference metrics
    const genreWeights = await this.computeGenreWeights(user);
    const authorWeights = await this.computeAuthorWeights(user);
    const avgPageLength = await this.calculateAvgPageLength(user);
    const diversityScore = this.calculateDiversityScore(genreWeights);
    const readingVelocity = this.calculateReadingVelocity(user);

    // Update preference document
    // Convert Maps to plain objects for Mongoose Schema.Types.Map
    const genreWeightsObj: Record<string, number> = {};
    genreWeights.forEach((value, key) => {
      genreWeightsObj[key] = value;
    });
    
    const authorWeightsObj: Record<string, number> = {};
    authorWeights.forEach((value, key) => {
      authorWeightsObj[key] = value;
    });
    
    // Set as plain objects - Mongoose will handle conversion to Map
    preference.implicitPreferences.genreWeights = genreWeightsObj as any;
    preference.implicitPreferences.authorWeights = authorWeightsObj as any;
    preference.implicitPreferences.avgPageLength = avgPageLength;
    preference.implicitPreferences.diversityScore = diversityScore;
    preference.implicitPreferences.readingVelocity = readingVelocity;
    preference.implicitPreferences.lastComputed = new Date();
    
    // Mark Maps as modified so Mongoose saves them correctly
    preference.markModified('implicitPreferences.genreWeights');
    preference.markModified('implicitPreferences.authorWeights');
    preference.markModified('implicitPreferences');

    await preference.save();

    return preference;
  }

  /**
   * Compute genre weights from all user interactions
   */
  private async computeGenreWeights(user: LeanUser): Promise<Map<string, number>> {
    const genreWeights = new Map<string, number>();

    // Process bookshelf (finished books)
    if (user.bookshelf && user.bookshelf.length > 0) {
      for (const bookRef of user.bookshelf) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.categories) continue;

        // Base weight for finished book
        let weight = RecommendationConfig.signals.bookshelfRead;

        // Multiply by rating weight if rated
        if (bookRef.rating) {
          weight *= this.getRatingMultiplier(bookRef.rating);
        }

        this.addGenreWeight(genreWeights, book.volumeInfo.categories, weight);
      }
    }

    // Process liked books
    if (user.likedBooks && user.likedBooks.length > 0) {
      for (const bookRef of user.likedBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.categories) continue;

        const weight = RecommendationConfig.signals.liked;
        this.addGenreWeight(genreWeights, book.volumeInfo.categories, weight);
      }
    }

    // Process TBR books
    if (user.tbrBooks && user.tbrBooks.length > 0) {
      for (const bookRef of user.tbrBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.categories) continue;

        const weight = RecommendationConfig.signals.tbrAdded;
        this.addGenreWeight(genreWeights, book.volumeInfo.categories, weight);
      }
    }

    // Process currently reading
    if (user.currentlyReading && user.currentlyReading.length > 0) {
      for (const bookRef of user.currentlyReading) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.categories) continue;

        const weight = RecommendationConfig.signals.currentlyReading;
        this.addGenreWeight(genreWeights, book.volumeInfo.categories, weight);
      }
    }

    // Process favorite books (strong signal)
    if (user.favoriteBooks && user.favoriteBooks.length > 0) {
      for (const bookRef of user.favoriteBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.categories) continue;

        const weight = RecommendationConfig.signals.favoriteBook;
        this.addGenreWeight(genreWeights, book.volumeInfo.categories, weight);
      }
    }

    // Process top books (strongest signal)
    if (user.topBooks && user.topBooks.length > 0) {
      for (const bookRef of user.topBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.categories) continue;

        const weight = RecommendationConfig.signals.topBook;
        this.addGenreWeight(genreWeights, book.volumeInfo.categories, weight);
      }
    }

    return genreWeights;
  }

  /**
   * Compute author weights from user interactions
   */
  private async computeAuthorWeights(user: LeanUser): Promise<Map<string, number>> {
    const authorWeights = new Map<string, number>();

    // Process bookshelf (finished books)
    if (user.bookshelf && user.bookshelf.length > 0) {
      for (const bookRef of user.bookshelf) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.authors) continue;

        // Base weight for finished book
        let weight = RecommendationConfig.signals.bookshelfRead;

        // Multiply by rating weight if rated
        if (bookRef.rating) {
          weight *= this.getRatingMultiplier(bookRef.rating);
        }

        this.addAuthorWeight(authorWeights, book.volumeInfo.authors, weight);
      }
    }

    // Process liked books
    if (user.likedBooks && user.likedBooks.length > 0) {
      for (const bookRef of user.likedBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.authors) continue;

        const weight = RecommendationConfig.signals.liked;
        this.addAuthorWeight(authorWeights, book.volumeInfo.authors, weight);
      }
    }

    // Process favorite books
    if (user.favoriteBooks && user.favoriteBooks.length > 0) {
      for (const bookRef of user.favoriteBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.authors) continue;

        const weight = RecommendationConfig.signals.favoriteBook;
        this.addAuthorWeight(authorWeights, book.volumeInfo.authors, weight);
      }
    }

    // Process top books
    if (user.topBooks && user.topBooks.length > 0) {
      for (const bookRef of user.topBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (!book || !book.volumeInfo.authors) continue;

        const weight = RecommendationConfig.signals.topBook;
        this.addAuthorWeight(authorWeights, book.volumeInfo.authors, weight);
      }
    }

    return authorWeights;
  }

  /**
   * Calculate average page length preference
   */
  private async calculateAvgPageLength(user: LeanUser): Promise<number> {
    const pageCounts: number[] = [];

    // Collect page counts from bookshelf
    if (user.bookshelf && user.bookshelf.length > 0) {
      for (const bookRef of user.bookshelf) {
        const book = await this.getBook(bookRef.bookId);
        if (book && book.volumeInfo.pageCount && book.volumeInfo.pageCount > 0) {
          pageCounts.push(book.volumeInfo.pageCount);
        }
      }
    }

    // Collect from favorite books
    if (user.favoriteBooks && user.favoriteBooks.length > 0) {
      for (const bookRef of user.favoriteBooks) {
        const book = await this.getBook(bookRef.bookId);
        if (book && book.volumeInfo.pageCount && book.volumeInfo.pageCount > 0) {
          pageCounts.push(book.volumeInfo.pageCount);
        }
      }
    }

    if (pageCounts.length === 0) return 350; // Default average

    const sum = pageCounts.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / pageCounts.length);
  }

  /**
   * Calculate diversity score (0-1) using Shannon entropy
   * Higher score = more diverse reading across genres
   */
  private calculateDiversityScore(genreWeights: Map<string, number>): number {
    if (genreWeights.size === 0) return 0;

    // Calculate total weight
    const totalWeight = Array.from(genreWeights.values()).reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) return 0;

    // Calculate Shannon entropy
    let entropy = 0;
    for (const weight of genreWeights.values()) {
      const proportion = weight / totalWeight;
      if (proportion > 0) {
        entropy -= proportion * Math.log2(proportion);
      }
    }

    // Normalize to 0-1 scale
    // Maximum entropy occurs when all genres have equal weight
    const maxEntropy = Math.log2(genreWeights.size);
    const diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return Math.min(Math.max(diversityScore, 0), 1);
  }

  /**
   * Calculate reading velocity (books per month)
   */
  private calculateReadingVelocity(user: LeanUser): number {
    if (!user.bookshelf || user.bookshelf.length === 0) return 0;

    // Get books with finish dates
    const booksWithDates = user.bookshelf
      .filter((b: IBookshelfBook) => b.finishedOn)
      .map((b: IBookshelfBook) => ({
        finishedOn: new Date(b.finishedOn),
      }))
      .sort((a: { finishedOn: Date }, b: { finishedOn: Date }) => a.finishedOn.getTime() - b.finishedOn.getTime());

    if (booksWithDates.length === 0) return 0;

    // Calculate time span
    const firstDate = booksWithDates[0].finishedOn;
    const lastDate = booksWithDates[booksWithDates.length - 1].finishedOn;
    const monthsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsDiff < 0.5) {
      // Less than 2 weeks of data, can't calculate velocity accurately
      return booksWithDates.length;
    }

    return booksWithDates.length / monthsDiff;
  }

  /**
   * Add weight to genres (with normalization)
   */
  private addGenreWeight(
    genreWeights: Map<string, number>,
    categories: string[],
    weight: number
  ): void {
    for (const category of categories) {
      const normalized = normalizeGenre(category);
      const currentWeight = genreWeights.get(normalized) || 0;
      genreWeights.set(normalized, currentWeight + weight);
    }
  }

  /**
   * Add weight to authors
   */
  private addAuthorWeight(
    authorWeights: Map<string, number>,
    authors: string[],
    weight: number
  ): void {
    for (const author of authors) {
      // Sanitize author name to remove characters that are invalid in MongoDB keys
      const sanitizedAuthor = author.replace(/\./g, '');
      const currentWeight = authorWeights.get(sanitizedAuthor) || 0;
      authorWeights.set(sanitizedAuthor, currentWeight + weight);
    }
  }

  /**
   * Get rating multiplier (how much to amplify/dampen weight based on rating)
   */
  private getRatingMultiplier(rating: number): number {
    switch (rating) {
      case 5:
        return RecommendationConfig.signals.rating5Star;
      case 4:
        return RecommendationConfig.signals.rating4Star;
      case 3:
        return RecommendationConfig.signals.rating3Star;
      case 2:
        return RecommendationConfig.signals.rating2Star;
      case 1:
        return RecommendationConfig.signals.rating1Star;
      default:
        return 1.0;
    }
  }

  /**
   * Get book from database (with caching)
   */
  private bookCache = new Map<string, LeanBook>();

  private async getBook(bookId: mongoose.Types.ObjectId): Promise<LeanBook | null> {
    const cacheKey = bookId.toString();

    if (this.bookCache.has(cacheKey)) {
      return this.bookCache.get(cacheKey);
    }

    const book = await Book.findById(bookId).select('volumeInfo').lean();

    if (book) {
      this.bookCache.set(cacheKey, book);

      // Clear cache after 5 minutes to prevent memory leaks
      setTimeout(() => {
        this.bookCache.delete(cacheKey);
      }, 5 * 60 * 1000);
    }

    return book;
  }

  /**
   * Merge onboarding preferences with computed preferences
   */
  async mergeOnboardingPreferences(
    userId: string | mongoose.Types.ObjectId,
    onboardingGenres: Array<{ genre: string; weight: number }>,
    onboardingAuthors: string[]
  ): Promise<IUserPreference> {
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const preference = await UserPreference.findOrCreate(userIdObj);

    // Add onboarding data
    preference.onboarding = {
      genres: onboardingGenres.map(g => ({
        genre: normalizeGenre(g.genre),
        weight: g.weight,
        lastUpdated: new Date(),
      })),
      favoriteAuthors: onboardingAuthors,
      completedAt: new Date(),
    };

    // Initialize implicit preferences from onboarding
    const genreWeights = new Map<string, number>();
    for (const { genre, weight } of onboardingGenres) {
      const normalized = normalizeGenre(genre);
      genreWeights.set(normalized, weight * 3); // Amplify onboarding signals
    }

    const authorWeights = new Map<string, number>();
    for (const author of onboardingAuthors) {
      // Sanitize author name to remove characters that are invalid in MongoDB keys
      const sanitizedAuthor = author.replace(/\./g, '');
      authorWeights.set(sanitizedAuthor, 2.0); // Strong initial signal
    }

    // Convert Maps to plain objects for Mongoose Schema.Types.Map
    const genreWeightsObj: Record<string, number> = {};
    genreWeights.forEach((value, key) => {
      genreWeightsObj[key] = value;
    });
    
    const authorWeightsObj: Record<string, number> = {};
    authorWeights.forEach((value, key) => {
      authorWeightsObj[key] = value;
    });
    
    // Set as plain objects - Mongoose will handle conversion to Map
    preference.implicitPreferences.genreWeights = genreWeightsObj as any;
    preference.implicitPreferences.authorWeights = authorWeightsObj as any;
    preference.implicitPreferences.avgPageLength = 350; // Default
    preference.implicitPreferences.diversityScore = 0.5; // Neutral
    preference.implicitPreferences.readingVelocity = 2; // Assume 2 books per month initially
    preference.implicitPreferences.lastComputed = new Date();
    
    // Mark Maps as modified so Mongoose saves them correctly
    preference.markModified('implicitPreferences.genreWeights');
    preference.markModified('implicitPreferences.authorWeights');
    preference.markModified('implicitPreferences');

    await preference.save();

    return preference;
  }

  /**
   * Incrementally update preferences (for real-time updates)
   */
  async incrementalUpdate(
    userId: string | mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    action: 'rated' | 'liked' | 'added_to_shelf' | 'added_to_tbr',
    rating?: number
  ): Promise<void> {
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const preference = await UserPreference.findOrCreate(userIdObj);
    const book = await Book.findById(bookId).select('volumeInfo').lean();

    if (!book || !book.volumeInfo) return;

    // Determine weight based on action
    let weight = 0;
    switch (action) {
      case 'rated':
        if (rating) {
          weight = this.getRatingMultiplier(rating);
        }
        break;
      case 'liked':
        weight = RecommendationConfig.signals.liked;
        break;
      case 'added_to_shelf':
        weight = RecommendationConfig.signals.bookshelfRead;
        if (rating) {
          weight *= this.getRatingMultiplier(rating);
        }
        break;
      case 'added_to_tbr':
        weight = RecommendationConfig.signals.tbrAdded;
        break;
    }

    // Update genre weights
    if (book.volumeInfo.categories) {
      // Ensure we have a Map to work with
      let genreWeights = preference.implicitPreferences.genreWeights;
      if (!(genreWeights instanceof Map)) {
        genreWeights = new Map(Object.entries(genreWeights || {}));
      }
      this.addGenreWeight(genreWeights, book.volumeInfo.categories, weight);
      // Convert Map to plain object for Mongoose
      const genreWeightsObj: Record<string, number> = {};
      genreWeights.forEach((value, key) => {
        genreWeightsObj[key] = value;
      });
      preference.implicitPreferences.genreWeights = genreWeightsObj as any;
      preference.markModified('implicitPreferences.genreWeights');
    }

    // Update author weights
    if (book.volumeInfo.authors) {
      // Ensure we have a Map to work with
      let authorWeights = preference.implicitPreferences.authorWeights;
      if (!(authorWeights instanceof Map)) {
        authorWeights = new Map(Object.entries(authorWeights || {}));
      }
      this.addAuthorWeight(authorWeights, book.volumeInfo.authors, weight);
      // Convert Map to plain object for Mongoose
      const authorWeightsObj: Record<string, number> = {};
      authorWeights.forEach((value, key) => {
        authorWeightsObj[key] = value;
      });
      preference.implicitPreferences.authorWeights = authorWeightsObj as any;
      preference.markModified('implicitPreferences.authorWeights');
    }

    preference.implicitPreferences.lastComputed = new Date();
    preference.markModified('implicitPreferences');
    await preference.save();
  }
}

export default UserProfileBuilder;
