#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testDiaryGet() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Simulate what the GET /api/users/[username]/diary endpoint returns
    const user = await db.collection('users').findOne(
      { email: 'hridyesh2309@gmail.com' },
      { projection: { diaryEntries: 1 } }
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Sort entries like the API does
    const entries = (user.diaryEntries || []).sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log('📔 API RESPONSE SIMULATION:');
    console.log('===========================\n');
    console.log(JSON.stringify({
      entries: entries.map(entry => ({
        id: entry._id || entry.bookId,
        bookId: entry.bookId,
        bookTitle: entry.bookTitle,
        bookAuthor: entry.bookAuthor,
        bookCover: entry.bookCover,
        subject: entry.subject,
        content: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        hasSubject: 'subject' in entry,
        subjectValue: entry.subject,
      })),
      count: entries.length
    }, null, 2));

    console.log('\n✅ This is what the frontend should receive from GET /api/users/hridyesh/diary');
    console.log('\n💡 TIP: Go to your profile page, click the Diary tab, and you should see this entry!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testDiaryGet();
