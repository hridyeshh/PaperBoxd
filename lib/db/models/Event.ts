import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Event Model
 *
 * Logs every user interaction for analytics and preference learning.
 * Events are used to build user profiles and track recommendation effectiveness.
 */

// ============================================
// ENUMS & TYPES
// ============================================

export enum EventType {
  // Book interactions
  BOOK_VIEWED = 'book.viewed',
  BOOK_RATED = 'book.rated',
  BOOK_LIKED = 'book.liked',
  BOOK_UNLIKED = 'book.unliked',
  BOOK_ADDED_TO_SHELF = 'book.added_to_shelf',
  BOOK_REMOVED_FROM_SHELF = 'book.removed_from_shelf',
  BOOK_ADDED_TO_TBR = 'book.added_to_tbr',
  BOOK_REMOVED_FROM_TBR = 'book.removed_from_tbr',
  BOOK_STARTED_READING = 'book.started_reading',
  BOOK_FINISHED_READING = 'book.finished_reading',
  BOOK_ADDED_TO_FAVORITES = 'book.added_to_favorites',
  BOOK_ADDED_TO_TOP = 'book.added_to_top',
  BOOK_REVIEWED = 'book.reviewed',
  BOOK_SHARED = 'book.shared',

  // Search & discovery
  BOOK_SEARCHED = 'book.searched',
  BOOK_CLICKED_FROM_SEARCH = 'book.clicked_from_search',
  BOOK_CLICKED_FROM_RECOMMENDATION = 'book.clicked_from_recommendation',
  BOOK_CLICKED_FROM_SIMILAR = 'book.clicked_from_similar',
  BOOK_CLICKED_FROM_FRIENDS = 'book.clicked_from_friends',

  // Social interactions
  USER_FOLLOWED = 'user.followed',
  USER_UNFOLLOWED = 'user.unfollowed',
  USER_SEARCHED = 'user.searched',
  USER_PROFILE_VIEWED = 'user.profile_viewed',

  // List management
  LIST_CREATED = 'list.created',
  LIST_UPDATED = 'list.updated',
  LIST_DELETED = 'list.deleted',
  BOOK_ADDED_TO_LIST = 'book.added_to_list',
  BOOK_REMOVED_FROM_LIST = 'book.removed_from_list',

  // Recommendation interactions
  RECOMMENDATION_VIEWED = 'recommendation.viewed',
  RECOMMENDATION_CLICKED = 'recommendation.clicked',
  RECOMMENDATION_DISMISSED = 'recommendation.dismissed',
  RECOMMENDATION_CONVERTED = 'recommendation.converted',

  // Onboarding
  ONBOARDING_STARTED = 'onboarding.started',
  ONBOARDING_COMPLETED = 'onboarding.completed',
  GENRE_SELECTED = 'genre.selected',
  AUTHOR_SELECTED = 'author.selected',
}

export interface IEventMetadata {
  // Book-related
  bookId?: mongoose.Types.ObjectId;
  rating?: number;
  shelf?: 'bookshelf' | 'tbr' | 'liked' | 'currentlyReading' | 'favorites' | 'topBooks';
  duration?: number;
  review?: string;

  // Search-related
  query?: string;
  resultsCount?: number;
  clickPosition?: number;

  // Social-related
  friendId?: mongoose.Types.ObjectId;
  targetUserId?: mongoose.Types.ObjectId;

  // List-related
  listId?: string;
  listTitle?: string;

  // Recommendation-related
  position?: number;
  algorithm?: string;
  score?: number;
  reason?: string;
  source?: 'home' | 'similar' | 'friends' | 'trending';

  // Onboarding-related
  genres?: string[];
  authors?: string[];

  // General context
  page?: string;
  referrer?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';

  // Any additional custom data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface IEvent extends Document {
  type: EventType;
  userId: mongoose.Types.ObjectId;
  timestamp: Date;
  sessionId: string;
  metadata: IEventMetadata;

  // Timestamps
  createdAt: Date;
}

// Interface for static methods
export interface IEventModel extends Model<IEvent> {
  trackEvent(
    type: EventType,
    userId: mongoose.Types.ObjectId,
    metadata?: IEventMetadata,
    sessionId?: string
  ): Promise<IEvent>;
  getUserEvents(
    userId: mongoose.Types.ObjectId,
    limit?: number,
    eventTypes?: EventType[]
  ): Promise<IEvent[]>;
  getBookStats(
    bookId: mongoose.Types.ObjectId,
    days?: number
  ): Promise<{
    views: number;
    likes: number;
    ratings: number;
    avgRating: number;
    tbrAdds: number;
    reads: number;
  }>;
  getTrendingBooksInGenre(
    genre: string,
    days?: number,
    limit?: number
  ): Promise<Array<{ bookId: mongoose.Types.ObjectId; score: number }>>;
  getUserSearches(
    userId: mongoose.Types.ObjectId,
    limit?: number
  ): Promise<string[]>;
  calculateReadingVelocity(
    userId: mongoose.Types.ObjectId,
    months?: number
  ): Promise<number>;
  getRecommendationMetrics(
    algorithm?: string,
    days?: number
  ): Promise<{
    shown: number;
    clicked: number;
    converted: number;
    ctr: number;
    conversionRate: number;
  }>;
}

// ============================================
// SCHEMA
// ============================================

const EventSchema = new Schema<IEvent>(
  {
    type: {
      type: String,
      enum: Object.values(EventType),
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'events',
  }
);

// ============================================
// INDEXES
// ============================================

// Compound indexes for common queries
EventSchema.index({ userId: 1, timestamp: -1 });
EventSchema.index({ type: 1, timestamp: -1 });
EventSchema.index({ userId: 1, type: 1, timestamp: -1 });
EventSchema.index({ sessionId: 1, timestamp: -1 });

// For book popularity tracking
EventSchema.index({ 'metadata.bookId': 1, type: 1 });

// For recommendation analytics
EventSchema.index({ 'metadata.algorithm': 1, type: 1 });
EventSchema.index({ 'metadata.source': 1, type: 1 });

// TTL index - delete events older than 90 days to save space
EventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);

// ============================================
// STATIC METHODS
// ============================================

EventSchema.statics = {
  /**
   * Track a new event
   */
  async trackEvent(
    this: Model<IEvent>,
    type: EventType,
    userId: mongoose.Types.ObjectId,
    metadata: IEventMetadata = {},
    sessionId?: string
  ): Promise<IEvent> {
    const event = await this.create({
      type,
      userId,
      metadata,
      sessionId: sessionId || generateSessionId(),
      timestamp: new Date(),
    });

    return event;
  },

  /**
   * Get user's recent events
   */
  async getUserEvents(
    this: Model<IEvent>,
    userId: mongoose.Types.ObjectId,
    limit: number = 100,
    eventTypes?: EventType[]
  ): Promise<IEvent[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId };

    if (eventTypes && eventTypes.length > 0) {
      query.type = { $in: eventTypes };
    }

    return this.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  },

  /**
   * Get book interaction stats
   */
  async getBookStats(
    this: Model<IEvent>,
    bookId: mongoose.Types.ObjectId,
    days: number = 30
  ): Promise<{
    views: number;
    likes: number;
    ratings: number;
    avgRating: number;
    tbrAdds: number;
    reads: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await this.find({
      'metadata.bookId': bookId,
      timestamp: { $gte: startDate },
    }).exec();

    const stats = {
      views: 0,
      likes: 0,
      ratings: 0,
      avgRating: 0,
      tbrAdds: 0,
      reads: 0,
    };

    let totalRating = 0;
    let ratingCount = 0;

    events.forEach((event) => {
      switch (event.type) {
        case EventType.BOOK_VIEWED:
          stats.views++;
          break;
        case EventType.BOOK_LIKED:
          stats.likes++;
          break;
        case EventType.BOOK_RATED:
          stats.ratings++;
          if (event.metadata.rating) {
            totalRating += event.metadata.rating;
            ratingCount++;
          }
          break;
        case EventType.BOOK_ADDED_TO_TBR:
          stats.tbrAdds++;
          break;
        case EventType.BOOK_FINISHED_READING:
          stats.reads++;
          break;
      }
    });

    stats.avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    return stats;
  },

  /**
   * Get trending books in a genre
   */
  async getTrendingBooksInGenre(
    this: Model<IEvent>,
    genre: string,
    days: number = 7,
    limit: number = 20
  ): Promise<Array<{ bookId: mongoose.Types.ObjectId; score: number }>> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          type: {
            $in: [
              EventType.BOOK_RATED,
              EventType.BOOK_LIKED,
              EventType.BOOK_ADDED_TO_TBR,
              EventType.BOOK_FINISHED_READING,
            ],
          },
          timestamp: { $gte: startDate },
          'metadata.bookId': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$metadata.bookId',
          events: { $sum: 1 },
          avgRating: { $avg: '$metadata.rating' },
        },
      },
      {
        $project: {
          bookId: '$_id',
          score: {
            $add: [
              { $multiply: ['$events', 1] },
              { $multiply: [{ $ifNull: ['$avgRating', 0] }, 2] },
            ],
          },
        },
      },
      { $sort: { score: -1 as const } },
      { $limit: limit },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any[];

    const results = await this.aggregate(pipeline).exec();

    return results.map((r) => ({
      bookId: r.bookId,
      score: r.score,
    }));
  },

  /**
   * Get user's search queries
   */
  async getUserSearches(
    this: Model<IEvent>,
    userId: mongoose.Types.ObjectId,
    limit: number = 50
  ): Promise<string[]> {
    const events = await this.find({
      userId,
      type: EventType.BOOK_SEARCHED,
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();

    return events.map((e) => e.metadata.query || '').filter((q) => q.length > 0);
  },

  /**
   * Calculate user's reading velocity (books per month)
   */
  async calculateReadingVelocity(
    this: Model<IEvent>,
    userId: mongoose.Types.ObjectId,
    months: number = 6
  ): Promise<number> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const finishedBooks = await this.countDocuments({
      userId,
      type: EventType.BOOK_FINISHED_READING,
      timestamp: { $gte: startDate },
    }).exec();

    return finishedBooks / months;
  },

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationMetrics(
    this: Model<IEvent>,
    algorithm?: string,
    days: number = 7
  ): Promise<{
    shown: number;
    clicked: number;
    converted: number;
    ctr: number;
    conversionRate: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      type: { $in: [EventType.RECOMMENDATION_VIEWED, EventType.RECOMMENDATION_CLICKED, EventType.RECOMMENDATION_CONVERTED] },
      timestamp: { $gte: startDate },
    };

    if (algorithm) {
      query['metadata.algorithm'] = algorithm;
    }

    const events = await this.find(query).exec();

    let shown = 0;
    let clicked = 0;
    let converted = 0;

    events.forEach((event) => {
      switch (event.type) {
        case EventType.RECOMMENDATION_VIEWED:
          shown++;
          break;
        case EventType.RECOMMENDATION_CLICKED:
          clicked++;
          break;
        case EventType.RECOMMENDATION_CONVERTED:
          converted++;
          break;
      }
    });

    return {
      shown,
      clicked,
      converted,
      ctr: shown > 0 ? (clicked / shown) * 100 : 0,
      conversionRate: clicked > 0 ? (converted / clicked) * 100 : 0,
    };
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// MODEL EXPORT
// ============================================

const Event: IEventModel =
  (mongoose.models.Event as IEventModel) ||
  mongoose.model<IEvent, IEventModel>('Event', EventSchema);

export default Event;
