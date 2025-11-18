#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testLike() {
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
    console.log('User ID:', user._id.toString());
    console.log('Total diary entries:', user.diaryEntries?.length || 0);

    if (user.diaryEntries && user.diaryEntries.length > 0) {
      const firstEntry = user.diaryEntries[0];
      console.log('\n📖 First diary entry:');
      console.log('  ID:', firstEntry._id.toString());
      console.log('  Book:', firstEntry.bookTitle);
      console.log('  Likes:', firstEntry.likes || []);
      console.log('  Likes count:', (firstEntry.likes || []).length);

      // Check if user liked their own entry
      const userLiked = (firstEntry.likes || []).some(id => id.toString() === user._id.toString());
      console.log('  User liked:', userLiked);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testLike();
