/**
 * Test script to show raw JSON response from ISBNdb API
 * 
 * Run: node scripts/test-isbndb-response.js
 */

require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY;

if (!ISBNDB_API_KEY) {
  console.error('❌ ISBNDB_API_KEY not found in .env.local');
  process.exit(1);
}

async function testISBNdbResponse() {
  try {
    // Test 1: Search for books
    console.log('='.repeat(80));
    console.log('TEST 1: Search for books (query: "harry potter")');
    console.log('='.repeat(80));
    
    const searchQuery = 'harry potter';
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://api2.isbndb.com/books/${encodedQuery}?page=1&pageSize=2`;
    
    console.log(`\n📡 Request URL: ${searchUrl}\n`);
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: ISBNDB_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      console.error(`❌ Search API Error: ${searchResponse.status} ${searchResponse.statusText}`);
      const errorText = await searchResponse.text();
      console.error('Response:', errorText);
      return;
    }

    const searchData = await searchResponse.json();
    console.log('📦 Raw JSON Response (Search):');
    console.log(JSON.stringify(searchData, null, 2));
    
    // Show first book structure
    if (searchData.books && searchData.books.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('📖 First Book Structure:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(searchData.books[0], null, 2));
    }

    // Test 2: Get book by ISBN
    if (searchData.books && searchData.books.length > 0) {
      const firstBook = searchData.books[0];
      const isbn = firstBook.isbn13 || firstBook.isbn;
      
      if (isbn) {
        console.log('\n' + '='.repeat(80));
        console.log(`TEST 2: Get book by ISBN (ISBN: ${isbn})`);
        console.log('='.repeat(80));
        
        const bookUrl = `https://api2.isbndb.com/book/${isbn}`;
        console.log(`\n📡 Request URL: ${bookUrl}\n`);
        
        const bookResponse = await fetch(bookUrl, {
          headers: {
            Authorization: ISBNDB_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          console.log('📦 Raw JSON Response (Get by ISBN):');
          console.log(JSON.stringify(bookData, null, 2));
          
          if (bookData.book) {
            console.log('\n' + '='.repeat(80));
            console.log('📖 Book Object Structure:');
            console.log('='.repeat(80));
            console.log(JSON.stringify(bookData.book, null, 2));
          }
        } else {
          console.error(`❌ Get Book API Error: ${bookResponse.status} ${bookResponse.statusText}`);
          const errorText = await bookResponse.text();
          console.error('Response:', errorText);
        }
      }
    }

    // Test 3: Search authors
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Search authors (query: "rowling")');
    console.log('='.repeat(80));
    
    const authorQuery = 'rowling';
    const encodedAuthorQuery = encodeURIComponent(authorQuery);
    const authorUrl = `https://api2.isbndb.com/authors/${encodedAuthorQuery}?page=1&pageSize=2`;
    
    console.log(`\n📡 Request URL: ${authorUrl}\n`);
    
    const authorResponse = await fetch(authorUrl, {
      headers: {
        Authorization: ISBNDB_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (authorResponse.ok) {
      const authorData = await authorResponse.json();
      console.log('📦 Raw JSON Response (Author Search):');
      console.log(JSON.stringify(authorData, null, 2));
    } else {
      console.error(`❌ Author Search API Error: ${authorResponse.status} ${authorResponse.statusText}`);
      const errorText = await authorResponse.text();
      console.error('Response:', errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.message) {
      console.error('Message:', error.message);
    }
  }
}

testISBNdbResponse();

