const mongoose = require('mongoose');

async function clearCache() {
  try {
    const MONGODB_URI = 'mongodb+srv://hridyesh:ITfhgF7SnwFnQoIU@paperboxd.0ckozgn.mongodb.net/';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    const count = await booksCollection.countDocuments();
    console.log(`📚 Found ${count} books in database`);
    
    // Delete all books to start fresh with ISBNdb
    const result = await booksCollection.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} books\n`);
    
    console.log('✅ Database cleared! ISBNdb will now populate fresh data.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

clearCache();
