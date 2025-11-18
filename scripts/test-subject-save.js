#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testSubjectSave() {
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

    console.log('\n👤 User:', user.username);
    console.log('Current diary entries:', user.diaryEntries?.length || 0);

    // Create a test entry with subject
    const testEntry = {
      subject: 'Test Subject from Script',
      content: '<p>This is a test entry to verify subject saving</p>',
      likes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('\n📝 Creating entry with subject:', testEntry.subject);

    // Use updateOne to push the entry
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      { $push: { diaryEntries: testEntry } }
    );

    console.log('\n✅ Update result:');
    console.log('   Acknowledged:', updateResult.acknowledged);
    console.log('   Modified count:', updateResult.modifiedCount);

    // Fetch the updated user
    const updatedUser = await db.collection('users').findOne(
      { _id: user._id },
      { projection: { diaryEntries: 1 } }
    );

    const diaryEntries = updatedUser.diaryEntries || [];
    const lastEntry = diaryEntries[diaryEntries.length - 1];

    console.log('\n📖 Last entry in database:');
    console.log('   Subject:', lastEntry?.subject);
    console.log('   Has subject field:', 'subject' in (lastEntry || {}));
    console.log('   Content:', lastEntry?.content?.substring(0, 50));
    console.log('   All fields:', Object.keys(lastEntry || {}));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testSubjectSave();
