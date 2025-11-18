#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function deleteTestEntries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: 'hridyesh2309@gmail.com' });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📔 BEFORE DELETION:');
    console.log('Total entries:', user.diaryEntries?.length || 0);
    if (user.diaryEntries) {
      user.diaryEntries.forEach((entry, i) => {
        console.log(`${i + 1}. ${entry.bookTitle}: "${entry.content.substring(0, 50)}..."`);
      });
    }

    // Remove all entries (we'll let you create fresh ones through the UI)
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { diaryEntries: [] } }
    );

    console.log('\n✅ Deleted all test entries');
    console.log('Modified count:', result.modifiedCount);

    // Verify
    const updatedUser = await db.collection('users').findOne({ _id: user._id });
    console.log('\n📔 AFTER DELETION:');
    console.log('Total entries:', updatedUser.diaryEntries?.length || 0);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

deleteTestEntries();
