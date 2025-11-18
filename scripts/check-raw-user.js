#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const user = await db.collection('users').findOne({ email: 'hridyesh2309@gmail.com' });

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }

    console.log('RAW USER DATA:');
    console.log('==============');
    console.log('_id:', user._id);
    console.log('email:', user.email);
    console.log('username:', user.username);
    console.log('name:', user.name);
    console.log('\nBOOK DATA:');
    console.log('bookshelf type:', Array.isArray(user.bookshelf) ? 'array' : typeof user.bookshelf);
    console.log('bookshelf:', JSON.stringify(user.bookshelf, null, 2));
    console.log('\nlikedBooks type:', Array.isArray(user.likedBooks) ? 'array' : typeof user.likedBooks);
    console.log('likedBooks:', JSON.stringify(user.likedBooks, null, 2));
    console.log('\ntbrBooks type:', Array.isArray(user.tbrBooks) ? 'array' : typeof user.tbrBooks);
    console.log('tbrBooks:', JSON.stringify(user.tbrBooks, null, 2));
    console.log('\navatar:', user.avatar);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
