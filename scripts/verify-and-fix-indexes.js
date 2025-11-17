const mongoose = require('mongoose');

async function verifyAndFixIndexes() {
  try {
    const MONGODB_URI = 'mongodb+srv://hridyesh:ITfhgF7SnwFnQoIU@paperboxd.0ckozgn.mongodb.net/';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');

    // Get current indexes
    console.log('📋 Current indexes:');
    const indexes = await booksCollection.indexes();
    
    const googleBooksIndex = indexes.find(idx => idx.name === 'googleBooksId_1');
    const isbndbIndex = indexes.find(idx => idx.name === 'isbndbId_1');
    const openLibraryIndex = indexes.find(idx => idx.name === 'openLibraryId_1');

    console.log('\ngoogleBooksId_1:', googleBooksIndex);
    console.log('isbndbId_1:', isbndbIndex);
    console.log('openLibraryId_1:', openLibraryIndex);

    // Check if they're sparse and unique
    const googleBooksSparse = googleBooksIndex?.sparse === true;
    const isbndbSparse = isbndbIndex?.sparse === true;
    const openLibrarySparse = openLibraryIndex?.sparse === true;

    console.log('\n✅ Verification:');
    console.log(`  googleBooksId_1: ${googleBooksSparse ? '✅ sparse' : '❌ NOT sparse'} ${googleBooksIndex?.unique ? '✅ unique' : '❌ NOT unique'}`);
    console.log(`  isbndbId_1: ${isbndbSparse ? '✅ sparse' : '❌ NOT sparse'} ${isbndbIndex?.unique ? '✅ unique' : '❌ NOT unique'}`);
    console.log(`  openLibraryId_1: ${openLibrarySparse ? '✅ sparse' : '❌ NOT sparse'} ${openLibraryIndex?.unique ? '✅ unique' : '❌ NOT unique'}`);

    if (!googleBooksSparse || !isbndbSparse || !openLibrarySparse) {
      console.log('\n⚠️  Some indexes are not sparse! This will cause duplicate key errors.');
      console.log('🔄 Run: node scripts/fix-book-indexes.js to fix this issue.');
    } else {
      console.log('\n✅ All indexes are correctly configured as sparse and unique!');
    }

    // Count books
    const totalBooks = await booksCollection.countDocuments();
    const booksWithGoogleId = await booksCollection.countDocuments({ googleBooksId: { $exists: true, $ne: null } });
    const booksWithIsbndb = await booksCollection.countDocuments({ isbndbId: { $exists: true, $ne: null } });
    const booksWithOpenLibrary = await booksCollection.countDocuments({ openLibraryId: { $exists: true, $ne: null } });

    console.log('\n📊 Book Statistics:');
    console.log(`  Total books: ${totalBooks}`);
    console.log(`  Books with googleBooksId: ${booksWithGoogleId}`);
    console.log(`  Books with isbndbId: ${booksWithIsbndb}`);
    console.log(`  Books with openLibraryId: ${booksWithOpenLibrary}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

verifyAndFixIndexes();
