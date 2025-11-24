/**
 * Recommendation System Configuration
 *
 * This file contains all tunable parameters for the recommendation algorithm.
 * Adjust these weights to fine-tune recommendation quality.
 */

export const RecommendationConfig = {
  /**
   * SCORING WEIGHTS
   * These weights determine how much each factor contributes to the final recommendation score.
   * All weights should sum to approximately 1.0 for balanced recommendations.
   */
  scoring: {
    genreMatch: 0.40,        // Primary factor: matches user's top genres
    authorMatch: 0.20,       // Books by authors they love
    qualityScore: 0.15,      // Book's average rating (4.0+ preferred)
    friendActivity: 0.10,    // How many friends liked this
    trendingBonus: 0.08,     // Currently popular in their genres
    recencyBonus: 0.05,      // Published recently (bonus for new books)
    diversityBonus: 0.02,    // Occasionally recommend outside comfort zone
  },

  /**
   * SIGNAL WEIGHTS
   * How much each user action contributes to preference learning.
   * Higher values = stronger signal about user preferences.
   */
  signals: {
    rating5Star: 2.0,        // Strongest positive signal
    rating4Star: 1.0,
    rating3Star: 0.5,
    rating2Star: -0.5,       // Negative signal - they didn't like it
    rating1Star: -1.0,       // Strong negative signal
    liked: 1.5,              // Saved/starred book
    bookshelfRead: 1.0,      // Finished reading
    tbrAdded: 0.7,           // Added to want-to-read
    currentlyReading: 0.8,   // Started reading
    favoriteBook: 1.8,       // Marked as favorite
    topBook: 2.0,            // One of their top books
    viewedBook: 0.3,         // Just viewed the book page
    sharedBook: 1.8,         // Shared with others
    addedToList: 0.9,        // Added to custom list
  },

  /**
   * FRIENDSHIP STRENGTH CALCULATION
   * Determines how much weight to give friend recommendations.
   */
  friendship: {
    baseStrength: 0.3,              // Base friendship value
    interactionWeight: 0.05,        // Weight per interaction (likes, comments)
    maxInteractionBonus: 0.4,       // Cap on interaction bonus
    mutualFriendWeight: 0.03,       // Weight per mutual friend
    maxMutualFriendBonus: 0.3,      // Cap on mutual friend bonus
    tasteSimilarityWeight: 0.2,     // Weight for genre overlap
  },

  /**
   * DIVERSITY SETTINGS
   * Controls how much variety to inject into recommendations.
   */
  diversity: {
    pureQualityRatio: 0.7,          // 70% highest scoring recommendations
    diverseRatio: 0.3,              // 30% diverse recommendations (MMR)
    highDiversityUserThreshold: 0.6, // Diversity score above this = diverse reader
    highDiversityInjection: 0.20,   // 20% non-top genres for diverse readers
    lowDiversityInjection: 0.10,    // 10% adjacent genres for narrow readers
  },

  /**
   * CANDIDATE GENERATION
   * How many candidates to fetch from each source before scoring.
   */
  candidates: {
    genreBased: 50,           // Books matching user's top genres
    authorBased: 30,          // Books by favorite authors
    friendActivity: 30,       // Books friends loved
    similarToLiked: 30,       // Similar to high-rated books
    trending: 20,             // Popular in user's genres
  },

  /**
   * QUALITY FILTERS
   * Minimum thresholds for recommending books.
   */
  quality: {
    minRating: 3.5,                 // Don't recommend books below 3.5 stars
    minRatingCount: 5,              // Need at least 5 ratings to trust score
    maxPageCount: 1000,             // Don't recommend extremely long books by default
    minPageCount: 50,               // Filter out very short books
    preferredPageCountMin: 200,     // Ideal range for most readers
    preferredPageCountMax: 500,
  },

  /**
   * CONTEXT-AWARE ADJUSTMENTS
   * Time-based and behavioral filters.
   */
  context: {
    morningLightBookThreshold: 300,  // Morning: prefer books under 300 pages
    morningStartHour: 6,
    morningEndHour: 12,
    recentActivityBoostDays: 7,      // Boost genres from last 7 days of activity
    recentActivityBoostMultiplier: 1.5,
    slowReaderThreshold: 1,          // Books per month
    slowReaderPageLimit: 400,        // Limit page count for slow readers
  },

  /**
   * CACHE SETTINGS
   * Controls recommendation pre-computation and caching.
   */
  cache: {
    ttlHours: 1,                     // Recommendations cached for 1 hour
    precomputeForActiveUsers: true,  // Pre-generate for users active in last 7 days
    batchSize: 50,                   // Process 50 users per batch
    recommendationCount: 20,         // Generate 20 recommendations per user
  },

  /**
   * GENRE NORMALIZATION
   * Map various genre names to standardized categories.
   */
  genreMapping: {
    'Science Fiction': ['Sci-Fi', 'SciFi', 'Science Fiction & Fantasy', 'SF'],
    'Fantasy': ['Fantasy', 'Epic Fantasy', 'Urban Fantasy', 'High Fantasy'],
    'Mystery': ['Mystery', 'Detective', 'Crime', 'Whodunit'],
    'Thriller': ['Thriller', 'Suspense', 'Psychological Thriller'],
    'Romance': ['Romance', 'Contemporary Romance', 'Historical Romance'],
    'Horror': ['Horror', 'Gothic', 'Supernatural Horror'],
    'Historical Fiction': ['Historical', 'Historical Fiction'],
    'Biography': ['Biography', 'Memoir', 'Autobiography'],
    'Self-Help': ['Self-Help', 'Personal Development', 'Self Improvement'],
    'Business': ['Business', 'Economics', 'Management'],
    'Fiction': ['Literary Fiction', 'Contemporary Fiction', 'General Fiction'],
    'Non-Fiction': ['Nonfiction', 'Non-Fiction'],
    'Young Adult': ['YA', 'Young Adult', 'Teen'],
    'Children': ['Children', 'Kids', 'Juvenile'],
  },

  /**
   * EXPLANATION TEMPLATES
   * Templates for generating recommendation reasons.
   */
  explanations: {
    genreMatch: "Popular in {genre}",
    authorMatch: "By {author}, one of your favorite authors",
    highRated: "Because you loved '{book}'",
    friendActivity: "{friendName} and {count} others loved this",
    friendActivitySingle: "{friendName} loved this",
    trending: "Trending in {genre}",
    similarAuthors: "Fans of {author} love this",
    recentlyPublished: "New release in {genre}",
    diverse: "Something different you might enjoy",
  },

  /**
   * ALGORITHM VARIANTS
   * Enable/disable specific recommendation strategies.
   */
  features: {
    enableFriendRecommendations: true,
    enableTrendingBoost: true,
    enableRecencyBoost: true,
    enableDiversityInjection: true,
    enableContextualFilters: true,
    enableCollaborativeFiltering: false,  // Future: matrix factorization
    enableMLPredictions: false,           // Future: neural networks
  },

  /**
   * A/B TESTING
   * Assign users to different algorithm variants.
   */
  abTesting: {
    enabled: false,
    variants: {
      control: {
        name: 'control',
        percentage: 50,
        config: {},  // Use default config
      },
      highFriendWeight: {
        name: 'high_friend_weight',
        percentage: 25,
        config: {
          scoring: { friendActivity: 0.20, genreMatch: 0.30 },
        },
      },
      highDiversity: {
        name: 'high_diversity',
        percentage: 25,
        config: {
          diversity: { pureQualityRatio: 0.5, diverseRatio: 0.5 },
        },
      },
    },
  },
};

/**
 * Get configuration for a specific user (for A/B testing)
 */
export function getConfigForUser(userId: string): typeof RecommendationConfig {
  if (!RecommendationConfig.abTesting.enabled) {
    return RecommendationConfig;
  }

  // Simple hash-based assignment
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bucket = hash % 100;

  let cumulative = 0;
  for (const [, variant] of Object.entries(RecommendationConfig.abTesting.variants)) {
    cumulative += variant.percentage;
    if (bucket < cumulative) {
      // Merge variant config with default config (deep merge for nested objects)
      const variantConfig = variant.config as Partial<typeof RecommendationConfig>;
      return {
        ...RecommendationConfig,
        scoring: {
          ...RecommendationConfig.scoring,
          ...(variantConfig.scoring || {}),
        },
        signals: {
          ...RecommendationConfig.signals,
          ...(variantConfig.signals || {}),
        },
        friendship: {
          ...RecommendationConfig.friendship,
          ...(variantConfig.friendship || {}),
        },
        diversity: {
          ...RecommendationConfig.diversity,
          ...(variantConfig.diversity || {}),
        },
        candidates: {
          ...RecommendationConfig.candidates,
          ...(variantConfig.candidates || {}),
        },
        quality: {
          ...RecommendationConfig.quality,
          ...(variantConfig.quality || {}),
        },
        context: {
          ...RecommendationConfig.context,
          ...(variantConfig.context || {}),
        },
        explanations: {
          ...RecommendationConfig.explanations,
          ...(variantConfig.explanations || {}),
        },
        features: {
          ...RecommendationConfig.features,
          ...(variantConfig.features || {}),
        },
        abTesting: RecommendationConfig.abTesting, // Keep original abTesting config
      };
    }
  }

  return RecommendationConfig;
}

/**
 * Normalize genre name to standard category
 */
export function normalizeGenre(genre: string): string {
  for (const [standard, variations] of Object.entries(RecommendationConfig.genreMapping)) {
    if (variations.some(v => genre.toLowerCase().includes(v.toLowerCase()))) {
      return standard;
    }
  }
  return genre; // Return original if no mapping found
}

export default RecommendationConfig;
