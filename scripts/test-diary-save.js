#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testDiarySave() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find user
    const user = await db.collection('users').findOne({ email: 'hridyesh2309@gmail.com' });

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }

    console.log('\n👤 USER INFO:');
    console.log('User ID:', user._id);
    console.log('Username:', user.username);

    // Find a book to test with
    const book = await db.collection('books').findOne();

    if (!book) {
      console.log('❌ No books found in database');
      await mongoose.disconnect();
      return;
    }

    console.log('\n📚 TESTING WITH BOOK:');
    console.log('Book ID:', book._id);
    console.log('Title:', book.volumeInfo?.title || 'Unknown');

    // Create a test diary entry
    const testEntry = {
      bookId: book._id,
      bookTitle: book.volumeInfo?.title || 'Test Book',
      bookAuthor: book.volumeInfo?.authors?.[0] || 'Test Author',
      bookCover: book.volumeInfo?.imageLinks?.thumbnail || '',
      content: '<p>This is a test diary entry created by the diagnostic script.</p>',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('\n📝 ADDING TEST ENTRY:');
    console.log('Entry:', JSON.stringify(testEntry, null, 2));

    // Initialize diaryEntries if it doesn't exist
    if (!user.diaryEntries) {
      console.log('⚠️  diaryEntries field does not exist, initializing...');
    }

    // Add the entry
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $push: {
          diaryEntries: testEntry
        }
      }
    );

    console.log('\n✅ UPDATE RESULT:');
    console.log('Modified count:', result.modifiedCount);
    console.log('Matched count:', result.matchedCount);

    // Verify the save
    const updatedUser = await db.collection('users').findOne({ _id: user._id });
    console.log('\n📊 VERIFICATION:');
    console.log('Diary entries count:', updatedUser.diaryEntries?.length || 0);

    if (updatedUser.diaryEntries && updatedUser.diaryEntries.length > 0) {
      console.log('\n✅ SUCCESS! Diary entries are now in the database.');
      console.log('\nLatest entry:');
      const latest = updatedUser.diaryEntries[updatedUser.diaryEntries.length - 1];
      console.log('  Book:', latest.bookTitle);
      console.log('  Content:', latest.content);
    } else {
      console.log('\n❌ FAILED! Diary entries were not saved.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testDiarySave();
