import mongoose from 'mongoose';
import Book from '../db/models/Book';
import User from '../db/models/User';
import UserPreference, { IUserPreference } from '../db/models/UserPreference';
import RecommendationLog from '../db/models/RecommendationLog';
import { RecommendationConfig, normalizeGenre, getConfigForUser } from '../config/recommendation.config';
import { UserProfileBuilder } from './UserProfileBuilder';

/**
 * RecommendationService
 *
 * Core recommendation engine that generates personalized book recommendations
 * using a sophisticated rule-based scoring algorithm.
 */

export interface Recommendation {
  book: any;
  bookId: mongoose.Types.ObjectId;
  score: number;
  scoreBreakdown: {
    genre: number;
    author: number;
    quality: number;
    friends: number;
    trending: number;
    recency: number;
    diversity: number;
  };
  reason: string;
  algorithm: string;
  position: number;
}

export interface RecommendationContext {
  page?: string;
  sessionId?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  recentActivity?: boolean;
}

export class RecommendationService {
  private profileBuilder: UserProfileBuilder;
  private config: typeof RecommendationConfig;

  constructor(userId?: string) {
    this.profileBuilder = new UserProfileBuilder();
    this.config = userId ? getConfigForUser(userId) : RecommendationConfig;
  }

  /**
   * Main entry point: Get personalized recommendations
   */
  async getRecommendations(
    userId: string | mongoose.Types.ObjectId,
    n: number = 20,
    context: RecommendationContext = {}
  ): Promise<Recommendation[]> {
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    // 1. Build/fetch user profile
    let profile: IUserPreference | null = await UserPreference.findOne({ userId: userIdObj });

    if (!profile || profile.needsRecomputation()) {
      console.log(`[RecommendationService] Building profile for user: ${userIdObj}`);
      profile = await this.profileBuilder.buildProfile(userIdObj);
    } else {
      console.log(`[RecommendationService] Using existing profile for user: ${userIdObj}`);
    }

    // 2. Generate candidate books from multiple sources
    const candidates = await this.generateCandidates(userIdObj, profile);
    console.log(`[RecommendationService] Generated ${candidates.length} candidate books`);

    if (candidates.length === 0) {
      // Fallback to trending books if no candidates
      console.log(`[RecommendationService] No candidates found, falling back to trending books`);
      return this.getTrendingBooks(n);
    }

    // 3. Score each candidate
    const scored = await Promise.all(
      candidates.map(book => this.scoreBook(book, profile, userIdObj))
    );

    // 4. Apply context-aware adjustments
    const adjusted = this.applyContextFilters(scored, context, profile);

    // 5. Sort by score
    const sorted = adjusted.sort((a, b) => b.score - a.score);

    // 6. Ensure diversity (MMR algorithm)
    const diverse = this.ensureDiversity(sorted, n);

    // 7. Generate explanations and assign positions
    const final = diverse.slice(0, n).map((rec, idx) => ({
      ...rec,
      position: idx + 1,
      reason: this.generateExplanation(rec, profile),
    }));

    // 8. Log recommendations (don't await)
    this.logRecommendations(userIdObj, final, context).catch(err => {
      console.error('Error logging recommendations:', err);
    });

    return final;
  }

  /**
   * Generate candidate books from multiple sources
   */
  private async generateCandidates(
    userId: mongoose.Types.ObjectId,
    profile: IUserPreference
  ): Promise<any[]> {
    const candidateSets = await Promise.all([
      this.getGenreBasedCandidates(profile, this.config.candidates.genreBased),
      this.getAuthorBasedCandidates(profile, this.config.candidates.authorBased),
      this.getSimilarToLikedCandidates(userId, this.config.candidates.similarToLiked),
    ]);

    // Flatten and deduplicate
    const allCandidates = candidateSets.flat();
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const candidate of allCandidates) {
      const id = candidate._id.toString();
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(candidate);
      }
    }

    // Filter out books user already has
    return this.filterUserBooks(unique, userId);
  }

  /**
   * Get books matching user's top genres
   */
  private async getGenreBasedCandidates(
    profile: IUserPreference,
    limit: number
  ): Promise<any[]> {
    const topGenres = profile.getTopGenres(5);

    if (topGenres.length === 0) return [];

    const genreNames = topGenres.map(g => g.genre);

    // Find books with matching genres, sorted by quality
    const books = await Book.find({
      'volumeInfo.categories': { $in: genreNames },
      'volumeInfo.pageCount': { $gte: this.config.quality.minPageCount },
      $or: [
        { paperboxdRating: { $gte: this.config.quality.minRating } },
        { 'volumeInfo.averageRating': { $gte: this.config.quality.minRating } },
      ],
    })
      .sort({ paperboxdRating: -1, totalReads: -1 })
      .limit(limit)
      .lean();

    return books;
  }

  /**
   * Get books by user's favorite authors
   */
  private async getAuthorBasedCandidates(
    profile: IUserPreference,
    limit: number
  ): Promise<any[]> {
    const topAuthors = profile.getTopAuthors(5);

    if (topAuthors.length === 0) return [];

    const authorNames = topAuthors.map(a => a.author);

    const books = await Book.find({
      'volumeInfo.authors': { $in: authorNames },
      'volumeInfo.pageCount': { $gte: this.config.quality.minPageCount },
    })
      .sort({ 'volumeInfo.averageRating': -1 })
      .limit(limit)
      .lean();

    return books;
  }

  /**
   * Get books similar to user's highly-rated books
   */
  private async getSimilarToLikedCandidates(
    userId: mongoose.Types.ObjectId,
    limit: number
  ): Promise<any[]> {
    const user = await User.findById(userId)
      .select('bookshelf likedBooks favoriteBooks')
      .lean();

    if (!user) return [];

    // Get books rated 4-5 stars or in favorites
    const highlyRatedBooks: any[] = [];

    if (user.bookshelf) {
      const rated45 = user.bookshelf.filter((b: any) => b.rating && b.rating >= 4);
      highlyRatedBooks.push(...rated45);
    }

    if (user.favoriteBooks) {
      highlyRatedBooks.push(...user.favoriteBooks);
    }

    if (highlyRatedBooks.length === 0) return [];

    // Get genres and authors from highly-rated books
    const bookIds = highlyRatedBooks.map((b: any) => b.bookId).slice(0, 10);
    const books = await Book.find({ _id: { $in: bookIds } })
      .select('volumeInfo.categories volumeInfo.authors')
      .lean();

    const genres = new Set<string>();
    const authors = new Set<string>();

    books.forEach(book => {
      if (book.volumeInfo.categories) {
        book.volumeInfo.categories.forEach(g => genres.add(g));
      }
      if (book.volumeInfo.authors) {
        book.volumeInfo.authors.forEach(a => authors.add(a));
      }
    });

    // Find similar books
    const similar = await Book.find({
      $or: [
        { 'volumeInfo.categories': { $in: Array.from(genres) } },
        { 'volumeInfo.authors': { $in: Array.from(authors) } },
      ],
    })
      .sort({ paperboxdRating: -1 })
      .limit(limit)
      .lean();

    return similar;
  }

  /**
   * Filter out books user already has
   */
  private async filterUserBooks(
    candidates: any[],
    userId: mongoose.Types.ObjectId
  ): Promise<any[]> {
    const user = await User.findById(userId)
      .select('bookshelf likedBooks tbrBooks currentlyReading favoriteBooks topBooks')
      .lean();

    if (!user) return candidates;

    const userBookIds = new Set<string>();

    // Collect all book IDs user has interacted with
    [
      user.bookshelf,
      user.likedBooks,
      user.tbrBooks,
      user.currentlyReading,
      user.favoriteBooks,
      user.topBooks,
    ].forEach(collection => {
      if (collection) {
        collection.forEach((b: any) => {
          if (b.bookId) {
            userBookIds.add(b.bookId.toString());
          }
        });
      }
    });

    // Filter out books user already has
    return candidates.filter(book => !userBookIds.has(book._id.toString()));
  }

  /**
   * Score a book based on multiple factors
   */
  private async scoreBook(
    book: any,
    profile: IUserPreference,
    userId: mongoose.Types.ObjectId
  ): Promise<Recommendation> {
    const genreScore = this.calculateGenreMatch(book, profile);
    const authorScore = this.calculateAuthorMatch(book, profile);
    const qualityScore = this.calculateQualityScore(book);
    const friendScore = 0; // Calculated separately in friend recommendations
    const trendingScore = this.calculateTrendingScore(book);
    const recencyScore = this.calculateRecencyScore(book);
    const diversityBonus = this.calculateDiversityBonus(book, profile);

    const weights = this.config.scoring;

    const finalScore =
      weights.genreMatch * genreScore +
      weights.authorMatch * authorScore +
      weights.qualityScore * qualityScore +
      weights.friendActivity * friendScore +
      weights.trendingBonus * trendingScore +
      weights.recencyBonus * recencyScore +
      weights.diversityBonus * diversityBonus;

    return {
      book,
      bookId: book._id,
      score: Math.min(finalScore, 1.0),
      scoreBreakdown: {
        genre: genreScore,
        author: authorScore,
        quality: qualityScore,
        friends: friendScore,
        trending: trendingScore,
        recency: recencyScore,
        diversity: diversityBonus,
      },
      reason: '',
      algorithm: 'hybrid',
      position: 0,
    };
  }

  /**
   * Calculate genre match score (0-1)
   */
  private calculateGenreMatch(book: any, profile: IUserPreference): number {
    if (!book.volumeInfo.categories || book.volumeInfo.categories.length === 0) {
      return 0;
    }

    const userGenreWeights = profile.implicitPreferences.genreWeights;
    const bookGenres = book.volumeInfo.categories.map((g: string) => normalizeGenre(g));

    let maxScore = 0;
    let matchCount = 0;

    for (const genre of bookGenres) {
      const weight = userGenreWeights.get(genre) || 0;
      if (weight > 0) {
        maxScore = Math.max(maxScore, weight);
        matchCount++;
      }
    }

    // Bonus for multiple genre matches
    const multiGenreBonus = matchCount > 1 ? 0.2 : 0;

    // Normalize (assume max weight is 20)
    return Math.min(1, (maxScore / 20) + multiGenreBonus);
  }

  /**
   * Calculate author match score (0-1)
   */
  private calculateAuthorMatch(book: any, profile: IUserPreference): number {
    if (!book.volumeInfo.authors || book.volumeInfo.authors.length === 0) {
      return 0;
    }

    const userAuthorWeights = profile.implicitPreferences.authorWeights;
    let maxWeight = 0;

    for (const author of book.volumeInfo.authors) {
      const weight = userAuthorWeights.get(author) || 0;
      maxWeight = Math.max(maxWeight, weight);
    }

    // Normalize (assume max weight is 10)
    return Math.min(1, maxWeight / 10);
  }

  /**
   * Calculate quality score (0-1)
   */
  private calculateQualityScore(book: any): number {
    const rating = book.paperboxdRating || book.volumeInfo.averageRating || 0;
    const ratingCount = book.paperboxdRatingsCount || book.volumeInfo.ratingsCount || 0;

    if (rating === 0) return 0.5; // Neutral for unrated books

    // Confidence factor: more ratings = more confidence
    const confidence = Math.min(ratingCount / 100, 1.0);

    // Normalize rating to 0-1 (assuming 5-star scale)
    const normalizedRating = rating / 5;

    // Combine rating with confidence
    return normalizedRating * (0.7 + 0.3 * confidence);
  }

  /**
   * Calculate trending score (0-1)
   */
  private calculateTrendingScore(book: any): number {
    if (!this.config.features.enableTrendingBoost) return 0;

    const reads = book.totalReads || 0;
    const likes = book.totalLikes || 0;
    const tbr = book.totalTBR || 0;

    // Simple popularity score
    const popularityScore = (reads * 2 + likes * 1.5 + tbr) / 100;

    return Math.min(popularityScore, 1.0);
  }

  /**
   * Calculate recency score (0-1)
   */
  private calculateRecencyScore(book: any): number {
    if (!this.config.features.enableRecencyBoost) return 0;

    if (!book.volumeInfo.publishedDate) return 0;

    try {
      const publishDate = new Date(book.volumeInfo.publishedDate);
      const now = new Date();
      const monthsSincePublish = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsSincePublish < 0) return 0; // Future date (invalid)
      if (monthsSincePublish > 24) return 0; // Older than 2 years

      // Linear decay: 1.0 for new books, 0 for 2-year-old books
      return Math.max(0, 1 - (monthsSincePublish / 24));
    } catch (e) {
      return 0;
    }
  }

  /**
   * Calculate diversity bonus (0-1)
   */
  private calculateDiversityBonus(book: any, profile: IUserPreference): number {
    if (!this.config.features.enableDiversityInjection) return 0;

    if (!book.volumeInfo.categories || book.volumeInfo.categories.length === 0) {
      return 0;
    }

    const userGenreWeights = profile.implicitPreferences.genreWeights;
    const bookGenres = book.volumeInfo.categories.map((g: string) => normalizeGenre(g));

    // Check if book is outside user's top genres
    const topGenres = profile.getTopGenres(3).map(g => g.genre);
    const isOutsideComfortZone = !bookGenres.some((g: string) => topGenres.includes(g));

    if (isOutsideComfortZone) {
      return profile.implicitPreferences.diversityScore; // Give bonus based on user's diversity
    }

    return 0;
  }

  /**
   * Apply context-aware filters
   */
  private applyContextFilters(
    recommendations: Recommendation[],
    context: RecommendationContext,
    profile: IUserPreference
  ): Recommendation[] {
    if (!this.config.features.enableContextualFilters) {
      return recommendations;
    }

    let filtered = [...recommendations];

    // Time of day filter
    if (context.timeOfDay === 'morning') {
      // Prefer shorter books in the morning
      filtered = filtered.map(rec => {
        if (rec.book.volumeInfo.pageCount && rec.book.volumeInfo.pageCount < this.config.context.morningLightBookThreshold) {
          rec.score *= 1.1; // 10% boost
        }
        return rec;
      });
    }

    // Recent activity boost
    if (context.recentActivity) {
      // Boost recommendations based on recently active genres
      filtered = filtered.map(rec => {
        rec.score *= this.config.context.recentActivityBoostMultiplier;
        return rec;
      });
    }

    // Reading velocity filter
    if (profile.implicitPreferences.readingVelocity < this.config.context.slowReaderThreshold) {
      // For slow readers, deprioritize very long books
      filtered = filtered.map(rec => {
        if (rec.book.volumeInfo.pageCount && rec.book.volumeInfo.pageCount > this.config.context.slowReaderPageLimit) {
          rec.score *= 0.7; // 30% penalty
        }
        return rec;
      });
    }

    return filtered;
  }

  /**
   * Ensure diversity using MMR (Maximal Marginal Relevance) algorithm
   */
  private ensureDiversity(
    sortedBooks: Recommendation[],
    n: number
  ): Recommendation[] {
    if (!this.config.features.enableDiversityInjection || sortedBooks.length <= n) {
      return sortedBooks;
    }

    const selected: Recommendation[] = [];
    const pool = [...sortedBooks];

    const pureQualityCount = Math.floor(n * this.config.diversity.pureQualityRatio);
    const diverseCount = n - pureQualityCount;

    // Phase 1: Select top scorers
    for (let i = 0; i < pureQualityCount && pool.length > 0; i++) {
      selected.push(pool.shift()!);
    }

    // Phase 2: Select diverse recommendations
    for (let i = 0; i < diverseCount && pool.length > 0; i++) {
      const mostDifferent = this.findMostDifferent(pool, selected);
      selected.push(mostDifferent);
      pool.splice(pool.indexOf(mostDifferent), 1);
    }

    return selected;
  }

  /**
   * Find most different book from selected books
   */
  private findMostDifferent(
    pool: Recommendation[],
    selected: Recommendation[]
  ): Recommendation {
    let maxDifference = -1;
    let mostDifferent = pool[0];

    for (const candidate of pool) {
      // Calculate average genre overlap with selected books
      const avgOverlap =
        selected.reduce((sum, sel) => {
          return sum + this.calculateGenreOverlap(candidate.book, sel.book);
        }, 0) / selected.length;

      // Prefer high score AND low overlap
      const diversityScore = candidate.score * (1 - avgOverlap);

      if (diversityScore > maxDifference) {
        maxDifference = diversityScore;
        mostDifferent = candidate;
      }
    }

    return mostDifferent;
  }

  /**
   * Calculate genre overlap between two books (0-1)
   */
  private calculateGenreOverlap(book1: any, book2: any): number {
    const genres1 = book1.volumeInfo.categories || [];
    const genres2 = book2.volumeInfo.categories || [];

    if (genres1.length === 0 || genres2.length === 0) return 0;

    const set1 = new Set(genres1.map((g: string) => normalizeGenre(g)));
    const set2 = new Set(genres2.map((g: string) => normalizeGenre(g)));

    const intersection = new Set([...set1].filter(g => set2.has(g)));

    return intersection.size / Math.max(set1.size, set2.size);
  }

  /**
   * Generate explanation for recommendation
   */
  private generateExplanation(rec: Recommendation, profile: IUserPreference): string {
    const breakdown = rec.scoreBreakdown;
    const templates = this.config.explanations;

    // Find the highest scoring factor
    const factors = [
      { name: 'genre', score: breakdown.genre, template: templates.genreMatch },
      { name: 'author', score: breakdown.author, template: templates.authorMatch },
      { name: 'quality', score: breakdown.quality, template: templates.highRated },
      { name: 'trending', score: breakdown.trending, template: templates.trending },
      { name: 'recency', score: breakdown.recency, template: templates.recentlyPublished },
      { name: 'diversity', score: breakdown.diversity, template: templates.diverse },
    ];

    factors.sort((a, b) => b.score - a.score);

    const topFactor = factors[0];

    switch (topFactor.name) {
      case 'genre': {
        const topGenres = profile.getTopGenres(3);
        const bookGenres = rec.book.volumeInfo.categories || [];
        const matchedGenre = topGenres.find(ug =>
          bookGenres.some((bg: string) => normalizeGenre(bg) === ug.genre)
        );
        return matchedGenre
          ? templates.genreMatch.replace('{genre}', matchedGenre.genre)
          : templates.genreMatch.replace('{genre}', 'your favorite genres');
      }

      case 'author': {
        const author = rec.book.volumeInfo.authors?.[0] || 'this author';
        return templates.authorMatch.replace('{author}', author);
      }

      case 'trending': {
        const genre = rec.book.volumeInfo.categories?.[0] || 'your favorite genre';
        return templates.trending.replace('{genre}', normalizeGenre(genre));
      }

      case 'recency': {
        const genre = rec.book.volumeInfo.categories?.[0] || 'your favorite genre';
        return templates.recentlyPublished.replace('{genre}', normalizeGenre(genre));
      }

      default:
        return 'Recommended for you';
    }
  }

  /**
   * Get trending books (fallback for new users)
   */
  private async getTrendingBooks(limit: number = 20): Promise<Recommendation[]> {
    const books = await Book.find({
      'volumeInfo.pageCount': { $gte: this.config.quality.minPageCount },
    })
      .sort({ paperboxdRating: -1, totalReads: -1 })
      .limit(limit)
      .lean();

    return books.map((book, idx) => ({
      book,
      bookId: new mongoose.Types.ObjectId(book._id.toString()),
      score: 1 - idx * 0.01, // Descending scores
      scoreBreakdown: {
        genre: 0,
        author: 0,
        quality: 1,
        friends: 0,
        trending: 1,
        recency: 0,
        diversity: 0,
      },
      reason: 'Popular on PaperBoxd',
      algorithm: 'trending',
      position: idx + 1,
    }));
  }

  /**
   * Get similar books (for book detail pages)
   */
  async getSimilarBooks(
    bookId: string | mongoose.Types.ObjectId,
    limit: number = 20
  ): Promise<Recommendation[]> {
    const bookIdObj = typeof bookId === 'string' ? new mongoose.Types.ObjectId(bookId) : bookId;

    const book = await Book.findById(bookIdObj).lean();
    if (!book) return [];

    const genres = book.volumeInfo.categories || [];
    const authors = book.volumeInfo.authors || [];

    // Find similar books - fetch more to account for duplicates
    const similar = await Book.find({
      _id: { $ne: bookIdObj },
      $or: [
        { 'volumeInfo.categories': { $in: genres } },
        { 'volumeInfo.authors': { $in: authors } },
      ],
    })
      .sort({ paperboxdRating: -1 })
      .limit(limit * 2) // Fetch more to account for duplicates
      .lean();

    // Deduplicate by title+author
    const seenBooks = new Set<string>();
    const uniqueBooks: any[] = [];
    
    for (const b of similar) {
      const title = (b.volumeInfo?.title || '').toLowerCase().trim();
      const author = (b.volumeInfo?.authors?.[0] || '').toLowerCase().trim();
      const key = `${title}|${author}`;
      
      if (!seenBooks.has(key)) {
        seenBooks.add(key);
        uniqueBooks.push(b);
        if (uniqueBooks.length >= limit) break;
      }
    }

    return uniqueBooks.map((b, idx) => ({
      book: b,
      bookId: new mongoose.Types.ObjectId(b._id.toString()),
      score: 1 - idx * 0.01,
      scoreBreakdown: {
        genre: 1,
        author: 1,
        quality: 0.8,
        friends: 0,
        trending: 0,
        recency: 0,
        diversity: 0,
      },
      reason: 'Readers also enjoyed',
      algorithm: 'similar-books',
      position: idx + 1,
    }));
  }

  /**
   * Log recommendations for analytics
   */
  private async logRecommendations(
    userId: mongoose.Types.ObjectId,
    recommendations: Recommendation[],
    context: RecommendationContext
  ): Promise<void> {
    const logs = recommendations.map(rec => ({
      bookId: rec.bookId,
      algorithm: rec.algorithm,
      score: rec.score,
      scoreBreakdown: rec.scoreBreakdown,
      reason: rec.reason,
      position: rec.position,
    }));

    await RecommendationLog.logRecommendations(userId, logs, {
      page: context.page || 'home',
      time: new Date(),
      sessionId: context.sessionId || 'unknown',
      algorithm: 'hybrid',
    });
  }
}

export default RecommendationService;
