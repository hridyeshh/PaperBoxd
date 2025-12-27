# DNF (Did Not Finish) Books - Complete Logic Documentation

## Overview
The website handles DNF books through multiple mechanisms:
1. **Mobile API**: Explicit DNF status logging
2. **Reading Progress API**: Automatic DNF detection via reading progress
3. **Profile API**: DNF detection from bookshelf entries
4. **Web UI**: TBR section displays DNF books with reading progress

---

## 1. Data Structure

### User Model (`lib/db/models/User.ts`)

**Bookshelf Books** (`IBookshelfBook`):
```typescript
interface IBookshelfBook extends IBookReference {
  finishedOn: Date;
  format?: "Print" | "Digital" | "Audio";
  rating?: number; // 1-5
  thoughts?: string; // DNF indicator stored here
}
```

**TBR Books** (`ITbrBook`):
```typescript
interface ITbrBook extends IBookReference {
  addedOn: Date;
  urgency?: "Soon" | "Eventually" | "This weekend";
  whyNow?: string;
}
```

**Key Point**: DNF books are stored in **bookshelf** with `thoughts` field containing "DNF" prefix, but they're also tracked in **TBR** when reading progress is set.

---

## 2. Mobile API - Explicit DNF Logging

### File: `app/api/mobile/v1/books/[id]/log/route.ts`

**Endpoint**: `POST /api/mobile/v1/books/[id]/log`

**Status Options**: `"Want to Read" | "Reading" | "Read" | "DNF"`

**DNF Logic** (lines 275-298):
```typescript
case "DNF":
  // Remove from other collections
  removeFromCollection(user.tbrBooks);
  removeFromCollection(user.currentlyReading);
  removeFromCollection(user.bookshelf);
  
  // Add to bookshelf with DNF prefix in thoughts
  if (!checkInCollection(user.bookshelf)) {
    const dnfThoughts = thoughts ? `DNF: ${thoughts}` : "DNF";
    user.bookshelf.push({
      ...bookReference,
      finishedOn: new Date(),
      format: format,
      rating: rating,
      thoughts: dnfThoughts, // "DNF" or "DNF: [user thoughts]"
    });
    user.totalBooksRead += 1; // Counts as read
    await book.updateStats("read");
    
    // Add activity
    user.activities.push({
      type: "read",
      bookId: bookIdObj,
      timestamp: new Date(),
    });
  }
  break;
```

**Key Behaviors**:
- DNF books are added to **bookshelf** (not TBR)
- `thoughts` field is prefixed with "DNF: " if user provides thoughts
- Still counts toward `totalBooksRead`
- Creates a "read" activity
- Removed from TBR and currentlyReading before adding

---

## 3. Reading Progress API - Automatic DNF Detection

### File: `app/api/users/[username]/reading-progress/route.ts`

**Endpoint**: `POST /api/users/[username]/reading-progress`

**Logic** (lines 176-213):

**When pagesRead > 0 but < totalPages**:
```typescript
else if (clampedPagesRead > 0) {
  // If progress is set but not complete, add to DNF (TBR) if not already there
  const isInTbr = user.tbrBooks?.some(
    (b) => b.bookId?.toString() === bookId
  );
  
  if (!isInTbr) {
    // Add to TBR (DNF) with book reference
    user.tbrBooks.push({
      ...bookReference,
      addedOn: new Date(),
    });
  }
}
```

**When pagesRead === 0**:
```typescript
else if (clampedPagesRead === 0) {
  // If progress is reset to 0, remove from DNF (TBR) if it's there
  if (user.tbrBooks && user.tbrBooks.length > 0) {
    const tbrIndex = user.tbrBooks.findIndex(
      (b) => b.bookId?.toString() === bookId
    );
    
    if (tbrIndex >= 0) {
      user.tbrBooks.splice(tbrIndex, 1);
    }
  }
}
```

**Key Behaviors**:
- **Any reading progress (> 0 pages)** automatically adds book to **TBR** (treated as DNF)
- **Resetting progress to 0** removes from TBR
- This is the **automatic DNF mechanism** - no explicit "DNF" status needed
- Books with partial progress are considered "Did Not Finish"

---

## 4. Profile API - DNF Detection from Bookshelf

### File: `app/api/mobile/v1/profile/route.ts`

**Endpoint**: `GET /api/mobile/v1/profile`

**DNF Detection Logic** (lines 383-408):
```typescript
const dnfBooks = populatedBookshelf.filter((book: PopulatedBook) => {
  // Check thoughts field for DNF indicators
  if (book.thoughts) {
    const thoughtsLower = book.thoughts.toLowerCase();
    if (thoughtsLower.includes("dnf") || 
        thoughtsLower.includes("did not finish") ||
        thoughtsLower.includes("didn't finish") ||
        thoughtsLower.includes("couldn't finish") ||
        thoughtsLower.includes("could not finish")) {
      return true;
    }
  }
  
  // Check if there's a reason field (some books might have this)
  if (book.reason) {
    const reasonLower = String(book.reason).toLowerCase();
    if (reasonLower.includes("dnf") || reasonLower.includes("did not finish")) {
      return true;
    }
  }
  
  return false;
});
```

**Detection Patterns**:
- Searches `thoughts` field for: "dnf", "did not finish", "didn't finish", "couldn't finish", "could not finish"
- Also checks `reason` field (if present)
- Case-insensitive matching
- Returns filtered list of DNF books from bookshelf

**Response**:
- `dnfCount`: Number of DNF books detected
- Used for statistics in mobile profile

---

## 5. Web UI - TBR Section Display

### File: `app/u/[username]/page.tsx`

**Component**: `TbrSection` (lines 1663-2054)

**Key Features**:

1. **Reading Progress Display**:
   - Fetches `totalPages` for each book in TBR
   - Shows progress bar: `pagesRead / totalPages`
   - Uses sessionStorage cache for performance

2. **Progress Fetching Logic** (lines 1712-1840):
```typescript
// For each book in TBR
for (const book of paginatedBooks) {
  const pagesRead = bookWithIds.pagesRead || 0;
  
  // Skip if no pages read (not a DNF book)
  if (pagesRead === 0) {
    continue;
  }
  
  // Fetch totalPages from book API
  // Display progress: pagesRead / totalPages
}
```

3. **Book Navigation**:
   - Clicking a book navigates to `/b/[bookId]`
   - Handles multiple ID formats (ISBNdb, Open Library, MongoDB ObjectId)

**Key Point**: The TBR section displays books with reading progress, which are effectively DNF books (books started but not finished).

---

## 6. Book Detail Page - DNF Status Sync

### File: `app/b/[slug]/page.tsx`

**DNF State Management** (lines 259-277):
```typescript
// Sync DNF state: if pages > 0, book should be in DNF
// The API automatically adds to DNF when progress is set,
// so we need to ensure UI state matches
if (fetchedPagesRead > 0) {
  // Book should be in DNF if pages > 0
  // Check if it's actually in TBR (it should be if API added it)
  const isInTbr = tbrData.books?.some((b: UserBook) => {
    // Match by bookId, isbndbId, openLibraryId, or title
  });
  setIsInTBR(isInTbr || false);
} else if (fetchedPagesRead === 0) {
  // If pages = 0, book should not be in DNF
  setIsInTBR(false);
}
```

**Key Behaviors**:
- If `pagesRead > 0`: Book should be in TBR (DNF)
- If `pagesRead === 0`: Book should NOT be in TBR
- UI syncs with API state automatically

---

## 7. Web API - Bookshelf Addition

### File: `app/api/users/[username]/books/route.ts`

**Endpoint**: `POST /api/users/[username]/books`

**Bookshelf Addition** (lines 284-307):
```typescript
case "bookshelf":
  user.bookshelf.push({
    ...bookReference,
    finishedOn: additionalData.finishedOn || new Date(),
    format: additionalData.format,
    rating: additionalData.rating,
    thoughts: additionalData.thoughts, // Can include "DNF" here
  });
  user.totalBooksRead += 1;
  await book.updateStats("read");
  if (additionalData.rating) {
    await book.updateStats("rating", additionalData.rating);
  }
  // Add activity
  break;
```

**Key Point**: Web API allows adding books to bookshelf with `thoughts` field, which can contain "DNF" indicator. This is how DNF books are stored when added via web interface.

---

## Summary: DNF Flow

### Two Main Paths:

1. **Explicit DNF (Mobile)**:
   - User selects "DNF" status
   - Book added to **bookshelf** with `thoughts: "DNF: [user thoughts]"`
   - Removed from TBR and currentlyReading
   - Counts toward totalBooksRead

2. **Automatic DNF (Reading Progress)**:
   - User sets reading progress (pagesRead > 0)
   - Book automatically added to **TBR** (treated as DNF)
   - If progress reset to 0, removed from TBR
   - No explicit "DNF" status needed

### Detection:
- Profile API scans bookshelf `thoughts` field for DNF keywords
- TBR section displays books with reading progress (DNF books)
- Book detail page syncs DNF state based on reading progress

### Storage:
- **Bookshelf**: Explicit DNF books (with "DNF" in thoughts)
- **TBR**: Automatic DNF books (with reading progress > 0)

---

## Files Involved

1. **Mobile API**:
   - `app/api/mobile/v1/books/[id]/log/route.ts` - DNF logging
   - `app/api/mobile/v1/profile/route.ts` - DNF detection

2. **Web API**:
   - `app/api/users/[username]/reading-progress/route.ts` - Auto DNF via progress
   - `app/api/users/[username]/books/route.ts` - Bookshelf addition

3. **UI Components**:
   - `app/u/[username]/page.tsx` - TBR section display
   - `app/b/[slug]/page.tsx` - Book detail DNF sync

4. **Data Models**:
   - `lib/db/models/User.ts` - IBookshelfBook, ITbrBook interfaces

