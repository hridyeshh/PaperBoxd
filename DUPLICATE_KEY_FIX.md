# Duplicate Key Error Fix

## Problem
You were getting this error when searching for books or accessing book pages:

```
E11000 duplicate key error collection: paperboxd.books index: googleBooksId_1 dup key: { googleBooksId: null }
```

## Root Cause
The MongoDB indexes for `googleBooksId`, `isbndbId`, and `openLibraryId` were created as **unique** but **NOT sparse**. Non-sparse unique indexes don't allow multiple documents with `null` values, which caused errors when saving books from ISBNdb or Open Library (which don't have Google Books IDs).

## Solution Applied

### 1. Fixed MongoDB Indexes
Ran `scripts/fix-book-indexes.js` which:
- Dropped old non-sparse unique indexes
- Created new **sparse + unique** indexes for:
  - `googleBooksId_1`
  - `isbndbId_1`
  - `openLibraryId_1`
  - `isbn_1`
  - `isbn13_1`

Sparse indexes allow multiple documents with `null` or missing values.

### 2. Cleared Book Cache
Ran `scripts/clear-books-cache.js` to:
- Delete all cached books (3 books from Google Books API)
- Start fresh with ISBNdb as the primary source

### 3. Updated Book Model
The `Book.ts` model was already updated to:
- Only set ID fields if they have values (never explicitly set to `null`)
- Handle duplicate key errors gracefully
- Use conditional field assignment to avoid null values

## ⚠️ **IMPORTANT: RESTART YOUR DEV SERVER**

The Next.js server caches the MongoDB connection and index information. Even though we fixed the indexes in MongoDB, **you must restart your dev server** for the changes to take effect!

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it:
npm run dev
```

## Verification

After restarting, you can verify everything is working:

```bash
# 1. Test book search
curl "http://localhost:3000/api/books/search?q=1984&maxResults=2" | jq '.items[0].volumeInfo.title'

# 2. Verify indexes are correct
node scripts/verify-and-fix-indexes.js

# 3. Check that books are being saved
node scripts/check-new-books.js
```

## Scripts Created

- `scripts/fix-book-indexes.js` - Fixes MongoDB indexes to be sparse
- `scripts/clear-books-cache.js` - Clears all cached books
- `scripts/verify-and-fix-indexes.js` - Verifies indexes are correct
- `scripts/check-new-books.js` - Shows books in database

## What Changed

**Before:**
- googleBooksId index: unique ❌ NOT sparse → Multiple nulls not allowed
- Books from ISBNdb/Open Library would fail to save

**After:**
- googleBooksId index: unique ✅ sparse → Multiple nulls allowed
- Books from any API can be saved without conflicts
- ISBNdb is now the primary data source for new searches

## Expected Behavior

1. **Search**: ISBNdb → Open Library → Google Books (fallback hierarchy)
2. **Caching**: All books cached to MongoDB with appropriate ID fields
3. **High Quality**: ISBNdb provides best cover images and metadata
4. **No Errors**: Sparse indexes prevent duplicate key errors

---

**Status:** ✅ Fixed - Just restart your dev server to apply changes!
