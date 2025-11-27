# Vercel Branch Deployment Configuration

## Issue: Redirects to Production Domain After Sign-In

If you're experiencing redirects to `paperboxd.in` after signing in on a preview branch (like `test`), it's likely because `NEXTAUTH_URL` is set to `paperboxd.in` in your Vercel environment variables.

## Solution

### For Preview Branches (test, dev, etc.)

**Do NOT set `NEXTAUTH_URL` for preview branches.** NextAuth will automatically use the preview domain when `trustHost: true` is set (which it is in our configuration).

### For Production Branch (main)

You can optionally set `NEXTAUTH_URL` to `https://paperboxd.in` for the production branch only, but it's not required since `trustHost: true` will handle it automatically.

## How to Configure in Vercel

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Check if `NEXTAUTH_URL` is set
4. If it's set globally (for all branches):
   - **Remove it** or
   - **Change it** to only apply to the `production` environment (main branch)
5. For preview branches, leave `NEXTAUTH_URL` unset

## Environment Variable Configuration

### Recommended Setup:

- **Production (main branch)**: `NEXTAUTH_URL` = `https://paperboxd.in` (optional)
- **Preview branches (test, dev, etc.)**: 
  - **Option 1 (Recommended)**: `NEXTAUTH_URL` = **Not set** (let NextAuth auto-detect)
  - **Option 2**: `NEXTAUTH_URL` = `https://paperboxd-git-dev.vercel.app` (must include `https://`)

### Important Notes:

- If you set `NEXTAUTH_URL` for preview branches, **it MUST include the protocol** (`https://`)
- Example: `https://paperboxd-git-dev.vercel.app` ✅
- Example: `paperboxd-git-dev.vercel.app` ❌ (will cause errors)
- The code will auto-fix missing protocols, but it's better to set it correctly in Vercel

## How It Works

With `trustHost: true` in the NextAuth configuration:
- NextAuth will automatically detect the request origin
- Preview branches will use their preview domains (e.g., `https://paperboxd-git-dev.vercel.app`)
- Production will use the production domain (`https://paperboxd.in`)

## Google OAuth Configuration for Preview Branches

### Issue: `redirect_uri_mismatch` Error

If you get a `redirect_uri_mismatch` error when signing in with Google on a preview branch, you need to add the preview domain's callback URL to Google Cloud Console.

### Solution: Add Preview Domain to Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (the one used for PaperBoxd)
4. Click **Edit** (pencil icon)
5. Under **Authorized redirect URIs**, add:
   ```
   https://paperboxd-git-dev.vercel.app/api/auth/callback/google
   ```
6. If you have other preview branches, add their callback URLs too:
   ```
   https://paperboxd-git-<branch-name>.vercel.app/api/auth/callback/google
   ```
7. Click **Save**

### Current Authorized Redirect URIs Should Include:

- **Production**: `https://paperboxd.in/api/auth/callback/google`
- **Preview (test branch)**: `https://paperboxd-git-dev.vercel.app/api/auth/callback/google`
- **Local development**: `http://localhost:3000/api/auth/callback/google`

### Note on Vercel Preview URLs

Vercel preview branches use the pattern: `https://<project-name>-git-<branch-name>.vercel.app`

For example:
- Branch `test` → `https://paperboxd-git-test.vercel.app`
- Branch `dev` → `https://paperboxd-git-dev.vercel.app`

You can either:
1. **Add each preview branch individually** as you create them
2. **Use a wildcard** (if Google supports it, though they typically don't)
3. **Add common preview branches** you use frequently

## Testing

After updating the environment variables and Google OAuth settings:
1. Redeploy the preview branch
2. Sign in on the preview domain
3. Verify you stay on the preview domain after authentication
4. Test Google OAuth sign-in to ensure it works without `redirect_uri_mismatch` errors

