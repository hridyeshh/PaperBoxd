import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * RecommendationLog Model
 *
 * Tracks which recommendations were shown to users and how they responded.
 * Used for evaluating recommendation quality and A/B testing.
 */

// ============================================
// INTERFACES
// ============================================

export interface IRecommendationContext {
  page: string;            // 'home', 'book-detail', 'friends', 'profile'
  time: Date;
  sessionId: string;
  algorithm: string;       // 'genre-based', 'friend-activity', 'hybrid', 'similar-books'
  source?: string;         // Additional context about source
}

export interface IScoreBreakdown {
  genre: number;
  author: number;
  quality: number;
  friends: number;
  trending: number;
  recency: number;
  diversity: number;
}

export interface IRecommendationLog extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;

  // Recommendation metadata
  algorithm: string;
  score: number;
  scoreBreakdown?: IScoreBreakdown;
  reason: string;
  position: number;        // 1-20 (rank in list)
  context: IRecommendationContext;

  // User response tracking
  shown: boolean;
  shownAt?: Date;
  clicked: boolean;
  clickedAt?: Date;
  converted: boolean;      // Added to shelf, rated, liked
  convertedAt?: Date;
  convertedAction?: 'rated' | 'added_to_shelf' | 'liked' | 'added_to_tbr' | 'started_reading';
  dismissed: boolean;      // User explicitly dismissed
  dismissedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IRecommendationLogModel extends Model<IRecommendationLog> {
  logRecommendations(
    userId: mongoose.Types.ObjectId,
    recommendations: Array<{
      bookId: mongoose.Types.ObjectId;
      algorithm: string;
      score: number;
      scoreBreakdown?: IScoreBreakdown;
      reason: string;
      position: number;
    }>,
    context: IRecommendationContext
  ): Promise<IRecommendationLog[]>;
  updateRecommendationStatus(
    userId: mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    status: 'shown' | 'clicked' | 'converted' | 'dismissed',
    convertedAction?: 'rated' | 'added_to_shelf' | 'liked' | 'added_to_tbr' | 'started_reading'
  ): Promise<IRecommendationLog | null>;
  getAlgorithmMetrics(
    algorithm: string,
    days?: number
  ): Promise<{
    total: number;
    shown: number;
    clicked: number;
    converted: number;
    dismissed: number;
    ctr: number;
    conversionRate: number;
    avgScore: number;
    avgPosition: number;
  }>;
  getUserRecommendations(
    userId: mongoose.Types.ObjectId,
    limit?: number
  ): Promise<IRecommendationLog[]>;
  wasRecentlyRecommended(
    userId: mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    days?: number
  ): Promise<boolean>;
  getTopPerformers(
    limit?: number,
    days?: number
  ): Promise<Array<{
    bookId: mongoose.Types.ObjectId;
    shown: number;
    clicked: number;
    converted: number;
    ctr: number;
    conversionRate: number;
  }>>;
  compareAlgorithms(
    algorithmA: string,
    algorithmB: string,
    days?: number
  ): Promise<{
    algorithmA: any;
    algorithmB: any;
    winner?: string;
  }>;
}

// ============================================
// SCHEMA
// ============================================

const RecommendationContextSchema = new Schema({
  page: { type: String, required: true },
  time: { type: Date, default: Date.now },
  sessionId: { type: String, required: true },
  algorithm: { type: String, required: true },
  source: { type: String },
}, { _id: false });

const ScoreBreakdownSchema = new Schema({
  genre: { type: Number, default: 0 },
  author: { type: Number, default: 0 },
  quality: { type: Number, default: 0 },
  friends: { type: Number, default: 0 },
  trending: { type: Number, default: 0 },
  recency: { type: Number, default: 0 },
  diversity: { type: Number, default: 0 },
}, { _id: false });

const RecommendationLogSchema = new Schema<IRecommendationLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true,
    },

    algorithm: {
      type: String,
      required: true,
      index: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    scoreBreakdown: ScoreBreakdownSchema,

    reason: {
      type: String,
      required: true,
    },

    position: {
      type: Number,
      required: true,
      min: 1,
    },

    context: {
      type: RecommendationContextSchema,
      required: true,
    },

    // User response tracking
    shown: {
      type: Boolean,
      default: false,
      index: true,
    },

    shownAt: Date,

    clicked: {
      type: Boolean,
      default: false,
      index: true,
    },

    clickedAt: Date,

    converted: {
      type: Boolean,
      default: false,
      index: true,
    },

    convertedAt: Date,

    convertedAction: {
      type: String,
      enum: ['rated', 'added_to_shelf', 'liked', 'added_to_tbr', 'started_reading'],
    },

    dismissed: {
      type: Boolean,
      default: false,
    },

    dismissedAt: Date,
  },
  {
    timestamps: true,
    collection: 'recommendationlogs',
  }
);

// ============================================
// INDEXES
// ============================================

// Compound indexes for common queries
RecommendationLogSchema.index({ userId: 1, createdAt: -1 });
RecommendationLogSchema.index({ bookId: 1, shown: 1 });
RecommendationLogSchema.index({ algorithm: 1, converted: 1 });
RecommendationLogSchema.index({ userId: 1, bookId: 1, 'context.algorithm': 1 });

// For analytics queries
RecommendationLogSchema.index({ 'context.page': 1, shown: 1 });
RecommendationLogSchema.index({ shown: 1, clicked: 1, converted: 1 });

// TTL index - delete logs older than 180 days
RecommendationLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 180 * 24 * 60 * 60 } // 180 days
);

// ============================================
// INSTANCE METHODS
// ============================================

RecommendationLogSchema.methods = {
  /**
   * Mark recommendation as shown
   */
  markAsShown(this: IRecommendationLog): void {
    this.shown = true;
    this.shownAt = new Date();
  },

  /**
   * Mark recommendation as clicked
   */
  markAsClicked(this: IRecommendationLog): void {
    this.clicked = true;
    this.clickedAt = new Date();
  },

  /**
   * Mark recommendation as converted
   */
  markAsConverted(
    this: IRecommendationLog,
    action: 'rated' | 'added_to_shelf' | 'liked' | 'added_to_tbr' | 'started_reading'
  ): void {
    this.converted = true;
    this.convertedAt = new Date();
    this.convertedAction = action;
  },

  /**
   * Mark recommendation as dismissed
   */
  markAsDismissed(this: IRecommendationLog): void {
    this.dismissed = true;
    this.dismissedAt = new Date();
  },
};

// ============================================
// STATIC METHODS
// ============================================

RecommendationLogSchema.statics = {
  /**
   * Log a batch of recommendations
   */
  async logRecommendations(
    this: Model<IRecommendationLog>,
    userId: mongoose.Types.ObjectId,
    recommendations: Array<{
      bookId: mongoose.Types.ObjectId;
      algorithm: string;
      score: number;
      scoreBreakdown?: IScoreBreakdown;
      reason: string;
      position: number;
    }>,
    context: IRecommendationContext
  ): Promise<IRecommendationLog[]> {
    const logs = recommendations.map((rec) => ({
      userId,
      bookId: rec.bookId,
      algorithm: rec.algorithm,
      score: rec.score,
      scoreBreakdown: rec.scoreBreakdown,
      reason: rec.reason,
      position: rec.position,
      context,
      shown: false,
      clicked: false,
      converted: false,
      dismissed: false,
    }));

    return this.insertMany(logs);
  },

  /**
   * Update recommendation status (shown, clicked, converted, dismissed)
   */
  async updateRecommendationStatus(
    this: Model<IRecommendationLog>,
    userId: mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    status: 'shown' | 'clicked' | 'converted' | 'dismissed',
    convertedAction?: 'rated' | 'added_to_shelf' | 'liked' | 'added_to_tbr' | 'started_reading'
  ): Promise<IRecommendationLog | null> {
    const update: any = {
      [status]: true,
      [`${status}At`]: new Date(),
    };

    if (status === 'converted' && convertedAction) {
      update.convertedAction = convertedAction;
    }

    // Find the most recent recommendation for this user-book pair
    return this.findOneAndUpdate(
      {
        userId,
        bookId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Within last 7 days
      },
      { $set: update },
      { new: true, sort: { createdAt: -1 } }
    ).exec();
  },

  /**
   * Get recommendation metrics for a specific algorithm
   */
  async getAlgorithmMetrics(
    this: Model<IRecommendationLog>,
    algorithm: string,
    days: number = 7
  ): Promise<{
    total: number;
    shown: number;
    clicked: number;
    converted: number;
    dismissed: number;
    ctr: number;
    conversionRate: number;
    avgScore: number;
    avgPosition: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          algorithm,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          shown: { $sum: { $cond: ['$shown', 1, 0] } },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          converted: { $sum: { $cond: ['$converted', 1, 0] } },
          dismissed: { $sum: { $cond: ['$dismissed', 1, 0] } },
          avgScore: { $avg: '$score' },
          avgPosition: { $avg: '$position' },
        },
      },
    ];

    const results = await this.aggregate(pipeline).exec();

    if (results.length === 0) {
      return {
        total: 0,
        shown: 0,
        clicked: 0,
        converted: 0,
        dismissed: 0,
        ctr: 0,
        conversionRate: 0,
        avgScore: 0,
        avgPosition: 0,
      };
    }

    const metrics = results[0];

    return {
      total: metrics.total,
      shown: metrics.shown,
      clicked: metrics.clicked,
      converted: metrics.converted,
      dismissed: metrics.dismissed,
      ctr: metrics.shown > 0 ? (metrics.clicked / metrics.shown) * 100 : 0,
      conversionRate: metrics.clicked > 0 ? (metrics.converted / metrics.clicked) * 100 : 0,
      avgScore: metrics.avgScore || 0,
      avgPosition: metrics.avgPosition || 0,
    };
  },

  /**
   * Get user's recommendation history
   */
  async getUserRecommendations(
    this: Model<IRecommendationLog>,
    userId: mongoose.Types.ObjectId,
    limit: number = 50
  ): Promise<IRecommendationLog[]> {
    return this.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('bookId')
      .exec();
  },

  /**
   * Check if book was recently recommended to user
   */
  async wasRecentlyRecommended(
    this: Model<IRecommendationLog>,
    userId: mongoose.Types.ObjectId,
    bookId: mongoose.Types.ObjectId,
    days: number = 7
  ): Promise<boolean> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const count = await this.countDocuments({
      userId,
      bookId,
      createdAt: { $gte: startDate },
    }).exec();

    return count > 0;
  },

  /**
   * Get top performing recommendations (highest conversion rate)
   */
  async getTopPerformers(
    this: Model<IRecommendationLog>,
    limit: number = 20,
    days: number = 30
  ): Promise<Array<{
    bookId: mongoose.Types.ObjectId;
    shown: number;
    clicked: number;
    converted: number;
    ctr: number;
    conversionRate: number;
  }>> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate },
          shown: true,
        },
      },
      {
        $group: {
          _id: '$bookId',
          shown: { $sum: 1 },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          converted: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      {
        $match: {
          shown: { $gte: 10 }, // At least 10 impressions
        },
      },
      {
        $project: {
          bookId: '$_id',
          shown: 1,
          clicked: 1,
          converted: 1,
          ctr: {
            $multiply: [{ $divide: ['$clicked', '$shown'] }, 100],
          },
          conversionRate: {
            $multiply: [
              {
                $cond: [
                  { $gt: ['$clicked', 0] },
                  { $divide: ['$converted', '$clicked'] },
                  0,
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { conversionRate: -1 as const, ctr: -1 as const } },
      { $limit: limit },
    ] as any[];

    const results = await this.aggregate(pipeline).exec();

    return results.map((r) => ({
      bookId: r.bookId,
      shown: r.shown,
      clicked: r.clicked,
      converted: r.converted,
      ctr: r.ctr,
      conversionRate: r.conversionRate,
    }));
  },

  /**
   * Get A/B test results comparing algorithms
   */
  async compareAlgorithms(
    this: Model<IRecommendationLog>,
    algorithmA: string,
    algorithmB: string,
    days: number = 7
  ): Promise<{
    algorithmA: any;
    algorithmB: any;
    winner?: string;
  }> {
    const model = this as IRecommendationLogModel;
    const metricsA = await model.getAlgorithmMetrics(algorithmA, days);
    const metricsB = await model.getAlgorithmMetrics(algorithmB, days);

    let winner: string | undefined;
    if (metricsA.conversionRate > metricsB.conversionRate * 1.1) {
      winner = algorithmA;
    } else if (metricsB.conversionRate > metricsA.conversionRate * 1.1) {
      winner = algorithmB;
    }

    return {
      algorithmA: metricsA,
      algorithmB: metricsB,
      winner,
    };
  },
};

// ============================================
// MODEL EXPORT
// ============================================

const RecommendationLog: IRecommendationLogModel =
  (mongoose.models.RecommendationLog as IRecommendationLogModel) ||
  mongoose.model<IRecommendationLog, IRecommendationLogModel>('RecommendationLog', RecommendationLogSchema);

export default RecommendationLog;
