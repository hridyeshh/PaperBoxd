# ISBNdb API v2 Integration Guide

## Overview

ISBNdb is a premium book database with comprehensive metadata covering over 33 million books by 11 million authors. It provides high-quality, structured book data including titles, authors, ISBNs, publishers, publication dates, bindings, page counts, images, and more.

**Official Documentation:** https://isbndb.com/isbndb-api-documentation-v2

## Authentication

ISBNdb API uses API key authentication via the `Authorization` header:

```javascript
headers: {
  Authorization: process.env.ISBNDB_API_KEY,
  "Content-Type": "application/json",
}
```

**Environment Variable:** `ISBNDB_API_KEY`

## Base URL

- **Production:** `https://api2.isbndb.com` (recommended)
- **Alternative:** `https://api.isbndb.com`

## Main Endpoints

### 1. Search Books

**Endpoint:** `GET /books`

**Query Parameters:**
- `query` (required): Search query string
- `column` (optional): Column to search in (`title`, `author`, `isbn`, etc.)
- `page` (optional): Page number (1-indexed, default: 1)
- `pageSize` (optional): Results per page (default: 20, max: 1000)

**Example:**
```
GET https://api2.isbndb.com/books?column=title&query=harry+potter&page=1&pageSize=20
```

**Response Format:**
```json
{
  "total": 1234,
  "books": [
    {
      "title": "Harry Potter and the Philosopher's Stone",
      "title_long": "...",
      "isbn": "9780747532699",
      "isbn13": "9780747532699",
      "authors": ["J.K. Rowling"],
      "publisher": "Bloomsbury",
      "date_published": "1997-06-26",
      "pages": 223,
      "binding": "Hardcover",
      "language": "en",
      "image": "https://...",
      "overview": "...",
      "synopsys": "...",
      "excerpt": "...",
      "subjects": ["Fiction", "Fantasy"],
      "msrp": 19.99,
      "dimensions": "...",
      "dewey_decimal": "823.914",
      "prices": [...],
      "reviews": [...]
    }
  ]
}
```

### 2. Get Book by ISBN

**Endpoint:** `GET /book/:isbn`

**Parameters:**
- `isbn` (required): ISBN-10 or ISBN-13

**Example:**
```
GET https://api2.isbndb.com/book/9780747532699
```

**Response Format:**
```json
{
  "book": {
    "title": "...",
    "isbn": "...",
    "isbn13": "...",
    // ... same structure as search results
  }
}
```

### 3. Search Authors

**Endpoint:** `GET /authors`

**Query Parameters:**
- `query` (required): Author name to search
- `page` (optional): Page number (1-indexed)
- `pageSize` (optional): Results per page (max: 1000)

**Example:**
```
GET https://api2.isbndb.com/authors?query=rowling&page=1&pageSize=20
```

**Response Format:**
```json
{
  "total": 1,
  "authors": [
    {
      "author": "J.K. Rowling"
    }
  ]
}
```

## Rate Limits

- Check your API plan for specific rate limits
- Common limits: 500-5000 requests/day depending on subscription tier
- HTTP 429 status code indicates rate limit exceeded

## Error Handling

**Common HTTP Status Codes:**
- `401`: Invalid or missing API key
- `404`: Resource not found (book/author)
- `429`: Rate limit exceeded
- `500`: Server error

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

## Data Structure

### ISBNdbBook Interface

```typescript
interface ISBNdbBook {
  title: string;
  title_long?: string;
  isbn: string;              // ISBN-10
  isbn13: string;            // ISBN-13
  authors?: string[];
  publisher?: string;
  date_published?: string;   // YYYY-MM-DD format
  pages?: number;
  binding?: string;          // Hardcover, Paperback, etc.
  language?: string;         // ISO language code
  image?: string;            // Cover image URL
  overview?: string;         // Short description
  synopsys?: string;         // Longer synopsis
  excerpt?: string;          // Book excerpt
  subjects?: string[];       // Categories/subjects
  msrp?: number;            // List price
  dimensions?: string;
  dewey_decimal?: string;
  prices?: Price[];         // Available prices from merchants
  reviews?: string[];
  related?: {
    type: string;
    isbn?: string;
  };
}
```

## Integration in PaperBoxd

### Current Implementation

The ISBNdb API is integrated as the **primary** book search source, with Open Library and Google Books as fallbacks.

**Search Strategy:**
1. Check database cache first
2. Try ISBNdb API (premium, high-quality data)
3. Fallback to Open Library API
4. Final fallback to Google Books API

### Key Files

- **`lib/api/isbndb.ts`**: ISBNdb API client functions
  - `searchISBNdb()`: Search for books
  - `getBookByISBN()`: Get book by ISBN
  - `searchAuthors()`: Search authors
  - `transformISBNdbBook()`: Transform to internal format
  - `searchISBNdbWithFallback()`: Search with error handling

- **`app/api/books/search/route.ts`**: Book search API route (uses ISBNdb first)

### Data Transformation

ISBNdb data is transformed to match the internal `Book` schema:

```typescript
{
  isbndbId: book.isbn13 || book.isbn,
  volumeInfo: {
    title: book.title,
    authors: book.authors || [],
    publisher: book.publisher,
    publishedDate: book.date_published,
    description: book.synopsys || book.overview || book.excerpt,
    // ... other fields mapped from ISBNdb
  },
  isbndbMetadata: {
    binding: book.binding,
    edition: book.edition,
    dimensions: book.dimensions,
    // ... ISBNdb-specific fields
  }
}
```

## Best Practices

1. **Caching**: Always cache ISBNdb results in MongoDB to minimize API calls
2. **Timeouts**: Use 15-second timeout for ISBNdb requests
3. **Error Handling**: Implement fallback chains (ISBNdb → Open Library → Google Books)
4. **Rate Limiting**: Monitor API usage and implement request throttling
5. **Image Quality**: ISBNdb provides high-quality cover images - use them directly
6. **ISBN Priority**: Use ISBN-13 as primary identifier when available

## API Plans & Pricing

ISBNdb offers different subscription tiers:
- **Free/Starter**: Limited requests per day
- **Professional**: Higher rate limits
- **Enterprise**: Unlimited requests

Check https://isbndb.com/ for current pricing and plan details.

## Comparison with Other APIs

| Feature | ISBNdb | Open Library | Google Books |
|---------|--------|--------------|--------------|
| **Data Quality** | ⭐⭐⭐⭐⭐ Premium | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐ Good |
| **Cover Images** | ⭐⭐⭐⭐⭐ High-res | ⭐⭐⭐ Varies | ⭐⭐⭐⭐ Good |
| **Pricing** | Paid | Free | Free |
| **Rate Limits** | Based on plan | Generous | 1000/day |
| **Metadata Completeness** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐ Good |
| **ISBN Coverage** | ⭐⭐⭐⭐⭐ 33M+ books | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |

## Example Usage

```typescript
import { searchISBNdb, getBookByISBN } from "@/lib/api/isbndb";

// Search for books
const results = await searchISBNdb("harry potter", 1, 20);
console.log(`Found ${results.total} books`);
console.log(results.books);

// Get specific book by ISBN
const book = await getBookByISBN("9780747532699");
console.log(book.title, book.authors);
```

## Notes

- ISBNdb uses 1-indexed pagination (page starts at 1)
- Maximum `pageSize` is 1000 results per page
- ISBNdb provides structured, normalized data (better than scraping)
- Cover images are typically high quality and reliable
- ISBNdb metadata includes commercial information (prices, merchants)
- The API is well-documented and stable for production use

