/**
 * Fix Book Collection Indexes
 *
 * This script fixes the duplicate key error by ensuring all unique ID indexes are sparse.
 * Sparse indexes allow multiple documents with null values for the indexed field.
 *
 * Run this with: node scripts/fix-book-indexes.js
 */

const mongoose = require('mongoose');

async function fixBookIndexes() {
  try {
    // Get MongoDB URI from environment or use from .env.local
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hridyesh:ITfhgF7SnwFnQoIU@paperboxd.0ckozgn.mongodb.net/';

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    console.log('\n📋 Current indexes:');
    const currentIndexes = await booksCollection.indexes();
    currentIndexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.sparse ? '(sparse)' : '(NOT sparse)');
    });

    // Drop problematic non-sparse unique indexes
    const indexesToDrop = ['googleBooksId_1', 'isbndbId_1', 'openLibraryId_1'];

    console.log('\n🗑️  Dropping non-sparse unique indexes...');
    for (const indexName of indexesToDrop) {
      try {
        await booksCollection.dropIndex(indexName);
        console.log(`  ✅ Dropped ${indexName}`);
      } catch (err) {
        if (err.code === 27 || err.codeName === 'IndexNotFound') {
          console.log(`  ⚠️  ${indexName} doesn't exist (already dropped or never created)`);
        } else {
          console.error(`  ❌ Error dropping ${indexName}:`, err.message);
        }
      }
    }

    // Create new sparse unique indexes
    console.log('\n✨ Creating new sparse unique indexes...');

    try {
      await booksCollection.createIndex(
        { googleBooksId: 1 },
        { unique: true, sparse: true, name: 'googleBooksId_1' }
      );
      console.log('  ✅ Created sparse unique index: googleBooksId_1');
    } catch (err) {
      console.error('  ❌ Error creating googleBooksId index:', err.message);
    }

    try {
      await booksCollection.createIndex(
        { isbndbId: 1 },
        { unique: true, sparse: true, name: 'isbndbId_1' }
      );
      console.log('  ✅ Created sparse unique index: isbndbId_1');
    } catch (err) {
      console.error('  ❌ Error creating isbndbId index:', err.message);
    }

    try {
      await booksCollection.createIndex(
        { openLibraryId: 1 },
        { unique: true, sparse: true, name: 'openLibraryId_1' }
      );
      console.log('  ✅ Created sparse unique index: openLibraryId_1');
    } catch (err) {
      console.error('  ❌ Error creating openLibraryId index:', err.message);
    }

    // Create regular (non-unique) sparse indexes for ISBN fields
    console.log('\n📚 Creating ISBN indexes...');

    try {
      await booksCollection.createIndex(
        { isbn: 1 },
        { sparse: true, name: 'isbn_1' }
      );
      console.log('  ✅ Created sparse index: isbn_1');
    } catch (err) {
      if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
        console.log('  ⚠️  isbn_1 already exists');
      } else {
        console.error('  ❌ Error creating isbn index:', err.message);
      }
    }

    try {
      await booksCollection.createIndex(
        { isbn13: 1 },
        { sparse: true, name: 'isbn13_1' }
      );
      console.log('  ✅ Created sparse index: isbn13_1');
    } catch (err) {
      if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
        console.log('  ⚠️  isbn13_1 already exists');
      } else {
        console.error('  ❌ Error creating isbn13 index:', err.message);
      }
    }

    console.log('\n📋 Final indexes:');
    const finalIndexes = await booksCollection.indexes();
    finalIndexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.sparse ? '(sparse)' : '(NOT sparse)', index.unique ? '(unique)' : '');
    });

    console.log('\n✅ Book indexes fixed successfully!');
    console.log('💡 You can now search for books without duplicate key errors.');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixBookIndexes();
