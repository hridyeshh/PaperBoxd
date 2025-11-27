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
- **Preview branches (test, dev, etc.)**: `NEXTAUTH_URL` = **Not set** (let NextAuth auto-detect)

## How It Works

With `trustHost: true` in the NextAuth configuration:
- NextAuth will automatically detect the request origin
- Preview branches will use their preview domains (e.g., `https://paperboxd-git-dev.vercel.app`)
- Production will use the production domain (`https://paperboxd.in`)

## Testing

After updating the environment variables:
1. Redeploy the preview branch
2. Sign in on the preview domain
3. Verify you stay on the preview domain after authentication

