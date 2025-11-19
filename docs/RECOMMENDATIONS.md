# PaperBoxd Recommendation System

## Overview

PaperBoxd uses a **sophisticated rule-based recommendation engine** that learns from every user interaction to deliver highly personalized book recommendations. The system is designed to feel intelligent without requiring machine learning infrastructure, making it perfect for the MVP phase (0-10,000 users).

### Key Features

- ✅ **Multi-signal learning** - Learns from ratings, likes, shelves, views, searches, and more
- ✅ **Friend-based recommendations** - "Sarah and 3 others loved this"
- ✅ **Genre & author matching** - Recommends books matching your taste
- ✅ **Diversity injection** - Prevents filter bubbles with MMR algorithm
- ✅ **Context-aware** - Adjusts recommendations based on time of day, reading pace, etc.
- ✅ **Explainable** - Every recommendation comes with a reason
- ✅ **Fast** - Pre-computed and cached recommendations (<100ms response time)
- ✅ **Scalable** - MongoDB-based, no external services required

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTIONS                        │
│  (View, Rate, Like, Add to shelf, Follow, Search)          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   EVENT TRACKER                              │
│  - Captures every interaction                               │
│  - Updates UserPreference in real-time                      │
│  - Invalidates stale caches                                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              USER PROFILE BUILDER                            │
│  Computes:                                                   │
│  - Genre weights (Map<genre, score>)                        │
│  - Author preferences                                        │
│  - Reading velocity (books/month)                           │
│  - Diversity score (0-1)                                    │
│  - Avg page length preference                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│           RECOMMENDATION SERVICE (Core Algorithm)            │
│                                                              │
│  1. Generate candidates from multiple sources:              │
│     - Genre-based (50 books)                                │
│     - Author-based (30 books)                               │
│     - Similar to liked (30 books)                           │
│                                                              │
│  2. Score each book:                                        │
│     score = 0.40×genre + 0.20×author + 0.15×quality +      │
│             0.10×friends + 0.08×trending + 0.05×recency +  │
│             0.02×diversity                                   │
│                                                              │
│  3. Apply context filters (time of day, reading pace)       │
│                                                              │
│  4. Ensure diversity (MMR algorithm)                        │
│                                                              │
│  5. Generate explanations                                   │
│                                                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│               RECOMMENDATION CACHE (1 hour TTL)              │
│  Pre-computed recommendations for fast retrieval            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     API ENDPOINTS                            │
│  - GET /api/recommendations/home                            │
│  - GET /api/recommendations/friends                         │
│  - GET /api/recommendations/similar/[bookId]                │
│  - POST /api/recommendations/feedback                       │
│  - POST /api/events/track                                   │
│  - POST /api/onboarding                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Algorithm Details

### Scoring Formula

Each candidate book receives a score from 0-1 based on multiple factors:

```typescript
finalScore =
  (0.40 × genreMatch) +        // Primary: matches user's top genres
  (0.20 × authorMatch) +       // Books by authors they love
  (0.15 × qualityScore) +      // Book's average rating (4.0+ preferred)
  (0.10 × friendActivity) +    // How many friends liked this
  (0.08 × trendingBonus) +     // Currently popular in their genres
  (0.05 × recencyBonus) +      // Published recently (bonus for new books)
  (0.02 × diversityBonus)      // Occasionally recommend outside comfort zone
```

### Genre Matching (Sophisticated)

Not just simple matching—considers:

1. **Multiple genre overlap**: Book with ["Sci-Fi", "Thriller"] scores higher than ["Sci-Fi"] alone
2. **Weighted user preferences**: Recent high-rated books weigh more
3. **Genre normalization**: "Science Fiction", "SciFi", "SF" all map to "Science Fiction"

```typescript
// Example:
// User loves: ["Sci-Fi": 12, "Thriller": 8, "Fantasy": 5]
// Book has: ["Sci-Fi", "Thriller"]
// Score = max(12, 8) / 20 + 0.2 (multi-genre bonus) = 0.8
```

### Diversity Injection (MMR Algorithm)

Prevents filter bubbles by ensuring not all recommendations are similar:

- **70% pure quality**: Highest scoring books
- **30% diverse picks**: High-scoring books with different genres than selected books

```typescript
// Phase 1: Select top 14 books (70% of 20)
// Phase 2: For remaining 6 slots, select books with:
//   diversityScore = bookScore × (1 - genreOverlapWithSelected)
```

### Friendship Strength Calculation

Friend recommendations weighted by relationship strength:

```typescript
strength = 0.3 (base)
  + min(interactions × 0.05, 0.4)      // Likes, comments, views
  + min(mutualFriends × 0.03, 0.3)     // Common connections
  + tasteSimilarity × 0.2               // Genre overlap (cosine similarity)
```

---

## Database Models

### UserPreference

Stores computed user preferences:

```typescript
{
  userId: ObjectId,

  onboarding: {
    genres: [{genre, weight}],
    favoriteAuthors: [string],
    completedAt: Date
  },

  implicitPreferences: {
    genreWeights: Map<string, number>,     // {"Sci-Fi": 12.5, "Thriller": 8.3}
    authorWeights: Map<string, number>,    // {"Andy Weir": 10.0}
    avgPageLength: number,                 // 350
    diversityScore: number,                // 0-1
    readingVelocity: number,               // books per month
    lastComputed: Date
  },

  interactions: {
    views: [{bookId, timestamp, duration, sessionId}],
    searches: [{query, timestamp, resultsClicked}]
  }
}
```

### Event

Logs every user interaction:

```typescript
{
  type: EventType,                       // 'book.rated', 'book.liked', etc.
  userId: ObjectId,
  timestamp: Date,
  sessionId: string,
  metadata: {
    bookId?: ObjectId,
    rating?: number,
    duration?: number,
    // ... event-specific fields
  }
}
```

**Event Types:**
- `book.viewed`, `book.rated`, `book.liked`, `book.added_to_shelf`
- `book.searched`, `book.clicked_from_search`, `book.clicked_from_recommendation`
- `user.followed`, `user.unfollowed`
- `recommendation.viewed`, `recommendation.clicked`, `recommendation.converted`

### RecommendationLog

Tracks recommendation performance:

```typescript
{
  userId: ObjectId,
  bookId: ObjectId,
  algorithm: string,                     // 'hybrid', 'genre-based', etc.
  score: number,
  scoreBreakdown: {genre, author, quality, ...},
  reason: string,
  position: number,

  shown: boolean,
  shownAt: Date,
  clicked: boolean,
  clickedAt: Date,
  converted: boolean,                    // Added to shelf or rated
  convertedAt: Date
}
```

### RecommendationCache

Pre-computed recommendations:

```typescript
{
  userId: ObjectId,
  homeRecommendations: [{bookId, score, reason, position}],
  friendRecommendations: [{bookId, score, reason, position}],
  generatedAt: Date,
  expiresAt: Date,                      // 1 hour TTL
  isStale: boolean
}
```

---

## API Endpoints

### `GET /api/recommendations/home`

Get personalized homepage recommendations.

**Auth:** Required
**Query Parameters:**
- `limit` (optional): Number of recommendations (default: 20)
- `refresh` (optional): Force refresh cache (`true`/`false`)

**Response:**
```json
{
  "recommendations": [
    {
      "book": {...},
      "bookId": "...",
      "score": 0.87,
      "scoreBreakdown": {
        "genre": 0.8,
        "author": 0.6,
        "quality": 0.9,
        "friends": 0.4,
        "trending": 0.5,
        "recency": 0.3,
        "diversity": 0.2
      },
      "reason": "Popular in Science Fiction",
      "algorithm": "hybrid",
      "position": 1
    }
  ],
  "source": "cache",
  "cached": true
}
```

### `GET /api/recommendations/friends`

Get recommendations based on friend activity.

**Auth:** Required
**Query Parameters:**
- `limit` (optional): Number of recommendations (default: 20)

**Response:**
```json
{
  "recommendations": [
    {
      "book": {...},
      "reason": "Sarah, John and 3 others loved this",
      "position": 1
    }
  ]
}
```

### `GET /api/recommendations/similar/[bookId]`

Get books similar to a specific book.

**Auth:** Not required
**Query Parameters:**
- `limit` (optional): Number of similar books (default: 20)

### `POST /api/events/track`

Track a user interaction event.

**Auth:** Required
**Body:**
```json
{
  "type": "book.rated",
  "metadata": {
    "bookId": "...",
    "rating": 5
  },
  "sessionId": "optional-session-id"
}
```

### `POST /api/recommendations/feedback`

Track user feedback on recommendations.

**Auth:** Required
**Body:**
```json
{
  "bookId": "...",
  "action": "clicked",              // 'shown', 'clicked', 'converted', 'dismissed'
  "convertedAction": "added_to_shelf"  // Optional, for 'converted' action
}
```

### `POST /api/onboarding`

Complete onboarding quiz and initialize preferences.

**Auth:** Required
**Body:**
```json
{
  "genres": ["Science Fiction", "Thriller", "Fantasy"],
  "authors": ["Andy Weir", "Blake Crouch", "N.K. Jemisin"]
}
```

---

## Configuration

All algorithm parameters are configurable in `/lib/config/recommendation.config.ts`:

```typescript
export const RecommendationConfig = {
  // Scoring weights
  scoring: {
    genreMatch: 0.40,
    authorMatch: 0.20,
    qualityScore: 0.15,
    friendActivity: 0.10,
    trendingBonus: 0.08,
    recencyBonus: 0.05,
    diversityBonus: 0.02,
  },

  // Signal weights (how much each action affects preferences)
  signals: {
    rating5Star: 2.0,
    rating4Star: 1.0,
    rating3Star: 0.5,
    rating2Star: -0.5,
    rating1Star: -1.0,
    liked: 1.5,
    bookshelfRead: 1.0,
    tbrAdded: 0.7,
    // ...
  },

  // Diversity settings
  diversity: {
    pureQualityRatio: 0.7,
    diverseRatio: 0.3,
  },

  // Quality filters
  quality: {
    minRating: 3.5,
    minRatingCount: 5,
    maxPageCount: 1000,
  },

  // Cache settings
  cache: {
    ttlHours: 1,
    recommendationCount: 20,
  },
};
```

### Tuning the Algorithm

To adjust recommendation behavior:

1. **Increase genre weight** → More genre-focused recommendations
2. **Increase diversity ratio** → More varied recommendations
3. **Increase friend weight** → More social recommendations
4. **Adjust signal weights** → Change how much actions affect preferences

Example: Increase friend recommendations weight from 10% to 20%:

```typescript
scoring: {
  genreMatch: 0.30,        // Reduced from 0.40
  authorMatch: 0.20,
  qualityScore: 0.15,
  friendActivity: 0.20,    // Increased from 0.10
  // ...
}
```

---

## Usage Guide

### Backend: Track Events

Track every user interaction to improve recommendations:

```typescript
import { EventTracker } from '@/lib/services/EventTracker';
import { EventType } from '@/lib/db/models/Event';

const eventTracker = new EventTracker();

// Track book view
await eventTracker.trackBookView(userId, bookId, durationSeconds);

// Track rating
await eventTracker.trackRating(userId, bookId, rating);

// Track like
await eventTracker.trackLike(userId, bookId, true);

// Track adding to shelf
await eventTracker.trackAddToShelf(userId, bookId, 'bookshelf', rating);

// Track recommendation click
await eventTracker.trackRecommendationClick(
  userId,
  bookId,
  'home',
  position,
  'hybrid'
);
```

### Frontend: Display Recommendations

```typescript
// Fetch recommendations
const response = await fetch('/api/recommendations/home?limit=20');
const { recommendations } = await response.json();

// Display in UI
recommendations.map(rec => (
  <BookCard
    book={rec.book}
    reason={rec.reason}  // "Because you loved 'The Martian'"
    onLike={handleLike}
    onClick={() => handleClick(rec.bookId, rec.position)}
  />
));

// Track click
const handleClick = async (bookId, position) => {
  await fetch('/api/recommendations/feedback', {
    method: 'POST',
    body: JSON.stringify({
      bookId,
      action: 'clicked',
    }),
  });

  router.push(`/b/${bookSlug}`);
};
```

### Frontend: Track Page Views

```typescript
'use client';

export default function BookPage({ bookId }) {
  const startTime = useRef(Date.now());

  useEffect(() => {
    const trackView = () => {
      const duration = Math.floor((Date.now() - startTime.current) / 1000);

      navigator.sendBeacon('/api/events/track', JSON.stringify({
        type: 'book.viewed',
        metadata: { bookId, duration },
      }));
    };

    window.addEventListener('beforeunload', trackView);
    return () => {
      window.removeEventListener('beforeunload', trackView);
      trackView();
    };
  }, [bookId]);

  // Rest of component...
}
```

---

## Performance Optimization

### Caching Strategy

1. **Pre-compute recommendations** for active users (background job)
2. **Cache for 1 hour** (configurable)
3. **Invalidate on significant actions** (rate book, add to shelf)
4. **Serve from cache** when fresh (<100ms response time)
5. **Generate on-demand** when cache is stale

### Database Indexes

Created automatically by models:

```typescript
// UserPreference
userId: unique index
implicitPreferences.lastComputed: index

// Event
userId + timestamp: compound index
type + timestamp: compound index
metadata.bookId: index
timestamp: TTL index (90 days)

// RecommendationLog
userId + createdAt: compound index
algorithm + converted: compound index
createdAt: TTL index (180 days)

// RecommendationCache
userId: unique index
expiresAt: index
isStale + generatedAt: compound index
```

### Background Jobs (TODO)

Set up cron jobs for:

1. **Recommendation pre-computation** (every hour)
   ```bash
   0 * * * * node scripts/precompute-recommendations.js
   ```

2. **Profile recomputation** (daily for stale profiles)
   ```bash
   0 2 * * * node scripts/recompute-profiles.js
   ```

3. **Cache cleanup** (weekly)
   ```bash
   0 3 * * 0 node scripts/cleanup-caches.js
   ```

---

## Analytics & Monitoring

### Success Metrics

Track these weekly in RecommendationLog:

```typescript
// Click-through rate
CTR = (clicks / shown) × 100
Target: 15-25%

// Conversion rate
ConversionRate = (converted / clicks) × 100
Target: 10-18%

// Average position of converted recommendations
// Lower is better (users converting on top recommendations)

// Engagement lift
// Session time increase after showing recommendations
```

### Get Metrics

```typescript
// Via API
GET /api/recommendations/feedback/metrics?algorithm=hybrid&days=7

// Via Model
const metrics = await RecommendationLog.getAlgorithmMetrics('hybrid', 7);
console.log(metrics);
// {
//   total: 1000,
//   shown: 800,
//   clicked: 160,
//   converted: 24,
//   ctr: 20,              // 20%
//   conversionRate: 15,   // 15%
//   avgScore: 0.78,
//   avgPosition: 3.2
// }
```

### A/B Testing

Enable in config:

```typescript
abTesting: {
  enabled: true,
  variants: {
    control: { percentage: 50 },
    highFriendWeight: {
      percentage: 25,
      config: {
        scoring: { friendActivity: 0.20, genreMatch: 0.30 }
      }
    },
    highDiversity: {
      percentage: 25,
      config: {
        diversity: { pureQualityRatio: 0.5, diverseRatio: 0.5 }
      }
    },
  },
}
```

Compare results:

```typescript
const comparison = await RecommendationLog.compareAlgorithms(
  'control',
  'highFriendWeight',
  7
);
console.log(comparison.winner); // 'highFriendWeight' if 10% better
```

---

## Testing

### Test Scenarios

**New User (Cold Start):**
```typescript
// 1. Complete onboarding with genres and authors
await fetch('/api/onboarding', {
  method: 'POST',
  body: JSON.stringify({
    genres: ['Science Fiction', 'Thriller'],
    authors: ['Andy Weir']
  })
});

// 2. Get recommendations immediately
const { recommendations } = await fetch('/api/recommendations/home').then(r => r.json());

// Expected: Recommendations based on onboarding data
```

**Active User:**
```typescript
// 1. Rate 5 books with 5 stars in Sci-Fi
// 2. Get recommendations
// Expected: Sci-Fi dominates, but 10-20% other genres for diversity
```

**Social User:**
```typescript
// 1. Follow 10 friends
// 2. Get friend recommendations
const { recommendations } = await fetch('/api/recommendations/friends').then(r => r.json());

// Expected: Books with reasons like "Sarah and 3 others loved this"
```

---

## Migration Path to ML

When you reach 10K+ users, consider adding:

1. **Collaborative Filtering**: Matrix factorization (user-book rating matrix)
2. **Content-Based ML**: Train embeddings on book descriptions (Sentence Transformers)
3. **Hybrid Model**: Combine rule-based + ML predictions
4. **Neural Recommendations**: Deep learning models (if budget allows)

The current system provides:
- Clean event data for training
- Labeled conversions (implicit feedback)
- A/B testing infrastructure
- Baseline performance metrics

Expected improvement from ML: **15-25%** (not 100%), proving the rule-based system is already strong.

---

## Troubleshooting

### Recommendations not updating after rating books

**Cause**: Cache not invalidated
**Fix**: Ensure `EventTracker.track()` is called with significant events

### Low click-through rate

**Causes:**
1. Explanations not compelling
2. Recommendations not diverse enough
3. Quality filter too strict

**Fixes:**
1. Improve `generateExplanation()` logic
2. Increase `diversity.diverseRatio` to 0.4-0.5
3. Lower `quality.minRating` to 3.0

### User getting same recommendations repeatedly

**Cause**: Not enough candidate diversity
**Fix**: Increase candidate fetch limits in config

```typescript
candidates: {
  genreBased: 100,       // Increased from 50
  authorBased: 50,       // Increased from 30
  similarToLiked: 50,    // Increased from 30
}
```

---

## File Structure

```
paperboxd/
├── lib/
│   ├── config/
│   │   └── recommendation.config.ts        # All tunable parameters
│   ├── db/models/
│   │   ├── UserPreference.ts               # User preference storage
│   │   ├── Event.ts                        # Event logging
│   │   ├── RecommendationLog.ts            # Recommendation tracking
│   │   └── RecommendationCache.ts          # Pre-computed recommendations
│   └── services/
│       ├── UserProfileBuilder.ts           # Builds user profiles
│       ├── RecommendationService.ts        # Core recommendation engine
│       ├── FriendRecommendations.ts        # Social recommendations
│       └── EventTracker.ts                 # Event tracking service
├── app/api/
│   ├── recommendations/
│   │   ├── home/route.ts                   # GET homepage recommendations
│   │   ├── friends/route.ts                # GET friend recommendations
│   │   ├── similar/[bookId]/route.ts       # GET similar books
│   │   └── feedback/route.ts               # POST recommendation feedback
│   ├── events/
│   │   └── track/route.ts                  # POST event tracking
│   └── onboarding/
│       └── route.ts                        # POST onboarding completion
└── RECOMMENDATIONS.md                      # This file
```

---

## Support

For questions or issues:
1. Check this documentation
2. Review `/lib/config/recommendation.config.ts` for tunable parameters
3. Check MongoDB logs for errors
4. Monitor `/api/recommendations/feedback/metrics` for performance

---

## License

This recommendation system is part of PaperBoxd and follows the same license.
