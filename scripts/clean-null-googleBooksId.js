/**
 * Clean up existing books with googleBooksId: null
 * 
 * This script removes the googleBooksId field from documents where it's null,
 * converting them to undefined (which sparse indexes ignore).
 * 
 * Run: node scripts/clean-null-googleBooksId.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function cleanNullValues() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collection = db.collection('books');

    // Count books with null googleBooksId
    const nullCount = await collection.countDocuments({ googleBooksId: null });
    console.log(`📊 Found ${nullCount} books with googleBooksId: null`);

    // Count books with undefined googleBooksId (field doesn't exist)
    const undefinedCount = await collection.countDocuments({ 
      googleBooksId: { $exists: false } 
    });
    console.log(`📊 Found ${undefinedCount} books without googleBooksId field`);

    // Count books with actual googleBooksId values
    const withValueCount = await collection.countDocuments({ 
      googleBooksId: { $exists: true, $ne: null } 
    });
    console.log(`📊 Found ${withValueCount} books with googleBooksId values\n`);

    if (nullCount > 0) {
      console.log('🧹 Cleaning up null values...');
      
      // Remove the googleBooksId field entirely (convert null to undefined)
      const result = await collection.updateMany(
        { googleBooksId: null },
        { $unset: { googleBooksId: "" } }  // Remove the field
      );

      console.log(`✅ Updated ${result.modifiedCount} documents`);
      console.log(`   Matched: ${result.matchedCount}`);
      console.log(`   Modified: ${result.modifiedCount}\n`);

      // Verify
      const remainingNullCount = await collection.countDocuments({ googleBooksId: null });
      const newUndefinedCount = await collection.countDocuments({ 
        googleBooksId: { $exists: false } 
      });

      console.log('📊 After cleanup:');
      console.log(`   Books with googleBooksId: null: ${remainingNullCount}`);
      console.log(`   Books without googleBooksId field: ${newUndefinedCount}`);
      console.log(`   Books with googleBooksId values: ${withValueCount}`);

      if (remainingNullCount === 0) {
        console.log('\n✅ SUCCESS! All null values have been cleaned up.');
      } else {
        console.log(`\n⚠️  WARNING: ${remainingNullCount} books still have null values.`);
      }
    } else {
      console.log('✅ No books with null googleBooksId found. Nothing to clean!');
    }

    // Show sample documents
    console.log('\n📖 Sample documents:');
    const sampleWithNull = await collection.findOne({ googleBooksId: null });
    if (sampleWithNull) {
      console.log('   Book with null (should not exist after cleanup):');
      console.log(`     Title: ${sampleWithNull.volumeInfo?.title || 'N/A'}`);
      console.log(`     googleBooksId: ${sampleWithNull.googleBooksId}`);
    }

    const sampleWithout = await collection.findOne({ 
      googleBooksId: { $exists: false } 
    });
    if (sampleWithout) {
      console.log('   Book without googleBooksId field (correct):');
      console.log(`     Title: ${sampleWithout.volumeInfo?.title || 'N/A'}`);
      console.log(`     googleBooksId: ${sampleWithout.googleBooksId === undefined ? 'undefined (field missing)' : sampleWithout.googleBooksId}`);
    }

    const sampleWithValue = await collection.findOne({ 
      googleBooksId: { $exists: true, $ne: null } 
    });
    if (sampleWithValue) {
      console.log('   Book with googleBooksId value (correct):');
      console.log(`     Title: ${sampleWithValue.volumeInfo?.title || 'N/A'}`);
      console.log(`     googleBooksId: ${sampleWithValue.googleBooksId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

cleanNullValues();

