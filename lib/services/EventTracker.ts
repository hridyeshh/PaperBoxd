import mongoose from 'mongoose';
import Event, { EventType, IEventMetadata } from '../db/models/Event';
import UserPreference from '../db/models/UserPreference';
import RecommendationCache from '../db/models/RecommendationCache';
import { UserProfileBuilder } from './UserProfileBuilder';

/**
 * EventTracker Service
 *
 * Tracks every user interaction and updates user profiles in real-time.
 * Used to learn user preferences and improve recommendations continuously.
 */

export class EventTracker {
  private profileBuilder: UserProfileBuilder;

  constructor() {
    this.profileBuilder = new UserProfileBuilder();
  }

  /**
   * Main tracking method - call this for every user interaction
   */
  async track(
    type: EventType,
    userId: string | mongoose.Types.ObjectId,
    metadata: IEventMetadata = {},
    sessionId?: string
  ): Promise<void> {
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    try {
      // 1. Store event in database
      await Event.trackEvent(
        type,
        userIdObj,
        metadata,
        sessionId || this.generateSessionId()
      );

      // 2. Update user profile asynchronously (don't await)
      this.updateUserProfile(userIdObj, type, metadata).catch(err => {
        console.error('Profile update failed:', err);
      });

      // 3. Invalidate recommendation cache for significant actions
      if (this.isSignificantAction(type)) {
        this.invalidateCache(userIdObj).catch(err => {
          console.error('Cache invalidation failed:', err);
        });
      }
    } catch (error) {
      console.error('Event tracking failed:', error);
      // Don't throw - tracking failures shouldn't break user experience
    }
  }

  /**
   * Batch track multiple events (for bulk operations)
   */
  async trackBatch(
    events: Array<{
      type: EventType;
      userId: string | mongoose.Types.ObjectId;
      metadata?: IEventMetadata;
      sessionId?: string;
    }>
  ): Promise<void> {
    await Promise.all(
      events.map(event =>
        this.track(event.type, event.userId, event.metadata, event.sessionId)
      )
    );
  }

  /**
   * Track book view with duration
   */
  async trackBookView(
    userId: string | mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    duration: number,
    sessionId?: string
  ): Promise<void> {
    await this.track(
      EventType.BOOK_VIEWED,
      userId,
      { bookId, duration },
      sessionId
    );

    // Also update UserPreference interactions
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const preference = await UserPreference.findOrCreate(userIdObj);
    preference.addBookView(bookId, duration, sessionId || this.generateSessionId());
    await preference.save();
  }

  /**
   * Track book rating
   */
  async trackRating(
    userId: string | mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    rating: number,
    sessionId?: string
  ): Promise<void> {
    await this.track(
      EventType.BOOK_RATED,
      userId,
      { bookId, rating },
      sessionId
    );
  }

  /**
   * Track book like/unlike
   */
  async trackLike(
    userId: string | mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    liked: boolean,
    sessionId?: string
  ): Promise<void> {
    await this.track(
      liked ? EventType.BOOK_LIKED : EventType.BOOK_UNLIKED,
      userId,
      { bookId },
      sessionId
    );
  }

  /**
   * Track adding book to shelf
   */
  async trackAddToShelf(
    userId: string | mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    shelf: 'bookshelf' | 'tbr' | 'currentlyReading' | 'favorites' | 'topBooks',
    rating?: number,
    sessionId?: string
  ): Promise<void> {
    const eventType = shelf === 'tbr'
      ? EventType.BOOK_ADDED_TO_TBR
      : shelf === 'currentlyReading'
      ? EventType.BOOK_STARTED_READING
      : shelf === 'bookshelf'
      ? EventType.BOOK_FINISHED_READING
      : shelf === 'favorites'
      ? EventType.BOOK_ADDED_TO_FAVORITES
      : EventType.BOOK_ADDED_TO_SHELF;

    await this.track(
      eventType,
      userId,
      { bookId, shelf, rating },
      sessionId
    );
  }

  /**
   * Track search query
   */
  async trackSearch(
    userId: string | mongoose.Types.ObjectId,
    query: string,
    resultsCount: number,
    sessionId?: string
  ): Promise<void> {
    await this.track(
      EventType.BOOK_SEARCHED,
      userId,
      { query, resultsCount },
      sessionId
    );

    // Also update UserPreference interactions
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const preference = await UserPreference.findOrCreate(userIdObj);
    preference.addSearchQuery(query);
    await preference.save();
  }

  /**
   * Track click from search results
   */
  async trackSearchClick(
    userId: string | mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    query: string,
    position: number,
    sessionId?: string
  ): Promise<void> {
    await this.track(
      EventType.BOOK_CLICKED_FROM_SEARCH,
      userId,
      { bookId, query, clickPosition: position },
      sessionId
    );
  }

  /**
   * Track click from recommendation
   */
  async trackRecommendationClick(
    userId: string | mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    source: 'home' | 'similar' | 'friends',
    position: number,
    algorithm: string,
    sessionId?: string
  ): Promise<void> {
    const eventType = source === 'friends'
      ? EventType.BOOK_CLICKED_FROM_FRIENDS
      : source === 'similar'
      ? EventType.BOOK_CLICKED_FROM_SIMILAR
      : EventType.BOOK_CLICKED_FROM_RECOMMENDATION;

    await this.track(
      eventType,
      userId,
      { bookId, source, position, algorithm },
      sessionId
    );

    await this.track(
      EventType.RECOMMENDATION_CLICKED,
      userId,
      { bookId, source, position, algorithm },
      sessionId
    );
  }

  /**
   * Track follow/unfollow
   */
  async trackFollow(
    userId: string | mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId,
    followed: boolean,
    sessionId?: string
  ): Promise<void> {
    await this.track(
      followed ? EventType.USER_FOLLOWED : EventType.USER_UNFOLLOWED,
      userId,
      { targetUserId: friendId },
      sessionId
    );
  }

  /**
   * Track onboarding completion
   */
  async trackOnboardingCompleted(
    userId: string | mongoose.Types.ObjectId,
    genres: string[],
    authors: string[],
    sessionId?: string
  ): Promise<void> {
    await this.track(
      EventType.ONBOARDING_COMPLETED,
      userId,
      { genres, authors },
      sessionId
    );
  }

  /**
   * Update user profile based on event
   */
  private async updateUserProfile(
    userId: mongoose.Types.ObjectId,
    eventType: EventType,
    metadata: IEventMetadata
  ): Promise<void> {
    // For significant actions, trigger incremental profile update
    switch (eventType) {
      case EventType.BOOK_RATED:
        if (metadata.bookId && metadata.rating) {
          await this.profileBuilder.incrementalUpdate(
            userId,
            metadata.bookId,
            'rated',
            metadata.rating
          );
        }
        break;

      case EventType.BOOK_LIKED:
        if (metadata.bookId) {
          await this.profileBuilder.incrementalUpdate(
            userId,
            metadata.bookId,
            'liked'
          );
        }
        break;

      case EventType.BOOK_FINISHED_READING:
      case EventType.BOOK_ADDED_TO_SHELF:
        if (metadata.bookId) {
          await this.profileBuilder.incrementalUpdate(
            userId,
            metadata.bookId,
            'added_to_shelf',
            metadata.rating
          );
        }
        break;

      case EventType.BOOK_ADDED_TO_TBR:
        if (metadata.bookId) {
          await this.profileBuilder.incrementalUpdate(
            userId,
            metadata.bookId,
            'added_to_tbr'
          );
        }
        break;

      // For less significant events, just let periodic recomputation handle it
      default:
        break;
    }
  }

  /**
   * Check if action is significant enough to invalidate cache
   */
  private isSignificantAction(eventType: EventType): boolean {
    const significantEvents = [
      EventType.BOOK_RATED,
      EventType.BOOK_LIKED,
      EventType.BOOK_ADDED_TO_SHELF,
      EventType.BOOK_FINISHED_READING,
      EventType.BOOK_ADDED_TO_TBR,
      EventType.BOOK_ADDED_TO_FAVORITES,
      EventType.BOOK_ADDED_TO_TOP,
      EventType.USER_FOLLOWED,
      EventType.USER_UNFOLLOWED,
    ];

    return significantEvents.includes(eventType);
  }

  /**
   * Invalidate recommendation cache
   */
  private async invalidateCache(userId: mongoose.Types.ObjectId): Promise<void> {
    await RecommendationCache.invalidateCache(userId);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get user's recent activity summary
   */
  async getRecentActivity(
    userId: string | mongoose.Types.ObjectId,
    days: number = 7
  ): Promise<{
    booksViewed: number;
    booksRated: number;
    booksLiked: number;
    booksAdded: number;
    searches: number;
    followActivity: number;
  }> {
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await Event.find({
      userId: userIdObj,
      timestamp: { $gte: startDate },
    }).lean();

    const summary = {
      booksViewed: 0,
      booksRated: 0,
      booksLiked: 0,
      booksAdded: 0,
      searches: 0,
      followActivity: 0,
    };

    events.forEach(event => {
      switch (event.type) {
        case EventType.BOOK_VIEWED:
          summary.booksViewed++;
          break;
        case EventType.BOOK_RATED:
          summary.booksRated++;
          break;
        case EventType.BOOK_LIKED:
          summary.booksLiked++;
          break;
        case EventType.BOOK_ADDED_TO_SHELF:
        case EventType.BOOK_ADDED_TO_TBR:
        case EventType.BOOK_FINISHED_READING:
          summary.booksAdded++;
          break;
        case EventType.BOOK_SEARCHED:
          summary.searches++;
          break;
        case EventType.USER_FOLLOWED:
        case EventType.USER_UNFOLLOWED:
          summary.followActivity++;
          break;
      }
    });

    return summary;
  }

  /**
   * Get user's engagement score (0-100)
   * Higher score = more active user
   */
  async calculateEngagementScore(
    userId: string | mongoose.Types.ObjectId,
    days: number = 30
  ): Promise<number> {
    const activity = await this.getRecentActivity(userId, days);

    // Weighted engagement score
    const score =
      activity.booksRated * 10 +
      activity.booksLiked * 5 +
      activity.booksAdded * 8 +
      activity.searches * 2 +
      activity.booksViewed * 1 +
      activity.followActivity * 3;

    // Normalize to 0-100 (assuming 200 points is max engagement)
    return Math.min(Math.round((score / 200) * 100), 100);
  }

  /**
   * Check if user is active (for recommendation pre-computation)
   */
  async isActiveUser(
    userId: string | mongoose.Types.ObjectId,
    days: number = 7
  ): Promise<boolean> {
    const activity = await this.getRecentActivity(userId, days);

    // User is active if they have any meaningful interaction in the last week
    return (
      activity.booksRated > 0 ||
      activity.booksLiked > 0 ||
      activity.booksAdded > 0 ||
      activity.searches > 0
    );
  }
}

export default EventTracker;
