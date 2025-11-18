#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testActivitiesFeed() {
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
    console.log('User ID:', user._id.toString());

    // Check who the user is following
    console.log('\n👥 Following:', user.following?.length || 0, 'users');
    if (user.following && user.following.length > 0) {
      console.log('Following IDs:', user.following.map(id => id.toString()));

      // Get the followed users
      const followedUsers = await db.collection('users').find({
        _id: { $in: user.following }
      }).toArray();

      console.log('\n📋 Followed users:');
      for (const followedUser of followedUsers) {
        console.log(`\n  - ${followedUser.username || followedUser.name}`);
        console.log(`    Diary entries: ${followedUser.diaryEntries?.length || 0}`);
        console.log(`    Activities: ${followedUser.activities?.length || 0}`);

        if (followedUser.diaryEntries && followedUser.diaryEntries.length > 0) {
          console.log(`    Latest diary entry:`);
          const latest = followedUser.diaryEntries[followedUser.diaryEntries.length - 1];
          console.log(`      - Subject: ${latest.subject || '(no subject)'}`);
          console.log(`      - Book: ${latest.bookTitle || '(general entry)'}`);
          console.log(`      - Created: ${latest.createdAt}`);
        }
      }
    } else {
      console.log('   Not following anyone yet!');
    }

    // Check followers
    console.log('\n\n👥 Followers:', user.followers?.length || 0, 'users');
    if (user.followers && user.followers.length > 0) {
      console.log('Follower IDs:', user.followers.map(id => id.toString()));
    }

    console.log('\n\n📝 Your diary entries:', user.diaryEntries?.length || 0);
    console.log('📊 Your activities:', user.activities?.length || 0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testActivitiesFeed();
