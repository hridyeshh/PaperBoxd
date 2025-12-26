import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export type AuthUser = {
  id: string;
  email: string;
  username?: string;
  name?: string;
  image?: string;
};

/**
 * Extract user information from Bearer token (for mobile apps)
 * Falls back to NextAuth session (for web apps)
 * 
 * @param req NextRequest object
 * @returns AuthUser or null if not authenticated
 */
export async function getUserFromRequest(
  req: NextRequest
): Promise<AuthUser | null> {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[auth-token] [${requestId}] === getUserFromRequest START ===`);
  console.log(`[auth-token] [${requestId}] Path: ${req.nextUrl.pathname}`);
  
  // Try token-based auth first (for mobile apps)
  let authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  console.log(`[auth-token] [${requestId}] Authorization header present: ${!!authHeader}`);
  
  if (authHeader) {
    console.log(`[auth-token] [${requestId}] Authorization header length: ${authHeader.length}`);
    console.log(`[auth-token] [${requestId}] Authorization header (first 50 chars): ${authHeader.substring(0, 50)}...`);
    console.log(`[auth-token] [${requestId}] Authorization starts with 'Bearer': ${authHeader.startsWith("Bearer ")}`);
  } else {
    console.log(`[auth-token] [${requestId}] ⚠️ No Authorization header found in standard headers`);
    const headerKeys = Array.from(req.headers.keys());
    console.log(`[auth-token] [${requestId}] Available header keys:`, headerKeys);
    
    // Check Vercel internal headers
    const vercelHeaders = req.headers.get("x-vercel-sc-headers");
    if (vercelHeaders) {
      console.log(`[auth-token] [${requestId}] x-vercel-sc-headers present, attempting to parse...`);
      try {
        const parsed = JSON.parse(vercelHeaders);
        console.log(`[auth-token] [${requestId}] x-vercel-sc-headers parsed:`, JSON.stringify(parsed, null, 2));
        if (parsed.Authorization || parsed.authorization) {
          authHeader = parsed.Authorization || parsed.authorization;
          if (authHeader) {
            console.log(`[auth-token] [${requestId}] ✅ Found Authorization in x-vercel-sc-headers (first 50 chars): ${authHeader.substring(0, 50)}...`);
          }
        }
      } catch (e) {
        console.log(`[auth-token] [${requestId}] Could not parse x-vercel-sc-headers:`, e);
      }
    }
  }
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    console.log(`[auth-token] [${requestId}] Extracted token (length: ${token.length}, first 20 chars: ${token.substring(0, 20)}...)`);

    if (token) {
      try {
        const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
        if (!secret) {
          console.error(`[auth-token] [${requestId}] NEXTAUTH_SECRET or AUTH_SECRET is not configured`);
          return null;
        }

        console.log(`[auth-token] [${requestId}] Verifying JWT token...`);
        const decoded = jwt.verify(token, secret) as {
          userId: string;
          email: string;
          username?: string;
        };
        console.log(`[auth-token] [${requestId}] ✅ Token verified successfully:`, {
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username,
        });

        console.log(`[auth-token] [${requestId}] Connecting to database...`);
        await connectDB();
        console.log(`[auth-token] [${requestId}] Fetching user from database with userId: ${decoded.userId}...`);
        const user = await User.findById(decoded.userId);

        if (user) {
          console.log(`[auth-token] [${requestId}] ✅ User found:`, {
            id: String(user._id),
            email: user.email,
            username: user.username,
            name: user.name,
          });
          console.log(`[auth-token] [${requestId}] === getUserFromRequest END (SUCCESS) ===`);
          return {
            id: String(user._id),
            email: user.email,
            username: user.username,
            name: user.name,
            image: user.avatar,
          };
        } else {
          console.log(`[auth-token] [${requestId}] ❌ User not found for userId: ${decoded.userId}`);
        }
      } catch (error) {
        console.error(`[auth-token] [${requestId}] Token verification failed:`, error);
        if (error instanceof Error) {
          console.error(`[auth-token] [${requestId}] Error message:`, error.message);
          console.error(`[auth-token] [${requestId}] Error name:`, error.name);
          if (error.name === "JsonWebTokenError") {
            console.error(`[auth-token] [${requestId}] JWT Error - Token is invalid or malformed`);
          } else if (error.name === "TokenExpiredError") {
            console.error(`[auth-token] [${requestId}] JWT Error - Token has expired`);
          }
        }
        // Fall through to try session auth
      }
    } else {
      console.log(`[auth-token] [${requestId}] Token is empty after extraction`);
    }
  } else {
    console.log(`[auth-token] [${requestId}] Authorization header does not start with 'Bearer'`);
  }

  // Fall back to session-based auth (for web)
  console.log(`[auth-token] [${requestId}] Falling back to session-based auth...`);
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (session?.user) {
      console.log(`[auth-token] [${requestId}] ✅ Session auth successful:`, {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
      });
      console.log(`[auth-token] [${requestId}] === getUserFromRequest END (SUCCESS - SESSION) ===`);
      return {
        id: session.user.id,
        email: session.user.email || "",
        username: session.user.username,
        name: session.user.name || undefined,
        image: session.user.image || undefined,
      };
    } else {
      console.log(`[auth-token] [${requestId}] No session found`);
    }
  } catch (error) {
    console.error(`[auth-token] [${requestId}] Session auth failed:`, error);
  }

  console.log(`[auth-token] [${requestId}] ❌ No authentication method succeeded`);
  console.log(`[auth-token] [${requestId}] === getUserFromRequest END (FAILED) ===`);
  return null;
}

