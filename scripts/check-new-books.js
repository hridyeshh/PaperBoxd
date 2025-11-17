const mongoose = require('mongoose');

async function checkBooks() {
  try {
    const MONGODB_URI = 'mongodb+srv://hridyesh:ITfhgF7SnwFnQoIU@paperboxd.0ckozgn.mongodb.net/';
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    const books = await booksCollection.find({}).limit(5).toArray();

    const total = await booksCollection.countDocuments();
    console.log(`📚 Total books: ${total}\n`);

    books.forEach((book, i) => {
      console.log(`Book ${i + 1}:`);
      console.log(`  Title: ${book.volumeInfo?.title}`);
      console.log(`  API Source: ${book.apiSource}`);
      console.log(`  isbndbId: ${book.isbndbId || 'not set'}`);
      console.log(`  googleBooksId: ${book.googleBooksId || 'not set'}`);
      console.log(`  openLibraryId: ${book.openLibraryId || 'not set'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkBooks();
