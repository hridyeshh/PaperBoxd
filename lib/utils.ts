import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Default gray profile picture avatar (standard social media style)
 * A simple gray circle with a white person icon in the center
 */
export const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23d1d5db'/%3E%3Ccircle cx='50' cy='38' r='12' fill='white'/%3E%3Cpath d='M50 55c-8 0-15 4-15 9v6h30v-6c0-5-7-9-15-9z' fill='white'/%3E%3C/svg%3E";

/**
 * Strip HTML tags from text and decode HTML entities
 * Works in both browser and server environments
 * @param html - HTML string to clean
 * @returns Plain text with HTML tags removed and entities decoded
 */
export function stripHtmlTags(html: string | undefined | null): string {
  if (!html) return "";
  
  // For server-side rendering, use regex-based approach
  if (typeof document === "undefined") {
    let text = html
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      // Decode numeric entities
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/&#x([a-f\d]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    
    // Clean up multiple spaces and newlines
    text = text
      .replace(/\s+/g, " ") // Multiple spaces to single space
      .replace(/\n\s*\n/g, "\n\n") // Multiple newlines to double newline
      .trim();
    
    return text;
  }
  
  // For client-side, use DOM parsing (more accurate)
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  
  // Get text content (automatically strips HTML tags)
  let text = tmp.textContent || tmp.innerText || "";
  
  // Clean up multiple spaces and newlines
  text = text
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/\n\s*\n/g, "\n\n") // Multiple newlines to double newline
    .trim();
  
  return text;
}

/**
 * Format diary entry date as "today", "yesterday", "day before yesterday", or formatted date
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string
 */
export function formatDiaryDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  
  // Reset time to midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Calculate difference in days
  const diffTime = today.getTime() - entryDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays === 2) {
    return "day before yesterday";
  } else {
    // Format as "Jan 15, 2025"
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }
}
