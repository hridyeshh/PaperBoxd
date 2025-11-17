/**
 * Force Fix MongoDB Indexes - Aggressive Approach
 *
 * This completely drops and recreates all book indexes
 * Run this, then KILL and RESTART your dev server
 */

const mongoose = require('mongoose');

async function forceFix() {
  try {
    const MONGODB_URI = 'mongodb+srv://hridyesh:ITfhgF7SnwFnQoIU@paperboxd.0ckozgn.mongodb.net/';

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    // Show current indexes
    console.log('📋 Current indexes:');
    const currentIndexes = await booksCollection.indexes();
    currentIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.sparse ? '(sparse)' : ''} ${idx.unique ? '(unique)' : ''}`);
    });

    // Drop ALL indexes except _id
    console.log('\n🗑️  Dropping ALL indexes (except _id)...');
    const indexNames = currentIndexes
      .map(idx => idx.name)
      .filter(name => name !== '_id_');

    for (const indexName of indexNames) {
      try {
        await booksCollection.dropIndex(indexName);
        console.log(`  ✅ Dropped ${indexName}`);
      } catch (err) {
        console.log(`  ⚠️  Could not drop ${indexName}: ${err.message}`);
      }
    }

    // Recreate only essential indexes with sparse option
    console.log('\n✨ Creating new sparse unique indexes...\n');

    const indexesToCreate = [
      { field: 'googleBooksId', options: { unique: true, sparse: true } },
      { field: 'isbndbId', options: { unique: true, sparse: true } },
      { field: 'openLibraryId', options: { unique: true, sparse: true } },
      { field: 'isbn', options: { sparse: true } },
      { field: 'isbn13', options: { sparse: true } },
    ];

    for (const { field, options } of indexesToCreate) {
      try {
        const indexSpec = {};
        indexSpec[field] = 1;
        await booksCollection.createIndex(indexSpec, options);
        console.log(`  ✅ Created ${field}_1 (${options.unique ? 'unique, ' : ''}sparse)`);
      } catch (err) {
        console.error(`  ❌ Failed to create ${field}_1:`, err.message);
      }
    }

    // Verify final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await booksCollection.indexes();
    finalIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.sparse ? '✅ sparse' : '❌ NOT sparse'} ${idx.unique ? '✅ unique' : ''}`);
    });

    console.log('\n✅ Indexes fixed successfully!\n');
    console.log('⚠️  IMPORTANT: You MUST now:');
    console.log('   1. STOP your dev server (Ctrl+C or kill the process)');
    console.log('   2. Wait 5 seconds');
    console.log('   3. START it again: npm run dev');
    console.log('\n💡 This is required to clear Next.js cached MongoDB connection!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

forceFix();
