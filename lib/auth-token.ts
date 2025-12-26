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
  // Try token-based auth first (for mobile apps)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();

    if (token) {
      try {
        const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
        if (!secret) {
          console.error("NEXTAUTH_SECRET or AUTH_SECRET is not configured");
          return null;
        }

        const decoded = jwt.verify(token, secret) as {
          userId: string;
          email: string;
          username?: string;
        };

        await connectDB();
        const user = await User.findById(decoded.userId);

        if (user) {
          return {
            id: String(user._id),
            email: user.email,
            username: user.username,
            name: user.name,
            image: user.avatar,
          };
        }
      } catch (error) {
        console.error("Token verification failed:", error);
        // Fall through to try session auth
      }
    }
  }

  // Fall back to session-based auth (for web)
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || "",
        username: session.user.username,
        name: session.user.name || undefined,
        image: session.user.image || undefined,
      };
    }
  } catch (error) {
    console.error("Session auth failed:", error);
  }

  return null;
}

