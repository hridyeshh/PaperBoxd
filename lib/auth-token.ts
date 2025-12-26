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
  // Check ALL possible header locations where Authorization might be
  // Vercel sometimes strips/replaces the Authorization header, so we check multiple locations:
  // 1. Standard Authorization header
  // 2. Custom X-User-Authorization header (fallback if Vercel strips Authorization)
  // 3. x-vercel-sc-headers (Vercel internal headers)
  let authHeader = req.headers.get("authorization") || 
                   req.headers.get("Authorization") ||
                   req.headers.get("x-user-authorization") ||
                   req.headers.get("X-User-Authorization");
  console.log(`[auth-token] [${requestId}] Authorization header (standard or custom) present: ${!!authHeader}`);
  
  if (authHeader) {
    console.log(`[auth-token] [${requestId}] Authorization header length: ${authHeader.length}`);
    console.log(`[auth-token] [${requestId}] Authorization header (first 50 chars): ${authHeader.substring(0, 50)}...`);
    console.log(`[auth-token] [${requestId}] Authorization starts with 'Bearer': ${authHeader.startsWith("Bearer ")}`);
    
    // Check if this is a Vercel internal token (should have "iss":"serverless" in payload)
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      try {
        // Decode JWT without verification to check issuer
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          if (payload.iss === "serverless") {
            console.log(`[auth-token] [${requestId}] ⚠️ WARNING: Authorization header contains Vercel internal token, not user token!`);
            console.log(`[auth-token] [${requestId}] This means the user's Authorization header was stripped/replaced by Vercel`);
            authHeader = null; // Reset to null so we can check other locations
          } else {
            console.log(`[auth-token] [${requestId}] ✅ Authorization header contains user token (iss: ${payload.iss || "unknown"})`);
          }
        }
      } catch (e) {
        // Not a JWT or can't decode, continue with this header
        console.log(`[auth-token] [${requestId}] Could not decode token to check issuer:`, e);
      }
    }
  }
  
  if (!authHeader) {
    console.log(`[auth-token] [${requestId}] ⚠️ No valid Authorization header found in standard headers`);
    const headerKeys = Array.from(req.headers.keys());
    console.log(`[auth-token] [${requestId}] Available header keys:`, headerKeys);
    
    // Check forwarded header for signature (Vercel might encode Authorization here)
    const forwarded = req.headers.get("forwarded");
    if (forwarded) {
      console.log(`[auth-token] [${requestId}] Forwarded header present: ${forwarded.substring(0, 200)}...`);
      // The forwarded header might contain encoded Authorization in the sig parameter
      // But this is complex to decode, so we'll focus on other locations first
    }
    
    // Check Vercel internal headers
    const vercelHeaders = req.headers.get("x-vercel-sc-headers");
    if (vercelHeaders) {
      console.log(`[auth-token] [${requestId}] x-vercel-sc-headers present, attempting to parse...`);
      try {
        const parsed = JSON.parse(vercelHeaders);
        console.log(`[auth-token] [${requestId}] x-vercel-sc-headers parsed:`, JSON.stringify(parsed, null, 2));
        if (parsed.Authorization || parsed.authorization) {
          const vercelAuth = parsed.Authorization || parsed.authorization;
          if (vercelAuth) {
            console.log(`[auth-token] [${requestId}] Found Authorization in x-vercel-sc-headers (first 50 chars): ${vercelAuth.substring(0, 50)}...`);
            
            // Check if this is a Vercel internal token
            if (vercelAuth.startsWith("Bearer ")) {
              const token = vercelAuth.replace("Bearer ", "").trim();
              try {
                const parts = token.split(".");
                if (parts.length === 3) {
                  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
                  if (payload.iss === "serverless") {
                    console.log(`[auth-token] [${requestId}] ⚠️ WARNING: x-vercel-sc-headers Authorization is Vercel internal token, not user token!`);
                    console.log(`[auth-token] [${requestId}] The user's Authorization header is NOT being forwarded by Vercel`);
                  } else {
                    console.log(`[auth-token] [${requestId}] ✅ x-vercel-sc-headers Authorization is user token (iss: ${payload.iss || "unknown"})`);
                    authHeader = vercelAuth; // Use this as the auth header
                  }
                }
              } catch {
                // Can't decode, but use it anyway
                console.log(`[auth-token] [${requestId}] Could not decode token from x-vercel-sc-headers, using it anyway`);
                authHeader = vercelAuth;
              }
            } else {
              authHeader = vercelAuth;
            }
          }
        } else {
          console.log(`[auth-token] [${requestId}] No Authorization field in x-vercel-sc-headers`);
        }
      } catch (e) {
        console.log(`[auth-token] [${requestId}] Could not parse x-vercel-sc-headers:`, e);
      }
    } else {
      console.log(`[auth-token] [${requestId}] x-vercel-sc-headers not present`);
    }
    
    // Final check: if still no authHeader, the user's token was not forwarded
    if (!authHeader) {
      console.log(`[auth-token] [${requestId}] ❌ CRITICAL: User's Authorization header was NOT forwarded by Vercel`);
      console.log(`[auth-token] [${requestId}] This is likely a Vercel proxy configuration issue`);
      console.log(`[auth-token] [${requestId}] The iOS app is sending the header, but Vercel is not forwarding it`);
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

