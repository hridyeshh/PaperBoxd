/**
 * ISBNdb API Integration
 *
 * ISBNdb is a premium book database with comprehensive metadata.
 * Documentation: https://isbndb.com/isbndb-api-documentation-v2
 *
 * API Features:
 * - High-quality book metadata
 * - ISBN lookup
 * - Author search
 * - Publisher search
 * - Subject search
 * - Full-text search
 */

export interface ISBNdbBook {
  title: string;
  title_long?: string;
  isbn: string;
  isbn13: string;
  dewey_decimal?: string;
  binding?: string;
  publisher?: string;
  language?: string;
  date_published?: string;
  edition?: string;
  pages?: number;
  dimensions?: string;
  overview?: string;
  image?: string;
  image_original?: string;
  msrp?: number;
  excerpt?: string;
  synopsis?: string; // Note: API uses "synopsis" not "synopsys"
  synopsys?: string; // Keep for backward compatibility
  authors?: string[];
  subjects?: string[];
  reviews?: string[];
  prices?: Array<{
    condition: string;
    merchant: string;
    merchant_logo: string;
    merchant_logo_offset?: {
      x: string;
      y: string;
    };
    shipping?: string;
    price: string;
    total: string;
    link: string;
  }>;
  related?: {
    type: string;
    isbn?: string;
  };
}

export interface ISBNdbSearchResponse {
  total: number;
  books: ISBNdbBook[];
}

export interface ISBNdbAuthor {
  author: string;
}

/**
 * Search for books using ISBNdb API
 *
 * @param query - Search query string
 * @param page - Page number (1-indexed)
 * @param pageSize - Results per page (default: 20, max: 1000)
 * @returns Promise<ISBNdbSearchResponse>
 */
export async function searchISBNdb(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ISBNdbSearchResponse> {
  const apiKey = process.env.ISBNDB_API_KEY;

  if (!apiKey) {
    throw new Error("ISBNdb API key not configured");
  }

  // ISBNdb API format: /books/:query?page=...&pageSize=...
  // Query goes in the URL path, not as a parameter
  const encodedQuery = encodeURIComponent(query);
  const url = new URL(`https://api2.isbndb.com/books/${encodedQuery}`);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("pageSize", Math.min(pageSize, 1000).toString());

  // Add timeout to prevent hanging requests (15 seconds for ISBNdb)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey, // ISBNdb v2 uses Authorization header
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("ISBNdb API: Invalid API key");
      }
      if (response.status === 429) {
        throw new Error("ISBNdb API: Rate limit exceeded");
      }
      throw new Error(`ISBNdb API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ISBNdb API request timed out');
    }
    throw error;
  }
}

/**
 * Get book by ISBN
 *
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Promise<ISBNdbBook>
 */
export async function getBookByISBN(isbn: string): Promise<ISBNdbBook> {
  const apiKey = process.env.ISBNDB_API_KEY;

  if (!apiKey) {
    throw new Error("ISBNdb API key not configured");
  }

  const url = `https://api2.isbndb.com/book/${isbn}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Book not found in ISBNdb");
      }
      throw new Error(`ISBNdb API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.book;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ISBNdb API request timed out');
    }
    throw error;
  }
}

/**
 * Search authors
 *
 * @param query - Author name
 * @param page - Page number (1-indexed)
 * @param pageSize - Results per page
 * @returns Promise<{ total: number; authors: ISBNdbAuthor[] }>
 */
export async function searchAuthors(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ total: number; authors: ISBNdbAuthor[] }> {
  const apiKey = process.env.ISBNDB_API_KEY;

  if (!apiKey) {
    throw new Error("ISBNdb API key not configured");
  }

  // ISBNdb API format: /authors/:query?page=...&pageSize=...
  // Query goes in the URL path, not as a parameter
  const encodedQuery = encodeURIComponent(query);
  const url = new URL(`https://api2.isbndb.com/authors/${encodedQuery}`);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("pageSize", Math.min(pageSize, 1000).toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey, // ISBNdb v2 uses Authorization header
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ISBNdb Author Search] API error ${response.status}:`, errorText);
      throw new Error(`ISBNdb API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ISBNdb API request timed out');
    }
    throw error;
  }
}

/**
 * Transform ISBNdb book data to our internal format
 *
 * @param book - ISBNdb book data
 * @returns Transformed book data compatible with our schema
 */
export function transformISBNdbBook(book: ISBNdbBook) {
  // Use ISBN-13 as primary identifier, fallback to ISBN-10
  const bookId = book.isbn13 || book.isbn;

  // Get cover image - ISBNdb provides high-quality covers
  const coverUrl = book.image;

  return {
    // Use ISBN as primary identifier
    isbndbId: bookId,
    isbn: book.isbn,
    isbn13: book.isbn13,

    // Volume Information (normalized to match our schema)
    volumeInfo: {
      title: book.title,
      subtitle: book.title_long && book.title_long !== book.title
        ? book.title_long.replace(book.title, "").trim()
        : undefined,
      authors: book.authors || [],
      publisher: book.publisher,
      publishedDate: book.date_published,
      description: book.synopsis || book.synopsys || book.overview || book.excerpt,
      industryIdentifiers: [
        book.isbn13 && {
          type: "ISBN_13",
          identifier: book.isbn13,
        },
        book.isbn && {
          type: "ISBN_10",
          identifier: book.isbn,
        },
      ].filter(Boolean),
      pageCount: book.pages,
      categories: book.subjects || [],
      averageRating: undefined, // ISBNdb doesn't provide ratings
      ratingsCount: undefined,
      language: book.language || "en",
      imageLinks: coverUrl ? {
        thumbnail: coverUrl,
        smallThumbnail: coverUrl,
        small: coverUrl,
        medium: coverUrl,
        large: coverUrl,
        extraLarge: coverUrl,
      } : undefined,
      previewLink: undefined,
      infoLink: undefined,
      canonicalVolumeLink: undefined,
    },

    // ISBNdb specific metadata
    isbndbMetadata: {
      binding: book.binding,
      edition: book.edition,
      dimensions: book.dimensions,
      deweyDecimal: book.dewey_decimal,
      msrp: book.msrp,
      overview: book.overview,
      excerpt: book.excerpt,
      synopsis: book.synopsis || book.synopsys,
    },
  };
}

/**
 * Search with detailed error handling and logging
 */
export async function searchISBNdbWithFallback(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ success: boolean; data?: ISBNdbSearchResponse; error?: string }> {
  try {
    const data = await searchISBNdb(query, page, pageSize);

    // Check if we got meaningful results
    if (data.total === 0 || !data.books || data.books.length === 0) {
      return {
        success: false,
        error: "No results found in ISBNdb",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("ISBNdb search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
