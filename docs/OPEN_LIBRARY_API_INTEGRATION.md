# Open Library API Integration

## Overview

PaperBoxd uses a **hybrid search strategy** that combines **Open Library API** (primary) with **Google Books API** (fallback) to provide comprehensive book search results. This approach ensures maximum coverage, reliability, and data quality.

## Architecture

```
Search Flow:
1. Database Cache Check (MongoDB) → Return cached results if available
2. Open Library API → Primary search source
3. Google Books API → Fallback if Open Library fails or returns no results
```

## Open Library API Implementation

### API Documentation Reference
- **Official Docs**: https://openlibrary.org/developers/api
- **Base URL**: `https://openlibrary.org`
- **Search API**: `https://openlibrary.org/search.json`
- **Work API**: `https://openlibrary.org/works/{workId}.json`
- **Covers API**: `https://covers.openlibrary.org/b/id/{coverId}-{size}.jpg`

### Rate Limiting & Best Practices

According to the [Open Library API documentation](https://openlibrary.org/developers/api), applications making regular, frequent API calls should:

1. **Include User-Agent Header**: Specify application name and contact information
   ```javascript
   headers: {
     "User-Agent": "PaperBoxd/1.0 (https://paperboxd.app; contact@paperboxd.app)"
   }
   ```

2. **Avoid Bulk Downloads**: Use bulk data dumps for large-scale data access instead of API scraping
   - Bulk downloads: https://openlibrary.org/developers/dumps
   - Monthly data releases available

3. **Rate Limit Considerations**: High request volumes without proper headers may result in blocking

### Current Implementation

#### 1. Search API (`/api/books/search`)

**Endpoint**: `/api/books/search?q={query}&maxResults={limit}&startIndex={offset}`

**Strategy**:
- First checks MongoDB cache for previously fetched books
- Tries Open Library API search
- Falls back to Google Books API if Open Library fails

**Code Location**: `app/api/books/search/route.ts`

**Open Library Search Implementation**: `lib/api/open-library.ts`

```typescript
// Search parameters
- q: Search query (required)
- limit: Results per page (default: 10, max: 100)
- offset: Pagination offset (default: 0)
- fields: Specific fields to return (for performance)
```

#### 2. Available APIs from Open Library

According to the [Open Library API documentation](https://openlibrary.org/developers/api), the following APIs are available:

##### ✅ **Currently Implemented**:

1. **Book Search API** - `search.json`
   - Used for general book searches
   - Returns JSON with book metadata
   - Status: ✅ Implemented in `searchOpenLibrary()`

2. **Work API** - `works/{workId}.json`
   - Retrieve specific work by Open Library identifier
   - Returns detailed work information
   - Status: ✅ Implemented in `getOpenLibraryWork()`

3. **Covers API** - `covers.openlibrary.org/b/id/{coverId}-{size}.jpg`
   - Fetch book cover images
   - Sizes: S (small), M (medium), L (large)
   - Status: ✅ Implemented in `getOpenLibraryCoverUrl()`

##### 📋 **Available but Not Yet Implemented**:

4. **Edition API** - `books/{editionId}.json`
   - Get specific edition details
   - Useful for ISBN-based lookups
   - Could be used for ISBN → book conversion

5. **Authors API** - `authors/{authorId}.json`
   - Retrieve author information and their works
   - Could enhance author pages in PaperBoxd

6. **Subjects API** - Search by subject
   - Fetch books by subject category
   - Could power subject/genre browsing

7. **My Books API**
   - Retrieve books on a patron's public reading log
   - Could enable integration with Open Library accounts

8. **Partner API** (formerly "Read" API)
   - Fetch books by library identifiers (ISBNs, OCLC, LCCNs)
   - Could be useful for ISBN-based lookups

9. **Search Inside API**
   - Search for matching text within millions of books
   - Advanced feature for full-text search

10. **Lists API**
    - Reading, modifying, or creating user lists
    - Could enable sharing reading lists

11. **Recent Changes API**
    - Programmatic access to changes across Open Library
    - For keeping cached data fresh

### Data Structure

#### Open Library Book Schema
```typescript
interface OpenLibraryBook {
  key: string;              // e.g., "/works/OL45804W"
  title: string;
  author_name?: string[];   // Array of author names
  author_key?: string[];    // Array of author Open Library IDs
  first_publish_year?: number;
  isbn?: string[];          // Array of ISBNs
  publisher?: string[];
  cover_i?: number;         // Cover ID for image URLs
  cover_edition_key?: string;
  edition_count?: number;
  language?: string[];
  subject?: string[];       // Categories/subjects
  ratings_average?: number;
  ratings_count?: number;
  want_to_read_count?: number;
  currently_reading_count?: number;
  already_read_count?: number;
  has_fulltext?: boolean;   // If book has full text available
  public_scan_b?: boolean;  // If book has public scans
}
```

#### Transformation to Internal Format

The `transformOpenLibraryBook()` function normalizes Open Library data to match our internal book schema, ensuring compatibility with Google Books data:

- **Open Library ID** → `openLibraryId`
- **Authors** → Normalized to array
- **Cover Images** → Constructed from `cover_i` using Covers API
- **Dates** → Converted from year to string format
- **ISBNs** → Mapped to `industryIdentifiers` array
- **Subjects** → Mapped to `categories`
- **Ratings** → Mapped to `averageRating` and `ratingsCount`

### Advantages of Open Library API

1. **Free & Open**: No API key required, no rate limits (with proper headers)
2. **Comprehensive Data**: Millions of books with rich metadata
3. **Community-Driven**: User-contributed data with ratings and reading stats
4. **Covers API**: High-quality book cover images
5. **Full-Text Access**: Many books have full text available
6. **International**: Supports multiple languages and formats

### Hybrid Strategy Benefits

**Why use both APIs?**

1. **Coverage**: Some books may exist in one API but not the other
2. **Reliability**: If one API is down, the other serves as backup
3. **Data Quality**: Some books have better metadata in Google Books, others in Open Library
4. **Cost Efficiency**: Open Library is free, reducing Google Books API quota usage
5. **Performance**: MongoDB caching means faster subsequent searches

### Database Caching

Both Open Library and Google Books results are cached in MongoDB:
- **Primary Key**: `openLibraryId` or `googleBooksId`
- **Cache TTL**: 30 days (configurable)
- **Access Tracking**: `usageCount` and `lastAccessed` fields
- **Automatic Cleanup**: Books not accessed in 15+ days are cleaned up

### Future Enhancements

Based on the Open Library API capabilities:

1. **ISBN-Based Lookup**: Use Partner API for ISBN → book conversion
2. **Author Pages**: Integrate Authors API for rich author profiles
3. **Subject Browsing**: Use Subjects API for genre/subject exploration
4. **Full-Text Search**: Implement Search Inside API for advanced search
5. **Open Library Integration**: Allow users to link their Open Library accounts
6. **Work vs Edition**: Distinguish between works and specific editions

### Code Locations

- **Open Library Client**: `lib/api/open-library.ts`
- **Search API Route**: `app/api/books/search/route.ts`
- **Book Model**: `lib/db/models/Book.ts`
- **Transform Functions**: `lib/api/open-library.ts` → `transformOpenLibraryBook()`

### Testing

To test Open Library integration:

```bash
# Test search endpoint
curl "http://localhost:3000/api/books/search?q=harry+potter&maxResults=10"

# Expected response includes:
# - items: Array of book results
# - apiSource: "open_library" or "google_books"
# - fromCache: boolean
```

### Monitoring

Current implementation includes:
- Console logging for API calls (`[Search]` prefix)
- Error handling with fallback to Google Books
- Success/failure tracking via `searchOpenLibraryWithFallback()`

### References

- [Open Library Developer Center](https://openlibrary.org/developers/api)
- [Open Library Search API](https://openlibrary.org/search.json)
- [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers)
- [Rate Limiting Info](https://openlibrary.org/developers/api#identifying-your-application)
- [Bulk Data Downloads](https://openlibrary.org/developers/dumps)

---

**Last Updated**: Based on Open Library API documentation as of 2025
**Implementation Status**: ✅ Primary search integrated with Google Books fallback

