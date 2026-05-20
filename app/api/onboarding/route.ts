import { NextRequest, NextResponse } from "next/server";
import { userApi } from "@/lib/api/endpoints";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { genres, authors } = body;

  if (!Array.isArray(genres) || genres.length === 0) {
    return NextResponse.json({ error: "At least one genre is required" }, { status: 400 });
  }
  if (!Array.isArray(authors)) {
    return NextResponse.json({ error: "Authors array is required" }, { status: 400 });
  }

  const { status } = await userApi.saveOnboarding(genres, authors);
  if (status >= 400) {
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status });
  }

  return NextResponse.json({
    success: true,
    message: "Onboarding completed successfully",
    preferences: { genres, authors },
  });
}

export async function GET() {
  const genres = [
    { id: "fiction", name: "Fiction", description: "Literary and contemporary fiction" },
    { id: "mystery", name: "Mystery", description: "Detective stories and whodunits" },
    { id: "thriller", name: "Thriller", description: "Suspenseful page-turners" },
    { id: "romance", name: "Romance", description: "Love stories and relationships" },
    { id: "science-fiction", name: "Science Fiction", description: "Futuristic and speculative" },
    { id: "fantasy", name: "Fantasy", description: "Magic and mythical worlds" },
    { id: "horror", name: "Horror", description: "Scary and supernatural" },
    { id: "historical", name: "Historical Fiction", description: "Stories set in the past" },
    { id: "biography", name: "Biography", description: "True stories of real people" },
    { id: "self-help", name: "Self-Help", description: "Personal development" },
    { id: "business", name: "Business", description: "Business and economics" },
    { id: "non-fiction", name: "Non-Fiction", description: "True stories and factual" },
    { id: "young-adult", name: "Young Adult", description: "Books for teens and young adults" },
    { id: "classics", name: "Classics", description: "Timeless literary works" },
    { id: "poetry", name: "Poetry", description: "Verse and poetic works" },
  ];
  return NextResponse.json({ genres });
}
