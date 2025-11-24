import mongoose from 'mongoose';
import User from '../db/models/User';
import Book from '../db/models/Book';
import UserPreference from '../db/models/UserPreference';
import { RecommendationConfig } from '../config/recommendation.config';
import { Recommendation } from './RecommendationService';

/**
 * FriendRecommendations Service
 *
 * Generates recommendations based on friend activity and social signals.
 * Implements friendship strength calculation and friend-based scoring.
 */

// Type for lean book documents (returned by .lean())
// Mongoose's lean() returns a complex type that's hard to type precisely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeanBook = any;

interface FriendBook {
  book: LeanBook | null;
  bookId: mongoose.Types.ObjectId;
  friendsWhoLoved: Array<{
    userId: mongoose.Types.ObjectId;
    name: string;
    username: string;
    strength: number;
  }>;
  totalStrength: number;
  highestRating: number;
}

export class FriendRecommendations {
  private config = RecommendationConfig;

  /**
   * Get recommendations based on friend activity
   */
  async getFriendRecommendations(
    userId: string | mongoose.Types.ObjectId,
    limit: number = 20
  ): Promise<Recommendation[]> {
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    // Get user's following list
    const user = await User.findById(userIdObj).select('following').lean();

    if (!user || !user.following || user.following.length === 0) {
      return []; // No friends, no recommendations
    }

    // Calculate friendship strength for each friend
    const friendStrengths = await Promise.all(
      user.following.map(async (friendId) => ({
        friendId,
        strength: await this.calculateFriendshipStrength(userIdObj, friendId),
      }))
    );

    // Get books from friends' high-rated collections
    const friendBooks = await this.getBooksFromFriends(friendStrengths);

    // Filter out books user already has
    const filtered = await this.filterUserBooks(friendBooks, userIdObj);

    // Score and rank
    const scored = filtered.map(fb => this.scoreFriendBook(fb));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Take top N and generate explanations
    return scored.slice(0, limit).map((rec, idx) => ({
      ...rec,
      position: idx + 1,
      reason: this.generateFriendExplanation(
        filtered.find(fb => fb.bookId.toString() === rec.bookId.toString())!
      ),
    }));
  }

  /**
   * Calculate friendship strength (0-1)
   */
  async calculateFriendshipStrength(
    userId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId
  ): Promise<number> {
    let strength = this.config.friendship.baseStrength;

    // 1. Interaction count (likes, comments on friend's posts)
    // For now, use a simple heuristic: check if they're mutual friends
    const friend = await User.findById(friendId).select('following').lean();

    const isMutual = friend?.following?.some(id => id.toString() === userId.toString());
    if (isMutual) {
      strength += 0.2; // Mutual friendship bonus
    }

    // 2. Mutual friends count
    const mutualCount = await this.countMutualFriends(userId, friendId);
    strength += Math.min(
      mutualCount * this.config.friendship.mutualFriendWeight,
      this.config.friendship.maxMutualFriendBonus
    );

    // 3. Taste similarity (genre overlap)
    const tasteSimilarity = await this.calculateTasteSimilarity(userId, friendId);
    strength += tasteSimilarity * this.config.friendship.tasteSimilarityWeight;

    return Math.min(strength, 1.0);
  }

  /**
   * Count mutual friends
   */
  private async countMutualFriends(
    userId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId
  ): Promise<number> {
    const user = await User.findById(userId).select('following').lean();
    const friend = await User.findById(friendId).select('following').lean();

    if (!user?.following || !friend?.following) return 0;

    const userFollowingSet = new Set(user.following.map(id => id.toString()));
    const mutualCount = friend.following.filter(id =>
      userFollowingSet.has(id.toString())
    ).length;

    return mutualCount;
  }

  /**
   * Calculate taste similarity based on genre overlap
   */
  private async calculateTasteSimilarity(
    userId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId
  ): Promise<number> {
    // Get both users' preferences
    const [userPref, friendPref] = await Promise.all([
      UserPreference.findOne({ userId }).select('implicitPreferences').lean(),
      UserPreference.findOne({ userId: friendId }).select('implicitPreferences').lean(),
    ]);

    if (!userPref || !friendPref) return 0;

    const userGenresRaw = userPref.implicitPreferences.genreWeights;
    const friendGenresRaw = friendPref.implicitPreferences.genreWeights;

    if (!userGenresRaw || !friendGenresRaw) return 0;

    // Convert to Map if needed (lean() returns plain objects)
    const userGenres = userGenresRaw instanceof Map 
      ? userGenresRaw 
      : new Map(Object.entries(userGenresRaw));
    const friendGenres = friendGenresRaw instanceof Map 
      ? friendGenresRaw 
      : new Map(Object.entries(friendGenresRaw));

    // Calculate cosine similarity of genre vectors
    const allGenres = new Set([
      ...Array.from(userGenres.keys()),
      ...Array.from(friendGenres.keys()),
    ]);

    let dotProduct = 0;
    let userMagnitude = 0;
    let friendMagnitude = 0;

    for (const genre of allGenres) {
      const userWeight = userGenres.get(genre) || 0;
      const friendWeight = friendGenres.get(genre) || 0;

      dotProduct += userWeight * friendWeight;
      userMagnitude += userWeight * userWeight;
      friendMagnitude += friendWeight * friendWeight;
    }

    if (userMagnitude === 0 || friendMagnitude === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(userMagnitude) * Math.sqrt(friendMagnitude));

    return Math.max(0, Math.min(similarity, 1));
  }

  /**
   * Get books from friends' collections
   */
  private async getBooksFromFriends(
    friendStrengths: Array<{ friendId: mongoose.Types.ObjectId; strength: number }>
  ): Promise<FriendBook[]> {
    const bookMap = new Map<string, FriendBook>();

    for (const { friendId, strength } of friendStrengths) {
      const friend = await User.findById(friendId)
        .select('name username bookshelf favoriteBooks topBooks')
        .lean();

      if (!friend) continue;

      // Collect high-rated books (4-5 stars) from bookshelf
      interface BookRefWithSource {
        bookId: mongoose.Types.ObjectId;
        rating?: number;
        finishedOn?: Date;
        source: string;
      }
      const highRatedBooks: BookRefWithSource[] = [];

      if (friend.bookshelf) {
        const rated45 = friend.bookshelf.filter((b) => b.rating && b.rating >= 4);
        highRatedBooks.push(...rated45.map((b) => ({ ...b, source: 'bookshelf' })));
      }

      // Add favorite books
      if (friend.favoriteBooks) {
        highRatedBooks.push(...friend.favoriteBooks.map((b) => ({ ...b, source: 'favorite', rating: 5 })));
      }

      // Add top books
      if (friend.topBooks) {
        highRatedBooks.push(...friend.topBooks.map((b) => ({ ...b, source: 'top', rating: 5 })));
      }

      // Add to book map
      for (const bookRef of highRatedBooks) {
        const bookIdStr = bookRef.bookId.toString();

        if (!bookMap.has(bookIdStr)) {
          bookMap.set(bookIdStr, {
            book: null,
            bookId: bookRef.bookId,
            friendsWhoLoved: [],
            totalStrength: 0,
            highestRating: bookRef.rating || 5,
          });
        }

        const friendBook = bookMap.get(bookIdStr)!;
        friendBook.friendsWhoLoved.push({
          userId: friendId,
          name: friend.name,
          username: friend.username || '',
          strength,
        });
        friendBook.totalStrength += strength;
        friendBook.highestRating = Math.max(friendBook.highestRating, bookRef.rating || 5);
      }
    }

    // Fetch book details
    const bookIds = Array.from(bookMap.keys()).map(id => new mongoose.Types.ObjectId(id));
    const books = await Book.find({ _id: { $in: bookIds } }).lean();

    const bookDetailsMap = new Map(books.map(b => [b._id.toString(), b]));

    // Attach book details
    const result: FriendBook[] = [];
    for (const [bookIdStr, friendBook] of bookMap.entries()) {
      const bookDetails = bookDetailsMap.get(bookIdStr);
      if (bookDetails) {
        friendBook.book = bookDetails;
        result.push(friendBook);
      }
    }

    return result;
  }

  /**
   * Filter out books user already has
   */
  private async filterUserBooks(
    friendBooks: FriendBook[],
    userId: mongoose.Types.ObjectId
  ): Promise<FriendBook[]> {
    const user = await User.findById(userId)
      .select('bookshelf likedBooks tbrBooks currentlyReading favoriteBooks topBooks')
      .lean();

    if (!user) return friendBooks;

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
        collection.forEach((b) => {
          if (b.bookId) {
            userBookIds.add(b.bookId.toString());
          }
        });
      }
    });

    return friendBooks.filter(fb => !userBookIds.has(fb.bookId.toString()));
  }

  /**
   * Score friend book recommendation
   */
  private scoreFriendBook(friendBook: FriendBook): Recommendation {
    // Score based on:
    // 1. Total friendship strength
    // 2. Number of friends who loved it
    // 3. Highest rating given

    const strengthScore = Math.min(friendBook.totalStrength / 3, 1.0); // Normalize by 3 friends
    const friendCountScore = Math.min(friendBook.friendsWhoLoved.length / 5, 1.0); // Normalize by 5 friends
    const ratingScore = friendBook.highestRating / 5;

    const finalScore = (strengthScore * 0.5) + (friendCountScore * 0.3) + (ratingScore * 0.2);

    return {
      book: friendBook.book,
      bookId: friendBook.bookId,
      score: finalScore,
      scoreBreakdown: {
        genre: 0,
        author: 0,
        quality: ratingScore,
        friends: (strengthScore * 0.5) + (friendCountScore * 0.3),
        trending: 0,
        recency: 0,
        diversity: 0,
      },
      reason: '',
      algorithm: 'friend-activity',
      position: 0,
    };
  }

  /**
   * Generate explanation for friend recommendation
   */
  private generateFriendExplanation(friendBook: FriendBook): string {
    const friends = friendBook.friendsWhoLoved
      .sort((a, b) => b.strength - a.strength) // Sort by strength
      .slice(0, 3); // Take top 3

    if (friends.length === 0) {
      return 'Popular with your friends';
    }

    if (friends.length === 1) {
      return `${friends[0].name} loved this`;
    }

    if (friends.length === 2) {
      return `${friends[0].name} and ${friends[1].name} loved this`;
    }

    const othersCount = friendBook.friendsWhoLoved.length - 2;
    if (othersCount === 1) {
      return `${friends[0].name}, ${friends[1].name} and 1 other loved this`;
    } else {
      return `${friends[0].name}, ${friends[1].name} and ${othersCount} others loved this`;
    }
  }

  /**
   * Get books that multiple specific friends loved
   */
  async getBooksBothFriendsLoved(
    userId: mongoose.Types.ObjectId,
    friendIds: mongoose.Types.ObjectId[],
    limit: number = 10
  ): Promise<Recommendation[]> {
    if (friendIds.length === 0) return [];

    const friendStrengths = friendIds.map(friendId => ({
      friendId,
      strength: 1.0, // Assume high strength for explicitly selected friends
    }));

    const friendBooks = await this.getBooksFromFriends(friendStrengths);

    // Filter to books loved by multiple friends
    const multiLoved = friendBooks.filter(fb => fb.friendsWhoLoved.length >= 2);

    // Filter out user's books
    const filtered = await this.filterUserBooks(multiLoved, userId);

    // Score and rank
    const scored = filtered.map(fb => this.scoreFriendBook(fb));
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((rec, idx) => ({
      ...rec,
      position: idx + 1,
      reason: this.generateFriendExplanation(
        filtered.find(fb => fb.bookId.toString() === rec.bookId.toString())!
      ),
    }));
  }

  /**
   * Get what a specific friend is currently reading
   */
  async getFriendCurrentlyReading(
    friendId: mongoose.Types.ObjectId
  ): Promise<LeanBook[]> {
    const friend = await User.findById(friendId)
      .select('currentlyReading')
      .lean();

    if (!friend || !friend.currentlyReading || friend.currentlyReading.length === 0) {
      return [];
    }

    const bookIds = friend.currentlyReading.map((b) => b.bookId);
    const books = await Book.find({ _id: { $in: bookIds } }).lean();

    return books;
  }

  /**
   * Get friend's recent high-rated books
   */
  async getFriendRecentFavorites(
    friendId: mongoose.Types.ObjectId,
    limit: number = 10
  ): Promise<LeanBook[]> {
    const friend = await User.findById(friendId)
      .select('bookshelf favoriteBooks')
      .lean();

    if (!friend) return [];

    // Get recent high-rated books from bookshelf
    const recentHighRated = (friend.bookshelf || [])
      .filter((b) => b.rating && b.rating >= 4 && b.finishedOn)
      .sort((a, b) => {
        const dateA = new Date(a.finishedOn).getTime();
        const dateB = new Date(b.finishedOn).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);

    const bookIds = recentHighRated.map((b) => b.bookId);
    const books = await Book.find({ _id: { $in: bookIds } }).lean();

    return books;
  }
}

export default FriendRecommendations;
