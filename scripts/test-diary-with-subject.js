#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testDiaryWithSubject() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find user
    const user = await db.collection('users').findOne({ email: 'hridyesh2309@gmail.com' });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📔 User:', user.username);
    console.log('Total diary entries:', user.diaryEntries?.length || 0);

    if (user.diaryEntries && user.diaryEntries.length > 0) {
      console.log('\n📖 Diary entries:');
      user.diaryEntries.forEach((entry, i) => {
        console.log(`\n${i + 1}. Entry ID: ${entry._id}`);
        console.log(`   Book ID: ${entry.bookId || 'null (general entry)'}`);
        console.log(`   Book Title: ${entry.bookTitle || 'null'}`);
        console.log(`   Subject: ${entry.subject || 'null'}`);
        console.log(`   Content: ${entry.content.substring(0, 50)}...`);
        console.log(`   Likes: ${(entry.likes || []).length}`);
        console.log(`   Created: ${entry.createdAt}`);
      });

      // Count general entries (no bookId)
      const generalEntries = user.diaryEntries.filter(e => !e.bookId);
      const entriesWithSubject = user.diaryEntries.filter(e => e.subject && e.subject.trim());

      console.log(`\n\n📊 Summary:`);
      console.log(`   Total entries: ${user.diaryEntries.length}`);
      console.log(`   General entries (no book): ${generalEntries.length}`);
      console.log(`   Entries with subject: ${entriesWithSubject.length}`);
      console.log(`   Book-related entries: ${user.diaryEntries.length - generalEntries.length}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testDiaryWithSubject();
