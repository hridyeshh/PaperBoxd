/**
 * Open Library API Integration
 *
 * Open Library is a free, open-source API for book data.
 * Documentation: https://openlibrary.org/developers/api
 */

export interface OpenLibraryBook {
  key: string; // e.g., "/works/OL45804W"
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  isbn?: string[];
  publisher?: string[];
  cover_i?: number; // Cover ID for constructing image URLs
  cover_edition_key?: string;
  edition_count?: number;
  language?: string[];
  subject?: string[];
  person?: string[];
  place?: string[];
  time?: string[];
  has_fulltext?: boolean;
  public_scan_b?: boolean;
  ratings_average?: number;
  ratings_count?: number;
  want_to_read_count?: number;
  currently_reading_count?: number;
  already_read_count?: number;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibraryBook[];
  q: string;
  offset: number | null;
}

/**
 * Search for books using Open Library API
 *
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 10, max: 100)
 * @param offset - Pagination offset (default: 0)
 * @returns Promise<OpenLibrarySearchResponse>
 */
export async function searchOpenLibrary(
  query: string,
  limit: number = 10,
  offset: number = 0
): Promise<OpenLibrarySearchResponse> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", Math.min(limit, 100).toString());
  url.searchParams.set("offset", offset.toString());
  url.searchParams.set("fields", [
    "key",
    "title",
    "author_name",
    "author_key",
    "first_publish_year",
    "isbn",
    "publisher",
    "cover_i",
    "cover_edition_key",
    "edition_count",
    "language",
    "subject",
    "ratings_average",
    "ratings_count",
    "want_to_read_count",
    "currently_reading_count",
    "already_read_count",
  ].join(","));

  // Add timeout to prevent hanging requests (10 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "PaperBoxd/1.0 (https://paperboxd.app; contact@paperboxd.app)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Open Library API request timed out');
    }
    throw error;
  }
}

/**
 * Open Library Work response type
 */
export interface OpenLibraryWork {
  key: string;
  title: string;
  authors?: Array<{ key: string; name: string }>;
  description?: string | { type: string; value: string };
  first_publish_date?: string;
  publish_date?: string;
  isbn?: string[];
  covers?: number[];
  subject?: string[];
  [key: string]: unknown; // Allow additional properties from API
}

/**
 * Get book details by Open Library Work ID
 *
 * @param workId - Open Library Work ID (e.g., "OL45804W" or "/works/OL45804W")
 * @returns Promise<OpenLibraryWork>
 */
export async function getOpenLibraryWork(workId: string): Promise<OpenLibraryWork> {
  // Normalize work ID
  const normalizedId = workId.startsWith("/works/")
    ? workId
    : `/works/${workId}`;

  const url = `https://openlibrary.org${normalizedId}.json`;

  // Add timeout to prevent hanging requests (10 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PaperBoxd/1.0 (https://paperboxd.app; contact@paperboxd.app)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Open Library API request timed out');
    }
    throw error;
  }
}

/**
 * Get cover image URL from Open Library
 *
 * @param coverId - Cover ID from search results
 * @param size - Image size ("S", "M", "L")
 * @returns Cover image URL or null
 */
export function getOpenLibraryCoverUrl(
  coverId: number | undefined,
  size: "S" | "M" | "L" = "M"
): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

/**
 * Transform Open Library book data to our internal format
 *
 * @param book - Open Library book data
 * @returns Transformed book data compatible with our schema
 */
export function transformOpenLibraryBook(book: OpenLibraryBook) {
  // Extract Open Library ID from key (e.g., "/works/OL45804W" -> "OL45804W")
  const openLibraryId = book.key.split("/").pop() || book.key;

  // Get cover images - ALWAYS use L (Large) size to prevent blur
  // L size is around 360px wide, which prevents blur when scaled down
  // Using smaller sizes (S=90px, M=180px) causes blur when Next.js Image scales them
  const largeCoverUrl = getOpenLibraryCoverUrl(book.cover_i, "L");
  const mediumCoverUrl = getOpenLibraryCoverUrl(book.cover_i, "M");

  return {
    // Use Open Library ID as primary identifier
    openLibraryId,
    key: book.key,

    // Volume Information (normalized to match our schema)
    volumeInfo: {
      title: book.title,
      authors: book.author_name || [],
      publishedDate: book.first_publish_year?.toString(),
      description: undefined, // Not available in search results
      industryIdentifiers: book.isbn
        ? book.isbn.slice(0, 2).map((isbn: string) => ({
            type: isbn.length === 10 ? "ISBN_10" : "ISBN_13",
            identifier: isbn,
          }))
        : [],
      pageCount: undefined, // Not available in search results
      categories: book.subject?.slice(0, 5) || [],
      averageRating: book.ratings_average,
      ratingsCount: book.ratings_count,
      language: book.language?.[0] || "en",
      imageLinks: {
        // Use L (large) for all sizes to prevent blur when scaling down
        // It's better to have a larger image scaled down than a small image scaled up
        thumbnail: largeCoverUrl || mediumCoverUrl,
        smallThumbnail: largeCoverUrl || mediumCoverUrl,
        small: largeCoverUrl || mediumCoverUrl,
        medium: largeCoverUrl,
        large: largeCoverUrl,
        extraLarge: largeCoverUrl,
      },
      previewLink: `https://openlibrary.org${book.key}`,
      infoLink: `https://openlibrary.org${book.key}`,
      canonicalVolumeLink: `https://openlibrary.org${book.key}`,
    },

    // Open Library specific metadata
    openLibraryMetadata: {
      wantToReadCount: book.want_to_read_count,
      currentlyReadingCount: book.currently_reading_count,
      alreadyReadCount: book.already_read_count,
      editionCount: book.edition_count,
      firstPublishYear: book.first_publish_year,
    },
  };
}

/**
 * Search with detailed error handling and logging
 */
export async function searchOpenLibraryWithFallback(
  query: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ success: boolean; data?: OpenLibrarySearchResponse; error?: string }> {
  try {
    const data = await searchOpenLibrary(query, limit, offset);

    // Check if we got meaningful results
    if (data.numFound === 0 || !data.docs || data.docs.length === 0) {
      return {
        success: false,
        error: "No results found in Open Library",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Open Library search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
