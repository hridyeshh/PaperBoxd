/**
 * Utility functions for creating and parsing book slugs
 */

/**
 * Creates a URL-safe slug from a book title
 * Example: "Harry Potter and the Philosopher's Stone" -> "harry+potter+and+the+philosophers+stone"
 */
export function createBookSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '+') // Replace spaces with +
    .replace(/\++/g, '+') // Replace multiple + with single +
    .replace(/^\+|\+$/g, ''); // Remove leading/trailing +
}

/**
 * Converts a slug back to a searchable title
 * Example: "harry+potter+and+the+philosophers+stone" -> "harry potter and the philosophers stone"
 */
export function slugToTitle(slug: string): string {
  return decodeURIComponent(slug.replace(/\+/g, ' '));
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

