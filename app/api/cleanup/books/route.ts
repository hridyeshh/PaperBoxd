import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Book from "@/lib/db/models/Book";

/**
 * Cleanup old book data
 * DELETE /api/cleanup/books
 *
 * Removes books that haven't been accessed in the last 15 days
 * This helps manage storage limits on free-tier MongoDB (512MB)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Optional: Add authentication check here to prevent unauthorized cleanup
    // You might want to add a secret token in headers or env variable
    const authHeader = request.headers.get("authorization");
    const cleanupSecret = process.env.CLEANUP_SECRET;

    if (cleanupSecret && authHeader !== `Bearer ${cleanupSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid cleanup secret" },
        { status: 401 }
      );
    }

    await connectDB();

    // Calculate the cutoff date (15 days ago)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // Find books that haven't been accessed in 15 days
    const booksToDelete = await Book.find({
      lastAccessed: { $lt: fifteenDaysAgo },
    }).select("_id googleBooksId volumeInfo.title lastAccessed");

    const deletedCount = booksToDelete.length;

    if (deletedCount === 0) {
      return NextResponse.json({
        message: "No old books to clean up",
        deletedCount: 0,
        cutoffDate: fifteenDaysAgo.toISOString(),
      });
    }

    // Delete the old books
    const result = await Book.deleteMany({
      lastAccessed: { $lt: fifteenDaysAgo },
    });

    return NextResponse.json({
      message: `Successfully cleaned up ${result.deletedCount} old books`,
      deletedCount: result.deletedCount,
      cutoffDate: fifteenDaysAgo.toISOString(),
      books: booksToDelete.map((book) => ({
        id: book.googleBooksId,
        title: book.volumeInfo?.title,
        lastAccessed: book.lastAccessed,
      })),
    });
  } catch (error) {
    console.error("Book cleanup error:", error);
    return NextResponse.json(
      {
        error: "Failed to clean up books",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get cleanup statistics
 * GET /api/cleanup/books
 *
 * Returns information about books that would be cleaned up
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Calculate the cutoff date (15 days ago)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // Count books that would be deleted
    const oldBooksCount = await Book.countDocuments({
      lastAccessed: { $lt: fifteenDaysAgo },
    });

    // Get total books count
    const totalBooksCount = await Book.countDocuments();

    // Get storage statistics
    const stats = await Book.aggregate([
      {
        $group: {
          _id: null,
          totalBooks: { $sum: 1 },
          avgUsageCount: { $avg: "$usageCount" },
        },
      },
    ]);

    return NextResponse.json({
      totalBooks: totalBooksCount,
      oldBooks: oldBooksCount,
      booksToKeep: totalBooksCount - oldBooksCount,
      cutoffDate: fifteenDaysAgo.toISOString(),
      statistics: stats[0] || null,
      message:
        oldBooksCount > 0
          ? `${oldBooksCount} books eligible for cleanup`
          : "No books eligible for cleanup",
    });
  } catch (error) {
    console.error("Book cleanup stats error:", error);
    return NextResponse.json(
      {
        error: "Failed to get cleanup statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
