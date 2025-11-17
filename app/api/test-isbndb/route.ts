import { NextRequest, NextResponse } from "next/server";
import {
  searchISBNdbWithFallback,
  getBookByISBN,
  searchAuthors,
} from "@/lib/api/isbndb";

/**
 * Test ISBNdb API connection and functionality
 * 
 * GET /api/test-isbndb
 * 
 * This endpoint tests:
 * 1. API key configuration
 * 2. Book search functionality
 * 3. Book lookup by ISBN
 * 4. Author search functionality
 */
export async function GET(request: NextRequest) {
  const results: {
    apiKeyConfigured: boolean;
    apiKeyValue?: string;
    tests: Array<{
      name: string;
      status: "success" | "error";
      message: string;
      data?: any;
    }>;
  } = {
    apiKeyConfigured: !!process.env.ISBNDB_API_KEY,
    apiKeyValue: process.env.ISBNDB_API_KEY
      ? `${process.env.ISBNDB_API_KEY.substring(0, 8)}...`
      : undefined,
    tests: [],
  };

  // Test 1: Check API key
  if (!process.env.ISBNDB_API_KEY) {
    results.tests.push({
      name: "API Key Configuration",
      status: "error",
      message: "ISBNDB_API_KEY is not set in environment variables",
    });
    return NextResponse.json(results, { status: 500 });
  }

  results.tests.push({
    name: "API Key Configuration",
    status: "success",
    message: "API key is configured",
  });

  // Test 2: Book Search
  try {
    const searchResult = await searchISBNdbWithFallback("harry potter", 1, 5);
    if (searchResult.success && searchResult.data) {
      results.tests.push({
        name: "Book Search",
        status: "success",
        message: `Successfully searched books. Found ${searchResult.data.total} total results.`,
        data: {
          total: searchResult.data.total,
          booksReturned: searchResult.data.books.length,
          firstBook: {
            title: searchResult.data.books[0]?.title,
            isbn: searchResult.data.books[0]?.isbn,
            isbn13: searchResult.data.books[0]?.isbn13,
            authors: searchResult.data.books[0]?.authors,
          },
        },
      });
    } else {
      results.tests.push({
        name: "Book Search",
        status: "error",
        message: searchResult.error || "No results found",
      });
    }
  } catch (error) {
    results.tests.push({
      name: "Book Search",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 3: Get Book by ISBN (using a known ISBN)
  try {
    // Harry Potter and the Philosopher's Stone ISBN-13
    const isbn = "9780747532699";
    const book = await getBookByISBN(isbn);
    results.tests.push({
      name: "Get Book by ISBN (Harry Potter)",
      status: "success",
      message: `Successfully fetched book by ISBN ${isbn}`,
      data: {
        title: book.title,
        isbn: book.isbn,
        isbn13: book.isbn13,
        authors: book.authors,
        publisher: book.publisher,
        date_published: book.date_published,
        pages: book.pages,
        hasImage: !!book.image,
      },
    });
  } catch (error) {
    results.tests.push({
      name: "Get Book by ISBN (Harry Potter)",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 4: Get Book by ISBN (Deep Work - the problematic ISBN)
  try {
    const isbn = "9781455586660";
    const book = await getBookByISBN(isbn);
    results.tests.push({
      name: "Get Book by ISBN",
      status: "success",
      message: `Successfully fetched book by ISBN ${isbn}`,
      data: {
        title: book.title,
        isbn: book.isbn,
        isbn13: book.isbn13,
        authors: book.authors,
        publisher: book.publisher,
        date_published: book.date_published,
        pages: book.pages,
        hasImage: !!book.image,
      },
    });
  } catch (error) {
    results.tests.push({
      name: "Get Book by ISBN",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 5: Author Search
  try {
    const authorResult = await searchAuthors("rowling", 1, 5);
    if (authorResult.authors && authorResult.authors.length > 0) {
      results.tests.push({
        name: "Author Search",
        status: "success",
        message: `Successfully searched authors. Found ${authorResult.total} total results.`,
        data: {
          total: authorResult.total,
          authorsReturned: authorResult.authors.length,
          firstAuthor: authorResult.authors[0]?.author,
        },
      });
    } else {
      results.tests.push({
        name: "Author Search",
        status: "error",
        message: "No authors found",
      });
    }
  } catch (error) {
    results.tests.push({
      name: "Author Search",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Determine overall status
  const hasErrors = results.tests.some((test) => test.status === "error");
  const statusCode = hasErrors ? 500 : 200;

  return NextResponse.json(results, { status: statusCode });
}

