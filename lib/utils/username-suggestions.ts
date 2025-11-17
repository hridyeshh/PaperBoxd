/**
 * Generate username suggestions based on a user's name
 */

export function generateUsernameSuggestions(name: string, email?: string): string[] {
  const suggestions: string[] = [];
  
  // Clean the name: remove special characters, convert to lowercase
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (cleanName.length === 0) {
    // If no valid name, use email prefix
    if (email) {
      const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (emailPrefix.length >= 3) {
        suggestions.push(emailPrefix);
        suggestions.push(`${emailPrefix}${Math.floor(Math.random() * 1000)}`);
      }
    }
    return suggestions.length > 0 ? suggestions : ['user' + Math.floor(Math.random() * 10000)];
  }

  // First name only
  if (cleanName[0]) {
    suggestions.push(cleanName[0]);
  }

  // First name + last name (if available)
  if (cleanName.length >= 2) {
    const firstName = cleanName[0];
    const lastName = cleanName[cleanName.length - 1];
    suggestions.push(`${firstName}${lastName}`);
    suggestions.push(`${firstName}_${lastName}`);
    suggestions.push(`${firstName}.${lastName}`);
  }

  // First name + numbers
  if (cleanName[0]) {
    const randomNum = Math.floor(Math.random() * 1000);
    suggestions.push(`${cleanName[0]}${randomNum}`);
  }

  // Full name initials (if multiple words)
  if (cleanName.length >= 2) {
    const initials = cleanName.map(n => n[0]).join('');
    if (initials.length >= 2) {
      suggestions.push(initials);
    }
  }

  // Remove duplicates and limit to 5 suggestions
  const unique = Array.from(new Set(suggestions));
  return unique.slice(0, 5);
}

/**
 * Generate a primary suggested username (first suggestion)
 * This will be pre-filled in the username selection form
 */
export function generatePrimaryUsername(name: string, email?: string): string {
  const suggestions = generateUsernameSuggestions(name, email);
  return suggestions[0] || `user${Math.floor(Math.random() * 10000)}`;
}

