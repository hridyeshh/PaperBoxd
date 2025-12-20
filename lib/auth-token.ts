import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import { auth } from "@/lib/auth";

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  image?: string;
}

/**
 * Extract user from either token-based auth (Capacitor) or session-based auth (web)
 * This allows API routes to work with both authentication methods
 */
export async function getUserFromRequest(
  req: NextRequest
): Promise<AuthUser | null> {
  // Try token-based auth first (for Capacitor/mobile apps)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

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
      console.error("[Token Auth] Failed:", error);
      // Fall through to try session auth
    }
  }

  // Fall back to session-based auth (for web)
  try {
    const session = await auth();
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        name: session.user.name,
        image: session.user.image,
      };
    }
  } catch (error) {
    console.error("[Session Auth] Failed:", error);
  }

  return null;
}
