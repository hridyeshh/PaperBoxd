/**
 * Check current indexes on books collection
 * 
 * Run: node scripts/check-indexes.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function checkIndexes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collection = db.collection('books');

    console.log('📋 Current indexes on books collection:\n');
    const indexes = await collection.indexes();

    if (indexes.length === 0) {
      console.log('⚠️  No indexes found!');
    } else {
      indexes.forEach((index, i) => {
        console.log(`--- Index ${i + 1} ---`);
        console.log('Name:', index.name);
        console.log('Keys:', JSON.stringify(index.key));
        console.log('Unique:', index.unique || false);
        console.log('Sparse:', index.sparse || false);
        if (index.background !== undefined) console.log('Background:', index.background);
        if (index.partialFilterExpression) {
          console.log('Partial Filter:', JSON.stringify(index.partialFilterExpression));
        }
        console.log('');
      });
    }

    // Check specifically for googleBooksId index
    const googleBooksIndex = indexes.find(idx => idx.name === 'googleBooksId_1' || idx.key?.googleBooksId);
    if (googleBooksIndex) {
      console.log('🔍 googleBooksId Index Analysis:');
      console.log(`   Name: ${googleBooksIndex.name}`);
      console.log(`   Sparse: ${googleBooksIndex.sparse ? '✅ YES' : '❌ NO'}`);
      console.log(`   Unique: ${googleBooksIndex.unique ? '✅ YES' : '❌ NO'}`);
      
      if (!googleBooksIndex.sparse) {
        console.log('\n⚠️  WARNING: googleBooksId index is NOT sparse!');
        console.log('   This will cause duplicate key errors for books without Google Books IDs.');
        console.log('   Run: node scripts/fix-googlebooks-index.js');
      } else {
        console.log('\n✅ googleBooksId index is sparse - looks good!');
      }
    } else {
      console.log('ℹ️  No googleBooksId index found.');
    }

    // Check for other sparse indexes
    const sparseIndexes = indexes.filter(idx => idx.sparse);
    if (sparseIndexes.length > 0) {
      console.log(`\n📊 Found ${sparseIndexes.length} sparse index(es):`);
      sparseIndexes.forEach(idx => {
        console.log(`   - ${idx.name} (${Object.keys(idx.key)[0]})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

checkIndexes();

