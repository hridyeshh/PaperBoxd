import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * UserPreference Model
 *
 * Stores computed user preferences and interaction history for the recommendation system.
 * This model is separate from User to keep recommendation data isolated and performant.
 */

// ============================================
// INTERFACES
// ============================================

export interface IGenreWeight {
  genre: string;
  weight: number;
  lastUpdated: Date;
}

export interface IAuthorWeight {
  author: string;
  weight: number;
  lastUpdated: Date;
}

export interface IBookView {
  bookId: mongoose.Types.ObjectId;
  timestamp: Date;
  duration: number;  // seconds
  sessionId: string;
}

export interface ISearchQuery {
  query: string;
  timestamp: Date;
  resultsClicked: mongoose.Types.ObjectId[];
}

export interface IOnboarding {
  genres: IGenreWeight[];
  favoriteAuthors: string[];
  completedAt: Date;
}

export interface IImplicitPreferences {
  genreWeights: Map<string, number>;
  authorWeights: Map<string, number>;
  avgPageLength: number;
  diversityScore: number;  // 0-1 (0=narrow, 1=diverse)
  readingVelocity: number; // books per month
  lastComputed: Date;
}

export interface IInteractions {
  views: IBookView[];
  searches: ISearchQuery[];
}

export interface IUserPreference extends Document {
  userId: mongoose.Types.ObjectId;
  username?: string; // Username of the user who completed onboarding

  // Onboarding quiz data
  onboarding?: IOnboarding;

  // Computed preferences from user behavior
  implicitPreferences: IImplicitPreferences;

  // Interaction tracking
  interactions: IInteractions;

  // Cache metadata
  lastRecommendationGenerated?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addBookView(bookId: mongoose.Types.ObjectId, duration: number, sessionId: string): void;
  addSearchQuery(query: string, resultsClicked?: mongoose.Types.ObjectId[]): void;
  needsRecomputation(): boolean;
  getTopGenres(n?: number): Array<{ genre: string; weight: number }>;
  getTopAuthors(n?: number): Array<{ author: string; weight: number }>;
}

// Interface for static methods
export interface IUserPreferenceModel extends Model<IUserPreference> {
  findOrCreate(userId: mongoose.Types.ObjectId): Promise<IUserPreference>;
  getUsersNeedingRecomputation(limit?: number): Promise<IUserPreference[]>;
}

// ============================================
// SCHEMA
// ============================================

const GenreWeightSchema = new Schema({
  genre: { type: String, required: true },
  weight: { type: Number, required: true, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, { _id: false });

// AuthorWeightSchema is defined but not used - keeping for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AuthorWeightSchema = new Schema({
  author: { type: String, required: true },
  weight: { type: Number, required: true, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, { _id: false });

const BookViewSchema = new Schema({
  bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number, default: 0 },
  sessionId: { type: String, required: true },
}, { _id: false });

const SearchQuerySchema = new Schema({
  query: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  resultsClicked: [{ type: Schema.Types.ObjectId, ref: 'Book' }],
}, { _id: false });

const OnboardingSchema = new Schema({
  genres: [GenreWeightSchema],
  favoriteAuthors: [{ type: String }],
  completedAt: { type: Date, default: Date.now },
}, { _id: false });

const ImplicitPreferencesSchema = new Schema({
  genreWeights: {
    type: Schema.Types.Map,
    of: Number,
    default: () => new Map(),
  },
  authorWeights: {
    type: Schema.Types.Map,
    of: Number,
    default: () => new Map(),
  },
  avgPageLength: { type: Number, default: 0 },
  diversityScore: { type: Number, default: 0, min: 0, max: 1 },
  readingVelocity: { type: Number, default: 0 },
  lastComputed: { type: Date, default: Date.now },
}, { _id: false });

const InteractionsSchema = new Schema({
  views: {
    type: [BookViewSchema],
    default: [],
  },
  searches: {
    type: [SearchQuerySchema],
    default: [],
  },
}, { _id: false });

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // Index is created explicitly below to avoid duplicate index warning
    },

    username: {
      type: String,
      required: false,
      index: true,
    },

    onboarding: OnboardingSchema,

    implicitPreferences: {
      type: ImplicitPreferencesSchema,
      required: true,
      default: () => ({
        genreWeights: {},
        authorWeights: {},
        avgPageLength: 0,
        diversityScore: 0,
        readingVelocity: 0,
        lastComputed: new Date(),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, // Mongoose TypeScript types have limitations with nested schemas

    interactions: {
      type: InteractionsSchema,
      default: () => ({
        views: [],
        searches: [],
      }),
    },

    lastRecommendationGenerated: { type: Date },
  },
  {
    timestamps: true,
    collection: 'userpreferences',
  }
);

// Transform plain objects to Maps when loading documents
UserPreferenceSchema.post('init', function(doc: IUserPreference) {
  if (doc.implicitPreferences) {
    // Convert genreWeights from plain object to Map if needed
    if (doc.implicitPreferences.genreWeights && !(doc.implicitPreferences.genreWeights instanceof Map)) {
      const genreMap = new Map<string, number>();
      Object.entries(doc.implicitPreferences.genreWeights as Record<string, number>).forEach(([key, value]) => {
        genreMap.set(key, value as number);
      });
      doc.implicitPreferences.genreWeights = genreMap;
      doc.markModified('implicitPreferences.genreWeights');
    }
    
    // Convert authorWeights from plain object to Map if needed
    if (doc.implicitPreferences.authorWeights && !(doc.implicitPreferences.authorWeights instanceof Map)) {
      const authorMap = new Map<string, number>();
      Object.entries(doc.implicitPreferences.authorWeights as Record<string, number>).forEach(([key, value]) => {
        authorMap.set(key, value as number);
      });
      doc.implicitPreferences.authorWeights = authorMap;
      doc.markModified('implicitPreferences.authorWeights');
    }
  }
});

// ============================================
// INDEXES
// ============================================

UserPreferenceSchema.index({ userId: 1 }, { unique: true });
UserPreferenceSchema.index({ 'implicitPreferences.lastComputed': 1 });
UserPreferenceSchema.index({ lastRecommendationGenerated: 1 });

// Limit interaction arrays to prevent unbounded growth
UserPreferenceSchema.index({ 'interactions.views.timestamp': -1 });
UserPreferenceSchema.index({ 'interactions.searches.timestamp': -1 });

// ============================================
// INSTANCE METHODS
// ============================================

UserPreferenceSchema.methods = {
  /**
   * Add a book view to interaction history
   * Keeps only the last 100 views to prevent unbounded growth
   */
  addBookView(
    this: IUserPreference,
    bookId: mongoose.Types.ObjectId,
    duration: number,
    sessionId: string
  ): void {
    this.interactions.views.push({
      bookId,
      timestamp: new Date(),
      duration,
      sessionId,
    });

    // Keep only last 100 views
    if (this.interactions.views.length > 100) {
      this.interactions.views = this.interactions.views.slice(-100);
    }
  },

  /**
   * Add a search query to interaction history
   */
  addSearchQuery(
    this: IUserPreference,
    query: string,
    resultsClicked: mongoose.Types.ObjectId[] = []
  ): void {
    this.interactions.searches.push({
      query,
      timestamp: new Date(),
      resultsClicked,
    });

    // Keep only last 50 searches
    if (this.interactions.searches.length > 50) {
      this.interactions.searches = this.interactions.searches.slice(-50);
    }
  },

  /**
   * Check if profile needs recomputation
   * Returns true if last computed more than 24 hours ago
   */
  needsRecomputation(this: IUserPreference): boolean {
    if (!this.implicitPreferences.lastComputed) return true;

    const hoursSinceComputation =
      (Date.now() - this.implicitPreferences.lastComputed.getTime()) / (1000 * 60 * 60);

    return hoursSinceComputation >= 24;
  },

  /**
   * Get top N genres by weight
   */
  getTopGenres(this: IUserPreference, n: number = 5): Array<{ genre: string; weight: number }> {
    const entries = Array.from(this.implicitPreferences.genreWeights.entries());
    return entries
      .map(([genre, weight]) => ({ genre, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, n);
  },

  /**
   * Get top N authors by weight
   */
  getTopAuthors(this: IUserPreference, n: number = 5): Array<{ author: string; weight: number }> {
    const entries = Array.from(this.implicitPreferences.authorWeights.entries());
    return entries
      .map(([author, weight]) => ({ author, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, n);
  },
};

// ============================================
// STATIC METHODS
// ============================================

UserPreferenceSchema.statics.findOrCreate = async function(
    userId: mongoose.Types.ObjectId
  ): Promise<IUserPreference> {
    let preference = await this.findOne({ userId });

    if (!preference) {
      preference = await this.create({
        userId,
        implicitPreferences: {
        genreWeights: {},
        authorWeights: {},
          avgPageLength: 0,
          diversityScore: 0,
          readingVelocity: 0,
          lastComputed: new Date(),
        },
        interactions: {
          views: [],
          searches: [],
        },
      });
    }

    return preference;
};

UserPreferenceSchema.statics.getUsersNeedingRecomputation = async function(
    limit: number = 100
  ): Promise<IUserPreference[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.find({
      $or: [
        { 'implicitPreferences.lastComputed': { $lt: oneDayAgo } },
        { 'implicitPreferences.lastComputed': { $exists: false } },
      ],
    })
      .limit(limit)
      .exec();
};

// ============================================
// MODEL EXPORT
// ============================================

const UserPreference: IUserPreferenceModel =
  (mongoose.models.UserPreference as IUserPreferenceModel) ||
  mongoose.model<IUserPreference, IUserPreferenceModel>('UserPreference', UserPreferenceSchema);

export default UserPreference;
