import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * RecommendationCache Model
 *
 * Stores pre-computed recommendations for fast retrieval.
 * Cached recommendations are refreshed periodically (every 1 hour by default).
 */

// ============================================
// INTERFACES
// ============================================

export interface ICachedRecommendation {
  bookId: mongoose.Types.ObjectId;
  score: number;
  reason: string;
  algorithm: string;
  position: number;
  scoreBreakdown?: {
    genre: number;
    author: number;
    quality: number;
    friends: number;
    trending: number;
    recency: number;
    diversity: number;
  };
}

export interface IRecommendationCache extends Document {
  userId: mongoose.Types.ObjectId;

  // Recommendation types
  homeRecommendations: ICachedRecommendation[];
  friendRecommendations: ICachedRecommendation[];

  // Metadata
  algorithm: string;
  generatedAt: Date;
  expiresAt: Date;
  isStale: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  checkFreshness(): boolean;
  markAsStale(): void;
  getRecommendations(type: 'home' | 'friends', limit?: number): ICachedRecommendation[];
}

// Interface for static methods
export interface IRecommendationCacheModel extends Model<IRecommendationCache> {
  cacheRecommendations(
    userId: mongoose.Types.ObjectId,
    homeRecommendations: ICachedRecommendation[],
    friendRecommendations: ICachedRecommendation[],
    ttlHours?: number,
    algorithm?: string
  ): Promise<IRecommendationCache>;
  getFreshRecommendations(
    userId: mongoose.Types.ObjectId,
    type: 'home' | 'friends',
    limit?: number
  ): Promise<ICachedRecommendation[] | null>;
  invalidateCache(userId: mongoose.Types.ObjectId): Promise<void>;
  invalidateCaches(userIds: mongoose.Types.ObjectId[]): Promise<void>;
  getStaleCaches(limit?: number): Promise<IRecommendationCache[]>;
  getUsersNeedingRecommendations(
    activeUserIds: mongoose.Types.ObjectId[],
    limit?: number
  ): Promise<mongoose.Types.ObjectId[]>;
  cleanExpiredCaches(): Promise<number>;
  getCacheStats(): Promise<{
    total: number;
    fresh: number;
    stale: number;
    expired: number;
    avgAge: number;
  }>;
}

// ============================================
// SCHEMA
// ============================================

const CachedRecommendationSchema = new Schema({
  bookId: {
    type: Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  reason: {
    type: String,
    required: true,
  },
  algorithm: {
    type: String,
    required: true,
  },
  position: {
    type: Number,
    required: true,
    min: 1,
  },
  scoreBreakdown: {
    genre: { type: Number, default: 0 },
    author: { type: Number, default: 0 },
    quality: { type: Number, default: 0 },
    friends: { type: Number, default: 0 },
    trending: { type: Number, default: 0 },
    recency: { type: Number, default: 0 },
    diversity: { type: Number, default: 0 },
  },
}, { _id: false });

const RecommendationCacheSchema = new Schema<IRecommendationCache>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    homeRecommendations: {
      type: [CachedRecommendationSchema],
      default: [],
    },

    friendRecommendations: {
      type: [CachedRecommendationSchema],
      default: [],
    },

    algorithm: {
      type: String,
      required: true,
      default: 'hybrid',
    },

    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    isStale: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'recommendationcaches',
  }
);

// ============================================
// INDEXES
// ============================================

RecommendationCacheSchema.index({ userId: 1 }, { unique: true });
RecommendationCacheSchema.index({ expiresAt: 1 });
RecommendationCacheSchema.index({ isStale: 1, generatedAt: 1 });

// TTL index - delete caches older than 7 days
RecommendationCacheSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 } // 7 days
);

// ============================================
// VIRTUAL PROPERTIES
// ============================================

RecommendationCacheSchema.virtual('isFresh').get(function (this: IRecommendationCache) {
  return !this.isStale && this.expiresAt > new Date();
});

// ============================================
// INSTANCE METHODS
// ============================================

RecommendationCacheSchema.methods = {
  /**
   * Check if cache is still fresh
   */
  checkFreshness(this: IRecommendationCache): boolean {
    const now = new Date();
    const fresh = !this.isStale && this.expiresAt > now;

    if (!fresh && !this.isStale) {
      this.isStale = true;
      this.save().catch(err => console.error('Error marking cache as stale:', err));
    }

    return fresh;
  },

  /**
   * Mark cache as stale (needs refresh)
   */
  markAsStale(this: IRecommendationCache): void {
    this.isStale = true;
  },

  /**
   * Get recommendations by type
   */
  getRecommendations(
    this: IRecommendationCache,
    type: 'home' | 'friends',
    limit?: number
  ): ICachedRecommendation[] {
    const recs = type === 'home' ? this.homeRecommendations : this.friendRecommendations;
    return limit ? recs.slice(0, limit) : recs;
  },
};

// ============================================
// STATIC METHODS
// ============================================

RecommendationCacheSchema.statics = {
  /**
   * Store recommendations in cache
   */
  async cacheRecommendations(
    this: Model<IRecommendationCache>,
    userId: mongoose.Types.ObjectId,
    homeRecommendations: ICachedRecommendation[],
    friendRecommendations: ICachedRecommendation[],
    ttlHours: number = 1,
    algorithm: string = 'hybrid'
  ): Promise<IRecommendationCache> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const cache = await this.findOneAndUpdate(
      { userId },
      {
        $set: {
          homeRecommendations,
          friendRecommendations,
          algorithm,
          generatedAt: now,
          expiresAt,
          isStale: false,
        },
      },
      {
        upsert: true,
        new: true,
      }
    ).exec();

    return cache;
  },

  /**
   * Get fresh recommendations from cache
   * Returns null if cache is stale or expired
   */
  async getFreshRecommendations(
    this: Model<IRecommendationCache>,
    userId: mongoose.Types.ObjectId,
    type: 'home' | 'friends',
    limit?: number
  ): Promise<ICachedRecommendation[] | null> {
    const cache = await this.findOne({ userId }).exec();

    if (!cache || !cache.checkFreshness()) {
      return null;
    }

    return cache.getRecommendations(type, limit);
  },

  /**
   * Invalidate cache for a user (mark as stale)
   * Called when user performs significant actions (rates book, adds to shelf, etc.)
   */
  async invalidateCache(
    this: Model<IRecommendationCache>,
    userId: mongoose.Types.ObjectId
  ): Promise<void> {
    await this.updateOne(
      { userId },
      { $set: { isStale: true } }
    ).exec();
  },

  /**
   * Invalidate caches for multiple users
   */
  async invalidateCaches(
    this: Model<IRecommendationCache>,
    userIds: mongoose.Types.ObjectId[]
  ): Promise<void> {
    await this.updateMany(
      { userId: { $in: userIds } },
      { $set: { isStale: true } }
    ).exec();
  },

  /**
   * Get all stale caches that need refreshing
   */
  async getStaleCaches(
    this: Model<IRecommendationCache>,
    limit: number = 100
  ): Promise<IRecommendationCache[]> {
    const now = new Date();

    return this.find({
      $or: [
        { isStale: true },
        { expiresAt: { $lt: now } },
      ],
    })
      .sort({ generatedAt: 1 }) // Oldest first
      .limit(limit)
      .exec();
  },

  /**
   * Get users who need recommendations generated
   * (active users with no cache or stale cache)
   */
  async getUsersNeedingRecommendations(
    this: Model<IRecommendationCache>,
    activeUserIds: mongoose.Types.ObjectId[],
    limit: number = 100
  ): Promise<mongoose.Types.ObjectId[]> {
    const now = new Date();

    // Find users with stale or missing caches
    const cachedUsers = await this.find({
      userId: { $in: activeUserIds },
      isStale: false,
      expiresAt: { $gt: now },
    })
      .select('userId')
      .exec();

    const cachedUserIds = new Set(cachedUsers.map(c => c.userId.toString()));

    // Return users who need recommendations
    return activeUserIds
      .filter(id => !cachedUserIds.has(id.toString()))
      .slice(0, limit);
  },

  /**
   * Clean up expired caches
   */
  async cleanExpiredCaches(this: Model<IRecommendationCache>): Promise<number> {
    const result = await this.deleteMany({
      updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days old
    }).exec();

    return result.deletedCount || 0;
  },

  /**
   * Get cache statistics
   */
  async getCacheStats(this: Model<IRecommendationCache>): Promise<{
    total: number;
    fresh: number;
    stale: number;
    expired: number;
    avgAge: number;
  }> {
    const now = new Date();

    const pipeline = [
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                fresh: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$isStale', false] },
                          { $gt: ['$expiresAt', now] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                stale: {
                  $sum: { $cond: ['$isStale', 1, 0] },
                },
                expired: {
                  $sum: {
                    $cond: [{ $lt: ['$expiresAt', now] }, 1, 0],
                  },
                },
              },
            },
          ],
          avgAge: [
            {
              $project: {
                ageMinutes: {
                  $divide: [
                    { $subtract: [now, '$generatedAt'] },
                    1000 * 60,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgAge: { $avg: '$ageMinutes' },
              },
            },
          ],
        },
      },
    ];

    const results = await this.aggregate(pipeline).exec();

    const counts = results[0]?.counts[0] || {
      total: 0,
      fresh: 0,
      stale: 0,
      expired: 0,
    };

    const avgAge = results[0]?.avgAge[0]?.avgAge || 0;

    return {
      total: counts.total,
      fresh: counts.fresh,
      stale: counts.stale,
      expired: counts.expired,
      avgAge,
    };
  },
};

// ============================================
// MODEL EXPORT
// ============================================

const RecommendationCache: IRecommendationCacheModel =
  (mongoose.models.RecommendationCache as IRecommendationCacheModel) ||
  mongoose.model<IRecommendationCache, IRecommendationCacheModel>('RecommendationCache', RecommendationCacheSchema);

export default RecommendationCache;
