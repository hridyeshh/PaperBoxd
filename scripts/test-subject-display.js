#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testSubjectDisplay() {
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

    // Create two test entries - one with subject, one without
    const entry1 = {
      subject: 'My Thoughts on Productivity',
      content: '<p>This is an entry WITH a subject</p>',
      likes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const entry2 = {
      content: '<p>This is an entry WITHOUT a subject</p>',
      likes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('\n📝 Creating test entries...');
    console.log('   Entry 1 subject:', entry1.subject);
    console.log('   Entry 2 subject:', entry2.subject || '(none)');

    // Push both entries
    await db.collection('users').updateOne(
      { _id: user._id },
      { $push: { diaryEntries: { $each: [entry1, entry2] } } }
    );

    // Fetch and verify
    const updatedUser = await db.collection('users').findOne(
      { _id: user._id },
      { projection: { diaryEntries: 1 } }
    );

    const entries = updatedUser.diaryEntries || [];
    const lastTwo = entries.slice(-2);

    console.log('\n📖 Last two entries in database:');
    lastTwo.forEach((entry, i) => {
      console.log(`\n${i + 1}. Entry:`);
      console.log('   Subject:', entry.subject || '(none)');
      console.log('   Content:', entry.content.substring(0, 50));
      console.log('   Has subject field:', 'subject' in entry);
      console.log('   What should display: ', entry.subject && entry.subject.trim() ? entry.subject : 'Diary Entry');
    });

    console.log('\n\n✅ Test complete! Go to your profile → Diary tab and you should see:');
    console.log('   1. "My Thoughts on Productivity" (not "Diary Entry")');
    console.log('   2. "Diary Entry" (because no subject was provided)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testSubjectDisplay();
