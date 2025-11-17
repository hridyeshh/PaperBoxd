/**
 * Utility functions for creating and parsing book slugs
 */

/**
 * Creates a unique identifier from an ISBN or book ID
 * Uses the last 8 characters converted to hex for uniqueness
 */
function createUniqueId(isbn?: string, bookId?: string): string {
  // Prefer ISBN, fallback to book ID
  const id = isbn || bookId || '';
  
  if (!id) return '';
  
  // Take last 8 characters and convert to hex
  const last8 = id.slice(-8);
  // Convert to number and then to hex (remove 0x prefix)
  const num = parseInt(last8.replace(/\D/g, ''), 10) || 0;
  return num.toString(16).padStart(6, '0'); // 6-character hex
}

/**
 * Creates a URL-safe slug from a book title with unique identifier
 * Example: "Deep Work", ISBN "9781455586660" -> "deep+work+dd04"
 * Format: title-slug+unique-hex-id
 */
export function createBookSlug(title: string, isbn?: string, bookId?: string): string {
  const titleSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '+') // Replace spaces with +
    .replace(/\++/g, '+') // Replace multiple + with single +
    .replace(/^\+|\+$/g, ''); // Remove leading/trailing +
  
  const uniqueId = createUniqueId(isbn, bookId);
  
  // If we have a unique ID, append it to make the slug unique
  if (uniqueId) {
    return `${titleSlug}+${uniqueId}`;
  }
  
  // Fallback to just title slug if no ID available
  return titleSlug;
}

/**
 * Parses a book slug to extract title and unique identifier
 * Example: "deep+work+dd04" -> { titleSlug: "deep+work", uniqueId: "dd04" }
 */
export function parseBookSlug(slug: string): { titleSlug: string; uniqueId?: string } {
  // Check if slug contains a unique ID (last part after final +)
  const parts = slug.split('+');
  
  // If last part looks like a hex ID (4-8 hex characters)
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // Check if last part is a hex identifier (4-8 hex chars)
    if (/^[0-9a-f]{4,8}$/i.test(lastPart)) {
      const titleSlug = parts.slice(0, -1).join('+');
      return { titleSlug, uniqueId: lastPart };
    }
  }
  
  // No unique ID found, return whole slug as title
  return { titleSlug: slug };
}

/**
 * Converts a slug back to a searchable title
 * Example: "harry+potter+and+the+philosophers+stone" -> "harry potter and the philosophers stone"
 * Also handles slugs with unique IDs: "deep+work+dd04" -> "deep work"
 */
export function slugToTitle(slug: string): string {
  const { titleSlug } = parseBookSlug(slug);
  return decodeURIComponent(titleSlug.replace(/\+/g, ' '));
}

/**
 * Normalizes a title for searching (removes special characters, lowercases)
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Extracts the unique ID from a slug if present
 * Example: "deep+work+dd04" -> "dd04"
 */
export function getUniqueIdFromSlug(slug: string): string | undefined {
  const { uniqueId } = parseBookSlug(slug);
  return uniqueId;
}

