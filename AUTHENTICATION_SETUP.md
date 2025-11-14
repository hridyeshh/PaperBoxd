# Authentication Setup Guide for PaperBoxd

This guide will help you set up the complete authentication system for PaperBoxd, including email/password authentication and Google OAuth.

---

## Overview

The authentication system includes:
- **Email/Password Registration & Login** - Users can create accounts with email and password
- **Google OAuth** - Users can sign in with their Google account
- **Automatic Username Generation** - Usernames are auto-generated from email
- **Session Management** - JWT-based sessions with NextAuth.js v5
- **Protected Routes** - Middleware to protect authenticated pages
- **Auto-login after Registration** - Users are automatically signed in after registering

---

## 1. Environment Variables Setup

### Update `.env.local`

You need three additional environment variables for authentication:

```bash
# NextAuth Secret (for JWT encryption)
NEXTAUTH_SECRET=your_random_secret_here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and add it to `.env.local` as `NEXTAUTH_SECRET`.

---

## 2. Google OAuth Setup

### Step 1: Go to Google Cloud Console

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one

### Step 2: Enable Google+ API

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: External (for testing) or Internal (for organization)
   - **App name**: PaperBoxd
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **Scopes**: Add `email` and `profile`
   - **Test users** (if External): Add your test emails

4. After consent screen setup, create OAuth client ID:
   - **Application type**: Web application
   - **Name**: PaperBoxd Web Client
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/callback/google
     ```

5. Click **Create**

### Step 4: Copy Credentials

You'll see a popup with:
- **Client ID** - Copy this to `GOOGLE_CLIENT_ID` in `.env.local`
- **Client Secret** - Copy this to `GOOGLE_CLIENT_SECRET` in `.env.local`

### Production Setup

When deploying to production, add your production URL to:
- Authorized JavaScript origins: `https://your-domain.com`
- Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`

---

## 3. Testing Authentication

### Test User Registration (Email/Password)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/auth

3. Click "Create one" to go to the sign-up form

4. Fill in the form:
   - **Name**: John Doe
   - **Email**: john@example.com
   - **Password**: testpassword123
   - **Agree to terms**: ✓

5. Click "Create account"

6. You should be automatically signed in and redirected to `/profile`

### Test User Sign In (Email/Password)

1. Navigate to http://localhost:3000/auth

2. Fill in the sign-in form:
   - **Email**: john@example.com
   - **Password**: testpassword123

3. Click "Sign in"

4. You should be redirected to `/profile`

### Test Google OAuth Sign In

1. Navigate to http://localhost:3000/auth

2. Click the "Google" button

3. You'll be redirected to Google's sign-in page

4. Sign in with your Google account

5. After authorization, you'll be redirected back to `/profile`

6. A new user account is automatically created with:
   - Email from Google
   - Name from Google
   - Auto-generated username from email
   - Avatar from Google profile picture

---

## 4. How It Works

### Registration Flow

1. User fills sign-up form (name, email, password)
2. Form validates input client-side using Zod
3. Frontend calls `POST /api/users/register` with data
4. Backend:
   - Validates email isn't already registered
   - Auto-generates username from email (e.g., `john@example.com` → `johnexamplecom`)
   - Ensures username is unique (adds numbers if needed: `johnexamplecom1`, `johnexamplecom2`, etc.)
   - Hashes password with bcrypt
   - Creates user in MongoDB
5. Frontend automatically signs in the user with NextAuth
6. User is redirected to `/profile`

### Email/Password Sign In Flow

1. User fills sign-in form (email, password)
2. Form validates input client-side
3. Frontend calls NextAuth's `signIn("credentials")` function
4. NextAuth calls the Credentials provider authorize function
5. Backend:
   - Finds user by email
   - Verifies password with bcrypt
   - Updates last active timestamp
   - Returns user object
6. NextAuth creates JWT session
7. User is redirected to `/profile`

### Google OAuth Flow

1. User clicks "Google" button
2. Frontend calls NextAuth's `signIn("google")` function
3. NextAuth redirects to Google's OAuth consent page
4. User authorizes the app
5. Google redirects back to `/api/auth/callback/google`
6. NextAuth calls the Google provider's `signIn` callback
7. Backend:
   - Checks if user exists by email
   - If new user:
     - Auto-generates unique username
     - Creates user in MongoDB with Google data
   - If existing user:
     - Updates last active timestamp
8. NextAuth creates JWT session
9. User is redirected to `/profile`

### Session Management

- Sessions use JWT strategy (no database sessions needed)
- Session data includes:
  ```typescript
  {
    user: {
      id: string,
      email: string,
      name: string,
      username: string,
      image?: string
    }
  }
  ```
- Session expires after 30 days
- Can be accessed:
  - **Server-side**: `await auth()` (in Server Components, API routes)
  - **Client-side**: `useSession()` hook (in Client Components)

### Protected Routes

The `middleware.ts` file protects routes:

- **Protected Routes**: `/profile`, `/settings`
  - Redirect to `/auth` if not logged in

- **Auth Routes**: `/auth`
  - Redirect to `/profile` if already logged in

---

## 5. Using Authentication in Your App

### Get Session in Server Component

```typescript
import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    // This shouldn't happen due to middleware, but handle it
    redirect("/auth");
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <p>Email: {session.user.email}</p>
      <p>Username: @{session.user.username}</p>
    </div>
  );
}
```

### Get Session in Client Component

```typescript
"use client";

import { useSession } from "next-auth/react";
import { signOut } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <a href="/auth">Sign in</a>;
  }

  return (
    <div>
      <p>Hello, {session.user.name}!</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

### Sign Out

```typescript
import { signOut } from "@/lib/auth-client";

// In a client component
<button onClick={() => signOut()}>
  Sign out
</button>

// Or import from next-auth/react directly
import { signOut } from "next-auth/react";
<button onClick={() => signOut({ callbackUrl: "/auth" })}>
  Sign out
</button>
```

### Protect API Routes

```typescript
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Proceed with authenticated logic
  return NextResponse.json({
    message: "Hello " + session.user.name,
  });
}
```

---

## 6. Database Structure

### Users Collection

When a user registers or signs in with Google, a document is created:

```typescript
{
  _id: ObjectId,
  email: "john@example.com",
  password: "$2a$10$...", // Hashed (random for OAuth users)
  username: "johnexamplecom",
  name: "John Doe",
  avatar: "https://...", // From Google or null

  // Profile data
  bio: null,
  birthday: null,
  gender: null,
  pronouns: [],
  links: [],
  isPublic: true,

  // Book collections
  topBooks: [],
  favoriteBooks: [],
  bookshelf: [],
  likedBooks: [],
  tbrBooks: [],
  currentlyReading: [],
  readingLists: [],

  // Social
  followers: [],
  following: [],

  // Stats
  totalBooksRead: 0,
  totalPagesRead: 0,
  activities: [],
  authorsRead: [],

  // Timestamps
  createdAt: ISODate,
  updatedAt: ISODate,
  lastActive: ISODate
}
```

---

## 7. Customization

### Change Session Expiry

Edit `lib/auth.ts`:

```typescript
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60, // 7 days instead of 30
}
```

### Add More Protected Routes

Edit `middleware.ts`:

```typescript
const protectedRoutes = [
  "/profile",
  "/settings",
  "/books/add", // Add new protected route
];
```

### Customize Redirect URLs

Edit `lib/auth.ts`:

```typescript
pages: {
  signIn: "/auth",
  error: "/auth",
},
```

### Change Default Redirect After Sign In

Edit `lib/auth-client.ts`:

```typescript
export async function signInWithGoogle() {
  await nextAuthSignIn("google", {
    callbackUrl: "/dashboard", // Change from "/profile"
  });
}
```

---

## 8. Troubleshooting

### "Invalid credentials" error

**Cause**: Wrong email or password

**Solution**:
- Verify email is correct
- Ensure password is at least 8 characters
- Check if user is registered (try resetting password)

### Google OAuth not working

**Possible causes**:
1. Missing or incorrect `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
2. Redirect URI not configured in Google Console
3. Google+ API not enabled

**Solutions**:
- Double-check credentials in `.env.local`
- Verify redirect URI: `http://localhost:3000/api/auth/callback/google`
- Enable Google+ API in Cloud Console
- Ensure OAuth consent screen is configured

### "NEXTAUTH_SECRET not set" error

**Cause**: Missing `NEXTAUTH_SECRET` in environment variables

**Solution**:
```bash
openssl rand -base64 32
```
Add output to `.env.local`

### Session not persisting

**Possible causes**:
1. Missing `SessionProvider` in layout
2. Cookies blocked in browser
3. HTTPS required (in production)

**Solutions**:
- Ensure `<Providers>` wraps `{children}` in `app/layout.tsx`
- Check browser cookie settings
- Use HTTPS in production

### User redirected to auth when already logged in

**Cause**: Session not being read in middleware

**Solution**: Verify `middleware.ts` is properly configured and NextAuth is set up correctly

---

## 9. Security Best Practices

### Production Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Enable HTTPS only
- [ ] Set secure cookie options in production:
  ```typescript
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  }
  ```
- [ ] Limit OAuth consent screen to specific email domains (if internal app)
- [ ] Add rate limiting to auth endpoints
- [ ] Enable CSRF protection (enabled by default in NextAuth)
- [ ] Regularly rotate Google OAuth credentials
- [ ] Monitor failed login attempts
- [ ] Implement password reset flow (TODO)
- [ ] Add email verification (TODO)

### Password Security

- Passwords are hashed with bcrypt (10 rounds)
- Minimum 8 characters enforced
- Passwords never stored in plain text
- OAuth users get random passwords (can't use password login)

---

## 10. Next Steps

### Recommended Enhancements

1. **Email Verification**
   - Send verification email on registration
   - Verify email before allowing full access

2. **Password Reset**
   - Implement forgot password flow
   - Send password reset emails
   - Token-based password reset

3. **Two-Factor Authentication (2FA)**
   - Add TOTP-based 2FA
   - SMS-based 2FA option

4. **More OAuth Providers**
   - Add GitHub, Twitter, Apple sign-in
   - Easy to add more providers to NextAuth config

5. **Account Linking**
   - Allow users to link multiple OAuth accounts
   - Merge accounts with same email

6. **Session Activity Log**
   - Track login history
   - Show active sessions
   - Ability to revoke sessions

---

## Support & Resources

- **NextAuth.js Documentation**: https://next-auth.js.org/
- **Google OAuth Documentation**: https://developers.google.com/identity/protocols/oauth2
- **MongoDB User Management**: https://docs.mongodb.com/manual/tutorial/manage-users-and-roles/

---

**Happy Authenticating! 🔐**
