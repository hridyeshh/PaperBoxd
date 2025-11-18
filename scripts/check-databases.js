#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkDatabases() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('📊 CURRENT CONNECTION:');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('Connection string (sanitized):', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.log('\n');

    const db = mongoose.connection.db;

    // List all databases
    const admin = db.admin();
    const dbs = await admin.listDatabases();

    console.log('📚 ALL DATABASES on this cluster:');
    console.log('==================================');
    for (const database of dbs.databases) {
      console.log(`\n${database.name}:`);
      console.log(`   Size: ${(database.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);

      // Connect to each database and list collections
      const tempDb = mongoose.connection.client.db(database.name);
      const collections = await tempDb.listCollections().toArray();
      console.log(`   Collections (${collections.length}):`, collections.map(c => c.name).join(', '));

      // Count users in each database
      if (collections.find(c => c.name === 'users')) {
        const usersCount = await tempDb.collection('users').countDocuments();
        console.log(`   Users: ${usersCount}`);

        // Find user with hridyesh2309@gmail.com
        const user = await tempDb.collection('users').findOne({ email: 'hridyesh2309@gmail.com' });
        if (user) {
          console.log(`   ✅ FOUND hridyesh2309@gmail.com in this database!`);
          console.log(`      ID: ${user._id}`);
          console.log(`      Bookshelf: ${user.bookshelf?.length || 0} books`);
          console.log(`      Liked: ${user.likedBooks?.length || 0} books`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabases();
