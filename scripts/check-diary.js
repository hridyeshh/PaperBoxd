#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkDiary() {
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
    console.log('==============');
    console.log('_id:', user._id);
    console.log('email:', user.email);
    console.log('username:', user.username);

    console.log('\n📔 DIARY ENTRIES:');
    console.log('==================');

    if (!user.diaryEntries || user.diaryEntries.length === 0) {
      console.log('❌ No diary entries found');
      console.log('\nPossible issues:');
      console.log('1. Diary entries are not being saved to the database');
      console.log('2. The diaryEntries field does not exist on the user document');
      console.log('3. Entries are being saved to a different user');
    } else {
      console.log(`✅ Found ${user.diaryEntries.length} diary entries`);
      console.log('\nEntries:');
      user.diaryEntries.forEach((entry, index) => {
        console.log(`\n${index + 1}. Entry:`);
        console.log('   bookId:', entry.bookId);
        console.log('   bookTitle:', entry.bookTitle);
        console.log('   bookAuthor:', entry.bookAuthor);
        console.log('   content length:', entry.content?.length || 0, 'characters');
        console.log('   createdAt:', entry.createdAt);
        console.log('   updatedAt:', entry.updatedAt);
      });
    }

    console.log('\n📚 CHECKING BOOKS COLLECTION:');
    console.log('===============================');
    const booksCount = await db.collection('books').countDocuments();
    console.log(`Total books in collection: ${booksCount}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkDiary();
