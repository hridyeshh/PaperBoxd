# Book API Integration Setup

PaperBoxd uses a **multi-tier book data strategy** to provide the best possible book metadata while maintaining reliability and cost efficiency.

## Search Strategy Hierarchy

The book search follows this waterfall approach:

```
1. Database Cache (Instant, Free)
   ↓ (if not found)
2. ISBNdb API (Premium, High-Quality)
   ↓ (if fails/no results)
3. Open Library API (Free, Open Source)
   ↓ (if fails/no results)
4. Google Books API (Fallback, Requires Key)
```

---

## API Configuration

### 1. ISBNdb (Primary - Recommended)

**Best for**: High-quality, comprehensive book metadata with ISBNs

**Pricing**: Paid subscription required
- Basic: $9.95/month (250 API calls/day)
- Standard: $29.95/month (1,000 API calls/day)
- Pro: $69.95/month (5,000 API calls/day)

**Setup**:
1. Sign up at [ISBNdb.com](https://isbndb.com/)
2. Subscribe to a plan
3. Get your API key from the dashboard
4. Add to `.env`:
   ```env
   ISBNDB_API_KEY=your_api_key_here
   ```

**Features**:
- ✅ High-quality book covers
- ✅ Comprehensive metadata (ISBN, pages, dimensions, etc.)
- ✅ Publisher information
- ✅ Edition details
- ✅ Subjects and categories
- ✅ Price information
- ❌ No user ratings (we use our own Paperboxd ratings)

### 2. Open Library (Secondary - Free)

**Best for**: Free, open-source alternative with good coverage

**Pricing**: Free, no API key required

**Features**:
- ✅ Completely free
- ✅ No rate limits
- ✅ Good book coverage
- ✅ Community ratings
- ✅ Reading statistics (want to read, currently reading)
- ✅ Cover images
- ❌ Lower quality metadata than ISBNdb
- ❌ Sometimes missing newer books

**Setup**: No configuration needed - works out of the box!

### 3. Google Books (Fallback - Optional)

**Best for**: Backup when other APIs fail

**Pricing**: Free with rate limits
- 1,000 requests/day (unauthenticated)
- 1,000,000 requests/day (with API key)

**Setup**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Books API
4. Create credentials (API key)
5. Add to `.env`:
   ```env
   GOOGLE_BOOKS_API_KEY=your_api_key_here
   ```

**Features**:
- ✅ Large book database
- ✅ Preview links
- ✅ Sale information
- ✅ Reliable fallback
- ❌ Rate limited
- ❌ Requires API key for higher limits

---

## Recommended Configuration

### For Production (Best Quality)

```env
ISBNDB_API_KEY=your_isbndb_key        # Primary source
GOOGLE_BOOKS_API_KEY=your_google_key  # Fallback only
```

**Benefits**:
- Premium book metadata from ISBNdb
- Open Library as free fallback
- Google Books as final safety net
- Minimal Google API usage (saves quota)

### For Development/Testing (Free)

```env
# Leave ISBNDB_API_KEY unset
GOOGLE_BOOKS_API_KEY=your_google_key  # Optional
```

**Benefits**:
- Free Open Library API for most searches
- Google Books as backup
- No ISBNdb costs during development

### For Budget (Minimal Cost)

```env
ISBNDB_API_KEY=basic_tier_key  # $9.95/month for 250 calls/day
# Leave Google Books unset
```

**Benefits**:
- Low monthly cost
- High-quality data for popular searches
- Free Open Library fallback handles overflow
- 250 ISBNdb calls/day = ~7,500 searches/month

---

## How It Works

### Search Flow

1. **User searches for "Harry Potter"**
   ```
   GET /api/books/search?q=harry+potter
   ```

2. **Database cache check**
   - Checks if we've searched this before
   - Returns cached results if found (instant, free)

3. **ISBNdb search** (if API key configured)
   - Searches ISBNdb API
   - Caches results in MongoDB
   - Returns high-quality metadata

4. **Open Library search** (if ISBNdb fails)
   - Searches Open Library API
   - Caches results in MongoDB
   - Returns free, open data

5. **Google Books search** (final fallback)
   - Only if both ISBNdb and Open Library fail
   - Minimal usage saves quota

### Caching Strategy

All book data is cached in MongoDB for:
- **Instant subsequent searches** (no API calls)
- **Cost savings** (reduces ISBNdb usage)
- **Reliability** (works even if APIs are down)
- **Performance** (database queries faster than API calls)

Books are automatically cleaned up after 15 days of inactivity (configurable).

---

## Cost Analysis

### Example: 10,000 book searches/month

**With ISBNdb Standard ($29.95/month)**:
- First 1,000 unique books: ISBNdb API (~30 searches/day)
- Next 9,000 searches: Database cache (free, instant)
- **Total cost**: $29.95/month
- **Per search**: $0.003

**Without ISBNdb (Free tier)**:
- All searches: Open Library (free) → Google Books (free)
- **Total cost**: $0/month
- **Trade-off**: Lower quality metadata

### Recommended: Start Free, Upgrade Later

1. **Start**: Use free Open Library + Google Books
2. **Monitor**: Track search quality and user feedback
3. **Upgrade**: Add ISBNdb when you have consistent users
4. **Scale**: Upgrade ISBNdb tier as usage grows

---

## Troubleshooting

### ISBNdb returning no results

**Possible causes**:
- Invalid API key
- Rate limit exceeded (check your plan)
- Misspelled book title

**Solution**: The system automatically falls back to Open Library

### All APIs failing

**Check**:
1. MongoDB connection (for cache)
2. ISBNdb API key validity
3. Google Books API key (if configured)
4. Network connectivity

**Logs**: Check console for detailed error messages

### Poor image quality

**Solution**:
- ISBNdb provides highest quality covers
- Ensure `ISBNDB_API_KEY` is configured
- Or wait for Open Library/Google Books fallback

---

## Environment Variables Summary

```env
# Required
MONGODB_URI=mongodb+srv://...

# Book APIs (in order of priority)
ISBNDB_API_KEY=your_key       # Optional but recommended
GOOGLE_BOOKS_API_KEY=your_key # Optional (fallback only)

# Note: Open Library requires no configuration
```

---

## Getting Started

1. **Add ISBNdb API key** to your `.env` file
2. **Restart your development server**
   ```bash
   npm run dev
   ```
3. **Test a search** and check the console logs:
   ```
   [Search] Trying ISBNdb for query: "harry potter"
   [Search] ISBNdb returned 10 results
   ```

That's it! Your book search is now powered by premium ISBNdb data with free fallbacks.
