import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🧪 Testing MongoDB connection...");

    await connectDB();

    const userCount = await User.countDocuments();

    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully",
      stats: {
        userCount,
      },
    });
  } catch (error) {
    console.error("❌ Database test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
