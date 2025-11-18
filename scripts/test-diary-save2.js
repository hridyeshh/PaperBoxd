#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testDiarySave2() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    // Import User model
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Find user
    const user = await User.findOne({ email: 'hridyesh2309@gmail.com' });

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }

    console.log('\n📊 BEFORE SAVE:');
    console.log('Diary entries:', user.diaryEntries?.length || 0);

    // Add a test entry using Mongoose (similar to API)
    if (!user.diaryEntries) {
      user.diaryEntries = [];
    }

    const testEntry = {
      bookId: new mongoose.Types.ObjectId('691cbedd3d74070e687828c9'),
      bookTitle: 'Letters from a Stoic',
      bookAuthor: 'Seneca',
      bookCover: 'https://images.isbndb.com/covers/27308833482237.jpg',
      content: '<p>Test entry via script - checking if Mongoose save works</p>',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    user.diaryEntries.push(testEntry);
    user.markModified('diaryEntries');

    console.log('\n📝 ATTEMPTING SAVE...');
    console.log('Diary entries to save:', user.diaryEntries.length);

    await user.save();

    console.log('✅ Save completed');

    // Verify
    const verifyUser = await User.findById(user._id);
    console.log('\n📊 AFTER SAVE (VERIFICATION):');
    console.log('Diary entries:', verifyUser.diaryEntries?.length || 0);

    if (verifyUser.diaryEntries) {
      console.log('\nLatest entry:');
      const latest = verifyUser.diaryEntries[verifyUser.diaryEntries.length - 1];
      console.log('  Book:', latest.bookTitle);
      console.log('  Content:', latest.content.substring(0, 50));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testDiarySave2();
