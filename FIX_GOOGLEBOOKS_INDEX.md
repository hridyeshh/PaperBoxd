# Fix Google Books Index - Complete Guide

## The Problem

**Error:** `E11000 duplicate key error collection: paperboxd.books index: googleBooksId_1 dup key: { googleBooksId: null }`

**Root Cause:** The `googleBooksId_1` index is **NOT sparse**, which means MongoDB treats `null` as a value and only allows ONE document with `googleBooksId: null`. When you try to insert a second book without a Google Books ID, it fails.

## Solution Overview

1. ✅ **Check current indexes** - Verify the problem
2. ✅ **Fix the index** - Make it sparse
3. ✅ **Clean existing data** - Remove `null` values
4. ✅ **Verify code** - Ensure we use `undefined` not `null`
5. ✅ **Restart server** - Apply changes

---

## Step-by-Step Fix

### Step 1: Check Current Indexes

Run the diagnostic script to see what indexes exist:

```bash
node scripts/check-indexes.js
```

**Expected output if broken:**
```
googleBooksId_1: ❌ NOT sparse ✅ unique
```

**Expected output if fixed:**
```
googleBooksId_1: ✅ sparse ✅ unique
```

---

### Step 2: Fix the Index

Run the fix script to drop the old index and create a sparse one:

```bash
node scripts/fix-googlebooks-index.js
```

**What it does:**
- Drops the non-sparse `googleBooksId_1` index
- Creates a new sparse unique index
- Verifies the fix

**Expected output:**
```
✅ Dropped old index
✅ Created sparse unique index: googleBooksId_1
🎉 SUCCESS! Index is now sparse and unique.
```

---

### Step 3: Clean Existing Data

Remove `null` values from existing documents:

```bash
node scripts/clean-null-googleBooksId.js
```

**What it does:**
- Finds all books with `googleBooksId: null`
- Removes the field entirely (converts to `undefined`)
- Shows statistics

**Expected output:**
```
✅ Updated X documents
✅ SUCCESS! All null values have been cleaned up.
```

---

### Step 4: Verify Code Uses `undefined`

Our code is already correct! ✅

**In `lib/db/models/Book.ts`:**

- `findOrCreateFromISBNdb`: Doesn't set `googleBooksId` at all (correct)
- `findOrCreateFromOpenLibrary`: Doesn't set `googleBooksId` at all (correct)
- `findOrCreateFromGoogleBooks`: Only sets it if value exists:
  ```typescript
  if (googleBooksId) createData.googleBooksId = googleBooksId;
  ```

**Key Principle:**
- ❌ `null` → MongoDB indexes it → Only ONE document allowed
- ✅ `undefined` (or omitted) → Sparse index ignores it → Multiple documents allowed

---

### Step 5: Restart Server

After fixing the index and cleaning data, restart your Next.js server:

```bash
# Kill the current server (Ctrl+C)
# Then restart:
npm run dev
```

Mongoose will now use the correct sparse index definition from the schema.

---

## Manual MongoDB Fix (If Scripts Don't Work)

### Using MongoDB Shell

```bash
# Connect to MongoDB
mongosh "your-mongodb-connection-string"

# Switch to database
use paperboxd

# Check indexes
db.books.getIndexes()

# Drop the problematic index
db.books.dropIndex("googleBooksId_1")

# Create sparse unique index
db.books.createIndex(
  { googleBooksId: 1 }, 
  { unique: true, sparse: true, name: "googleBooksId_1" }
)

# Verify
db.books.getIndexes()

# Clean null values
db.books.updateMany(
  { googleBooksId: null },
  { $unset: { googleBooksId: "" } }
)
```

### Using MongoDB Compass (GUI)

1. Open MongoDB Compass
2. Connect to your database
3. Navigate to `paperboxd` → `books` collection
4. Click "Indexes" tab
5. Find `googleBooksId_1` → Click **Delete**
6. Click "Create Index"
   - Field: `googleBooksId`
   - Options: ✅ Unique, ✅ Sparse
   - Name: `googleBooksId_1`

---

## Schema Fix (Already Applied)

The Mongoose schema now has:

1. **Field definition with sparse:**
   ```typescript
   googleBooksId: {
     type: String,
     sparse: true,  // ✅ Allows multiple nulls
     unique: true,  // ✅ Enforces uniqueness when value exists
     index: true,
   }
   ```

2. **Manual index definition:**
   ```typescript
   BookSchema.index(
     { googleBooksId: 1 },
     {
       unique: true,
       sparse: true,
       name: 'googleBooksId_1',
       background: true,
     }
   );
   ```

This ensures Mongoose creates the index correctly when the server starts.

---

## Verification Checklist

After completing all steps, verify:

- [ ] Index is sparse: `node scripts/check-indexes.js` shows `✅ sparse`
- [ ] No null values: `node scripts/clean-null-googleBooksId.js` shows `0 books with null`
- [ ] Code uses undefined: Check `lib/db/models/Book.ts` - no `null` assignments
- [ ] Server restarted: Fresh Next.js server running
- [ ] Test search: Try searching for a book and adding it

---

## Why This Happened

**Common MongoDB Mistake:** Creating a unique index without making it sparse when the field can be optional.

**The Fix:** Always use `sparse: true` for unique indexes on optional fields.

**Example:**
```javascript
// ❌ BAD - Only one document can have null
{ googleBooksId: { type: String, unique: true } }

// ✅ GOOD - Multiple documents can have null/undefined
{ googleBooksId: { type: String, unique: true, sparse: true } }
```

---

## Troubleshooting

### Error: "Index already exists"

The index might have a different name. Check with:
```bash
node scripts/check-indexes.js
```

Then manually drop it:
```javascript
db.books.dropIndex("actual-index-name")
```

### Error: "Cannot drop index"

You might need to drop it manually in MongoDB Compass or shell.

### Still Getting Duplicate Key Errors

1. Verify index is sparse: `node scripts/check-indexes.js`
2. Clean null values: `node scripts/clean-null-googleBooksId.js`
3. Check for code setting `null`: Search for `googleBooksId: null` in codebase
4. Restart server to apply schema changes

---

## Summary

✅ **Schema fixed** - Sparse index defined  
✅ **Scripts created** - Diagnostic, fix, and cleanup  
✅ **Code verified** - Uses `undefined` not `null`  
✅ **Documentation** - Complete guide provided  

**Next Steps:**
1. Run `node scripts/check-indexes.js`
2. Run `node scripts/fix-googlebooks-index.js`
3. Run `node scripts/clean-null-googleBooksId.js`
4. Restart server
5. Test!

