#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function quickFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Set avatar for hridyesh
    const result = await db.collection('users').updateOne(
      { email: 'hridyesh2309@gmail.com' },
      {
        $set: {
          avatar: 'https://i.pravatar.cc/150?img=15',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Avatar set for hridyesh2309@gmail.com');
      console.log('   Avatar: https://i.pravatar.cc/150?img=15\n');
    } else {
      console.log('⚠️  User not updated (may already have avatar)\n');
    }

    // Check the user data
    const user = await db.collection('users').findOne({ email: 'hridyesh2309@gmail.com' });
    console.log('👤 User: hridyesh2309@gmail.com');
    console.log('   Bookshelf:', user.bookshelf?.length || 0, 'books');
    console.log('   Liked:', user.likedBooks?.length || 0, 'books');
    console.log('   TBR:', user.tbrBooks?.length || 0, 'books');
    console.log('   Avatar:', user.avatar || 'Not set');
    console.log('\n✅ Data is in database!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

quickFix();
