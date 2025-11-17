const mongoose = require('mongoose');

async function checkBooks() {
  try {
    const MONGODB_URI = 'mongodb+srv://hridyesh:ITfhgF7SnwFnQoIU@paperboxd.0ckozgn.mongodb.net/';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    // Check for books with null googleBooksId
    const nullGoogleBooksId = await booksCollection.countDocuments({ googleBooksId: null });
    const undefinedGoogleBooksId = await booksCollection.countDocuments({ googleBooksId: { $exists: false } });
    const withGoogleBooksId = await booksCollection.countDocuments({ googleBooksId: { $exists: true, $ne: null } });
    
    console.log(`\n📊 Books with googleBooksId = null: ${nullGoogleBooksId}`);
    console.log(`📊 Books without googleBooksId field: ${undefinedGoogleBooksId}`);
    console.log(`📊 Books with googleBooksId: ${withGoogleBooksId}`);

    // Sample a book with null googleBooksId
    const sampleBook = await booksCollection.findOne({ googleBooksId: null });
    if (sampleBook) {
      console.log('\n📖 Sample book with null googleBooksId:');
      console.log('  ID:', sampleBook._id);
      console.log('  Title:', sampleBook.volumeInfo?.title);
      console.log('  API Source:', sampleBook.apiSource);
    }

    // Check current indexes
    console.log('\n📋 Current googleBooksId_1 index:');
    const indexes = await booksCollection.indexes();
    const googleBooksIndex = indexes.find(idx => idx.name === 'googleBooksId_1');
    console.log(JSON.stringify(googleBooksIndex, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkBooks();
