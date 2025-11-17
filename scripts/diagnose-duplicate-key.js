const mongoose = require('mongoose');

async function diagnose() {
  try {
    const MONGODB_URI = 'mongodb+srv://hridyesh:ITfhgF7SnwFnQoIU@paperboxd.0ckozgn.mongodb.net/';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    // Find books with googleBooksId explicitly set to null
    const booksWithNullGoogleId = await booksCollection.find({ googleBooksId: null }).toArray();
    console.log(`📊 Books with googleBooksId = null: ${booksWithNullGoogleId.length}`);

    if (booksWithNullGoogleId.length > 0) {
      console.log('\n🚨 PROBLEM FOUND: Books have googleBooksId explicitly set to null!');
      console.log('These books are:');
      booksWithNullGoogleId.forEach((book, i) => {
        console.log(`  ${i + 1}. ${book.volumeInfo?.title} (${book.apiSource})`);
        console.log(`     googleBooksId: ${book.googleBooksId}`);
        console.log(`     isbndbId: ${book.isbndbId || 'not set'}`);
      });

      console.log('\n🔧 Fixing: Removing null googleBooksId fields...');
      const updateResult = await booksCollection.updateMany(
        { googleBooksId: null },
        { $unset: { googleBooksId: "" } }
      );
      console.log(`✅ Updated ${updateResult.modifiedCount} books`);
    } else {
      console.log('✅ No books with googleBooksId = null');
    }

    // Check for books without googleBooksId field
    const booksWithoutField = await booksCollection.countDocuments({
      googleBooksId: { $exists: false }
    });
    console.log(`\n📊 Books without googleBooksId field: ${booksWithoutField}`);

    // Check for books with googleBooksId value
    const booksWithGoogleId = await booksCollection.countDocuments({
      googleBooksId: { $exists: true, $ne: null }
    });
    console.log(`📊 Books with googleBooksId value: ${booksWithGoogleId}`);

    console.log(`\n📊 Total books: ${await booksCollection.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

diagnose();
