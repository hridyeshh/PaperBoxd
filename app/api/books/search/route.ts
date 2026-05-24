import { NextRequest, NextResponse } from "next/server";
import { bookApi } from "@/lib/api/endpoints";
import { searchISBNdb, transformISBNdbBook } from "@/lib/api/isbndb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") ?? searchParams.get("query") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("maxResults") ?? searchParams.get("pageSize") ?? "20");

    if (!q) {
      return NextResponse.json({ kind: "books#volumes", totalItems: 0, items: [] });
    }

    const { data, status } = await bookApi.search(q, page, pageSize);
    if (status < 400) {
      return NextResponse.json(data);
    }

    // Go backend failed — fall back to ISBNdb directly
    const isbndbResult = await searchISBNdb(q, page, pageSize);
    const items = (isbndbResult.books ?? []).map((book) => {
      const transformed = transformISBNdbBook(book);
      return {
        id: book.isbn13 || book.isbn,
        ...transformed,
      };
    });

    return NextResponse.json({
      kind: "books#volumes",
      totalItems: isbndbResult.total ?? items.length,
      items,
    });
  } catch (error) {
    console.error("Book search error:", error);
    return NextResponse.json({ error: "Failed to search books" }, { status: 500 });
  }
}
