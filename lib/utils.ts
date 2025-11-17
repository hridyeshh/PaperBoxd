import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
