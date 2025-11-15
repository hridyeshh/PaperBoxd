import NextAuth, { User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
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
    username: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
  }
}

// Build providers array conditionally
const providers = [
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
            id: user._id.toString(),
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
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        await connectDB();

        // Check if user exists
        let existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          // Create new user from Google profile
          const username = user.email?.split("@")[0] || `user${Date.now()}`;

          // Ensure username is unique
          let finalUsername = username;
          let counter = 1;
          while (await User.findOne({ username: finalUsername })) {
            finalUsername = `${username}${counter}`;
            counter++;
          }

          existingUser = await User.create({
            email: user.email,
            password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for OAuth users
            username: finalUsername,
            name: user.name || finalUsername,
            avatar: user.image,
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
        user.id = existingUser._id.toString();
        user.username = existingUser.username;

        // Update last active
        existingUser.lastActive = new Date();
        await existingUser.save();
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.name = user.name;
        // Never store base64 images in JWT - they're too large for cookies
        // Only store image if it's a URL (not base64) and not too long
        if (user.image && 
            !user.image.startsWith("data:") && 
            user.image.length < 500) { // Limit URL length too
          token.picture = user.image;
        } else {
          // Explicitly remove picture to prevent cookie size issues
          token.picture = undefined;
        }
      } else if (token) {
        // On subsequent requests, ensure picture is still not a base64 string
        if (token.picture && typeof token.picture === "string" && token.picture.startsWith("data:")) {
          token.picture = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
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
