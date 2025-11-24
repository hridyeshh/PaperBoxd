import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is required. Generate one with: openssl rand -base64 32");
}

if (!process.env.MONGODB_URI) {
  console.warn(
    "⚠️  MONGODB_URI is not set. Credentials authentication will not work without it."
  );
}

// Set NEXTAUTH_URL for development if not set
if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "development") {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}

// Warn if NEXTAUTH_URL is not set in production
if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "⚠️  NEXTAUTH_URL is not set in production. Please set it in your Vercel environment variables to: https://paperboxd.vercel.app"
  );
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      username: string;
      image?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    username?: string;
    image?: string;
  }

  interface JWT {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    picture?: string;
  }
}

// Build providers array conditionally
const providers: Provider[] = [
  CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null; // Return null instead of throwing for NextAuth to handle
          }

          await connectDB();

          // Find user by email
          const user = await User.findOne({
            email: (credentials.email as string).toLowerCase(),
          });

          if (!user) {
            return null; // Return null for invalid credentials
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            return null; // Return null for invalid password
          }

          // Update last active
          user.lastActive = new Date();
          await user.save();

          // Return user object
          // Don't include avatar image in JWT - it can be too large (base64 images)
          // Avatar will be fetched from database when needed
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            username: user.username,
            // Only include avatar if it's a URL (not base64) and small
            image: user.avatar && !user.avatar.startsWith("data:") 
              ? user.avatar 
              : undefined,
          };
        } catch (error) {
          console.error("[Auth] Authorize error:", error);
          // Return null on any error - NextAuth will return CredentialsSignin error
          return null;
        }
      },
    }),
];

// Add Google provider only if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  );
} else {
  console.warn(
    "⚠️  Google OAuth credentials not provided. Google sign-in will be disabled."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Trust the host header from the proxy (Vercel)
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();

        // Check if user exists
        let existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          // Create new user from Google profile (without username - user will set it after sign-up)
          existingUser = await User.create({
            email: user.email,
            password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for OAuth users
            // username will be set later by user
            name: user.name || user.email?.split("@")[0] || "User",
            // Don't use Google profile image - user can set their own avatar later
            avatar: undefined,
            pronouns: [],
            isPublic: true,
            topBooks: [],
            favoriteBooks: [],
            bookshelf: [],
            likedBooks: [],
            tbrBooks: [],
            currentlyReading: [],
            readingLists: [],
            activities: [],
            authorsRead: [],
            followers: [],
            following: [],
            totalBooksRead: 0,
            totalPagesRead: 0,
          });
        }

        // Update user info
        user.id = existingUser.id.toString();
        user.username = existingUser.username;

        // Update last active
        existingUser.lastActive = new Date();
        await existingUser.save();
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username; // Can be undefined for new users
        token.email = user.email;
        token.name = user.name;
        // Don't store Google profile images - user avatars are stored in database only
        token.picture = undefined;
      } else if (token && token.email) {
        // On subsequent requests, fetch latest user data from database to get updated username
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email }).select("username name avatar");
          if (dbUser) {
            token.username = dbUser.username; // Update username if it was set
            token.name = dbUser.name;
            // Only store avatar if it's a data URI (user-uploaded) and not too large
            // Don't store Google image URLs
            if (dbUser.avatar && 
                dbUser.avatar.startsWith("data:") && 
                dbUser.avatar.length < 50000) { // Allow data URIs up to 50KB
              token.picture = dbUser.avatar;
            } else {
              token.picture = undefined;
            }
          }
        } catch (error) {
          console.error("Error fetching user in JWT callback:", error);
          // Continue with existing token data if fetch fails
        }
        
        // On subsequent requests, ensure we're not storing Google image URLs
        if (token.picture && typeof token.picture === "string" && !token.picture.startsWith("data:")) {
          token.picture = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.email = token.email!;
        session.user.name = token.name!;
        // Only include image if it's a URL, not base64
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});
