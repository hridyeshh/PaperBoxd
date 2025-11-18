#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testBookSave() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Check how many books you have
    const booksCount = await db.collection('books').countDocuments();
    console.log(`📚 Total books in database: ${booksCount}\n`);

    // Show a few sample books
    const sampleBooks = await db.collection('books').find().limit(5).toArray();
    console.log('📖 Sample books:');
    console.log('================');
    sampleBooks.forEach((book, index) => {
      console.log(`\n${index + 1}. ${book.volumeInfo?.title || 'Unknown'}`);
      console.log(`   _id: ${book._id}`);
      console.log(`   isbndbId: ${book.isbndbId || 'N/A'}`);
      console.log(`   openLibraryId: ${book.openLibraryId || 'N/A'}`);
      console.log(`   isbn: ${book.isbn || 'N/A'}`);
    });

    console.log('\n\n💡 IMPORTANT NOTES:');
    console.log('==================');
    console.log('For diary entries to work, the book must be saved in the database first.');
    console.log('When you view a book page, it should automatically save to the database.');
    console.log('\nIf you\'re having issues:');
    console.log('1. Make sure the book is in your Books collection');
    console.log('2. Check that the bookId being passed matches a book\'s _id in the database');
    console.log('3. Look for "Book not found" errors in your server console');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testBookSave();
