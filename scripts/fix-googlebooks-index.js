/**
 * Fix googleBooksId index to be sparse
 * 
 * This script:
 * 1. Drops the existing non-sparse googleBooksId_1 index
 * 2. Creates a new sparse unique index
 * 
 * Run: node scripts/fix-googlebooks-index.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function fixIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    // Get current indexes
    console.log('📋 Current indexes:');
    const indexes = await booksCollection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      if (idx.name === 'googleBooksId_1') {
        console.log(`    sparse: ${idx.sparse || false}, unique: ${idx.unique || false}`);
      }
    });
    console.log('');

    // Check if googleBooksId_1 index exists
    const googleBooksIndex = indexes.find(idx => idx.name === 'googleBooksId_1');
    
    if (googleBooksIndex) {
      // Check if it's already sparse
      if (googleBooksIndex.sparse) {
        console.log('✅ googleBooksId_1 index is already sparse! No changes needed.');
      } else {
        console.log('⚠️  googleBooksId_1 index is NOT sparse. Fixing...\n');
        
        // Drop the old index
        console.log('🗑️  Dropping old googleBooksId_1 index...');
        await booksCollection.dropIndex('googleBooksId_1');
        console.log('✅ Dropped old index\n');
        
        // Create new sparse unique index
        console.log('➕ Creating new sparse unique index...');
        await booksCollection.createIndex(
          { googleBooksId: 1 },
          { 
            unique: true, 
            sparse: true, 
            name: 'googleBooksId_1' 
          }
        );
        console.log('✅ Created sparse unique index: googleBooksId_1\n');
      }
    } else {
      console.log('ℹ️  googleBooksId_1 index does not exist. Creating sparse unique index...');
      await booksCollection.createIndex(
        { googleBooksId: 1 },
        { 
          unique: true, 
          sparse: true, 
          name: 'googleBooksId_1' 
        }
      );
      console.log('✅ Created sparse unique index: googleBooksId_1\n');
    }

    // Verify the fix
    console.log('🔍 Verifying indexes:');
    const updatedIndexes = await booksCollection.indexes();
    const updatedGoogleBooksIndex = updatedIndexes.find(idx => idx.name === 'googleBooksId_1');
    
    if (updatedGoogleBooksIndex) {
      const isSparse = updatedGoogleBooksIndex.sparse || false;
      const isUnique = updatedGoogleBooksIndex.unique || false;
      console.log(`  googleBooksId_1: ${isSparse ? '✅ sparse' : '❌ NOT sparse'} ${isUnique ? '✅ unique' : '❌ NOT unique'}`);
      
      if (isSparse && isUnique) {
        console.log('\n🎉 SUCCESS! Index is now sparse and unique.');
        console.log('   Multiple books with googleBooksId: null/undefined are now allowed!');
      }
    }

    // Check book counts
    console.log('\n📊 Book statistics:');
    const totalBooks = await booksCollection.countDocuments();
    const booksWithGoogleId = await booksCollection.countDocuments({ 
      googleBooksId: { $exists: true, $ne: null } 
    });
    const booksWithoutGoogleId = totalBooks - booksWithGoogleId;
    
    console.log(`  Total books: ${totalBooks}`);
    console.log(`  Books with googleBooksId: ${booksWithGoogleId}`);
    console.log(`  Books without googleBooksId: ${booksWithoutGoogleId}`);

    console.log('\n✅ Done!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixIndex();

