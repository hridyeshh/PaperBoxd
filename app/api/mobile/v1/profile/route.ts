import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-token";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

/**
 * Mobile API: Get current user profile
 * 
 * GET /api/mobile/v1/profile
 * Headers: Authorization: Bearer <token>
 * 
 * Returns: User profile data matching iOS UserProfile model
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log("=".repeat(80));
    console.log(`[Mobile Profile API] [${requestId}] === REQUEST START ===`);
    console.log(`[Mobile Profile API] [${requestId}] Path: ${req.nextUrl.pathname}`);
    console.log(`[Mobile Profile API] [${requestId}] Method: ${req.method}`);
    console.log(`[Mobile Profile API] [${requestId}] URL: ${req.url}`);
    console.log(`[Mobile Profile API] [${requestId}] Timestamp: ${new Date().toISOString()}`);
    
    // Log ALL headers for debugging
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log(`[Mobile Profile API] [${requestId}] All Headers:`, JSON.stringify(allHeaders, null, 2));
    
    // Specifically check Authorization header (standard and custom fallback)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const customAuthHeader = req.headers.get("x-user-authorization") || req.headers.get("X-User-Authorization");
    
    console.log(`[Mobile Profile API] [${requestId}] Authorization header present: ${!!authHeader}`);
    console.log(`[Mobile Profile API] [${requestId}] X-User-Authorization header present: ${!!customAuthHeader}`);
    
    if (authHeader) {
      console.log(`[Mobile Profile API] [${requestId}] Authorization header length: ${authHeader.length}`);
      console.log(`[Mobile Profile API] [${requestId}] Authorization header (first 50 chars): ${authHeader.substring(0, 50)}...`);
      console.log(`[Mobile Profile API] [${requestId}] Authorization starts with 'Bearer': ${authHeader.startsWith("Bearer ")}`);
    }
    
    if (customAuthHeader) {
      console.log(`[Mobile Profile API] [${requestId}] X-User-Authorization header length: ${customAuthHeader.length}`);
      console.log(`[Mobile Profile API] [${requestId}] X-User-Authorization header (first 50 chars): ${customAuthHeader.substring(0, 50)}...`);
    }
    
    if (!authHeader && !customAuthHeader) {
      console.log(`[Mobile Profile API] [${requestId}] ⚠️ WARNING: No Authorization or X-User-Authorization header found!`);
      const headerKeys = Array.from(req.headers.keys());
      console.log(`[Mobile Profile API] [${requestId}] Available header keys:`, headerKeys);
    }
    
    // Check Vercel internal headers
    const vercelHeaders = req.headers.get("x-vercel-sc-headers");
    if (vercelHeaders) {
      console.log(`[Mobile Profile API] [${requestId}] x-vercel-sc-headers present: ${!!vercelHeaders}`);
      try {
        const parsed = JSON.parse(vercelHeaders);
        console.log(`[Mobile Profile API] [${requestId}] x-vercel-sc-headers parsed:`, JSON.stringify(parsed, null, 2));
        if (parsed.Authorization || parsed.authorization) {
          console.log(`[Mobile Profile API] [${requestId}] Found Authorization in x-vercel-sc-headers`);
        }
      } catch (e) {
        console.log(`[Mobile Profile API] [${requestId}] Could not parse x-vercel-sc-headers:`, e);
      }
    }
    
    console.log(`[Mobile Profile API] [${requestId}] Connecting to database...`);
    const dbStartTime = Date.now();
    await connectDB();
    console.log(`[Mobile Profile API] [${requestId}] ✅ Database connected (${Date.now() - dbStartTime}ms)`);
    
    console.log(`[Mobile Profile API] [${requestId}] Calling getUserFromRequest...`);
    const authStartTime = Date.now();
    const authUser = await getUserFromRequest(req);
    console.log(`[Mobile Profile API] [${requestId}] getUserFromRequest completed (${Date.now() - authStartTime}ms)`);
    
    console.log(`[Mobile Profile API] [${requestId}] Auth user result:`, {
      present: !!authUser,
      id: authUser?.id,
      email: authUser?.email,
      username: authUser?.username,
    });
    
    if (!authUser || !authUser.id) {
      console.log(`[Mobile Profile API] [${requestId}] ❌ AUTH FAILED: No auth user or missing ID`);
      console.log(`[Mobile Profile API] [${requestId}] Auth user object:`, JSON.stringify(authUser, null, 2));
      return NextResponse.json(
        { error: "Invalid Mobile Session" },
        { status: 401 }
      );
    }

    console.log(`[Mobile Profile API] [${requestId}] Fetching user from database with ID: ${authUser.id}`);
    const queryStartTime = Date.now();
    const user = await User.findById(authUser.id)
      .select("-password -__v")
      .lean();
    console.log(`[Mobile Profile API] [${requestId}] User query completed (${Date.now() - queryStartTime}ms)`);
      
    if (!user) {
      console.log(`[Mobile Profile API] [${requestId}] ❌ USER NOT FOUND: No user found with ID ${authUser.id}`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log(`[Mobile Profile API] [${requestId}] ✅ User found:`, {
      id: String(user._id),
      username: user.username,
      email: user.email,
      name: user.name,
      hasAvatar: !!user.avatar,
      topBooksCount: Array.isArray(user.topBooks) ? user.topBooks.length : 0,
      favoriteBooksCount: Array.isArray(user.favoriteBooks) ? user.favoriteBooks.length : 0,
      bookshelfCount: Array.isArray(user.bookshelf) ? user.bookshelf.length : 0,
      readingListsCount: Array.isArray(user.readingLists) ? user.readingLists.length : 0,
    });

    // Build response
    const responseData = {
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        birthday: user.birthday,
        gender: user.gender,
        pronouns: Array.isArray(user.pronouns) ? user.pronouns : [],
        links: Array.isArray(user.links) ? user.links : [],
        isPublic: user.isPublic ?? true,
        
        // Books & Reading
        topBooks: Array.isArray(user.topBooks) ? user.topBooks : [],
        favoriteBooks: Array.isArray(user.favoriteBooks) ? user.favoriteBooks : [],
        bookshelf: Array.isArray(user.bookshelf) ? user.bookshelf : [],
        likedBooks: Array.isArray(user.likedBooks) ? user.likedBooks : [],
        tbrBooks: Array.isArray(user.tbrBooks) ? user.tbrBooks : [],
        currentlyReading: Array.isArray(user.currentlyReading) ? user.currentlyReading : [],
        readingLists: Array.isArray(user.readingLists) ? user.readingLists : [],
        
        // Statistics
        totalBooksRead: user.totalBooksRead ?? 0,
        totalPagesRead: user.totalPagesRead ?? 0,
        followers: Array.isArray(user.followers) ? user.followers.map((id) => String(id)) : [],
        following: Array.isArray(user.following) ? user.following.map((id) => String(id)) : [],
      },
    };

    console.log(`[Mobile Profile API] [${requestId}] Response data structure:`, {
      hasUser: !!responseData.user,
      userId: responseData.user.id,
      username: responseData.user.username,
      email: responseData.user.email,
      topBooksCount: responseData.user.topBooks.length,
      favoriteBooksCount: responseData.user.favoriteBooks.length,
      bookshelfCount: responseData.user.bookshelf.length,
      readingListsCount: responseData.user.readingLists.length,
    });

    const totalTime = Date.now() - startTime;
    console.log(`[Mobile Profile API] [${requestId}] ✅ SUCCESS: Returning profile (total time: ${totalTime}ms)`);
    console.log(`[Mobile Profile API] [${requestId}] === REQUEST END ===`);
    console.log("=".repeat(80));

    return NextResponse.json(responseData);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[Mobile Profile API] [${requestId}] ❌ ERROR (after ${totalTime}ms):`, error);
    if (error instanceof Error) {
      console.error(`[Mobile Profile API] [${requestId}] Error message:`, error.message);
      console.error(`[Mobile Profile API] [${requestId}] Error stack:`, error.stack);
    }
    console.error(`[Mobile Profile API] [${requestId}] === REQUEST END (ERROR) ===`);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      { error: "Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

