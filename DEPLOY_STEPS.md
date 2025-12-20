# Quick Deployment Steps for CORS Fix

## Current Status
- ✅ You're on `ios` branch
- ✅ `middleware.ts` has CORS fix
- ⏳ Need to deploy to `main` branch for production

## Option 1: Merge iOS Branch to Main (Recommended if all changes are ready)

```bash
# 1. Commit all your changes on ios branch
git add middleware.ts components/providers.tsx lib/auth-token.ts app/_api/
git commit -m "Fix CORS and token auth for iOS Capacitor app

- Add CORS handling for capacitor://localhost origin
- Handle OPTIONS preflight requests (returns 204)
- Update all API routes to support token authentication
- Configure SessionProvider for Capacitor builds"

# 2. Switch to main branch
git checkout main

# 3. Merge ios branch into main
git merge ios

# 4. Push to main (this triggers Vercel deployment)
git push origin main
```

## Option 2: Cherry-pick Only Critical Files (If you want to deploy just the CORS fix)

```bash
# 1. Commit changes on ios branch first
git add middleware.ts
git commit -m "Fix CORS for Capacitor iOS app"

# 2. Switch to main
git checkout main

# 3. Cherry-pick just the middleware commit
git cherry-pick <commit-hash>  # Replace with actual commit hash

# 4. Push to main
git push origin main
```

## Option 3: Copy Files Manually (Simplest for just middleware.ts)

```bash
# 1. Make sure middleware.ts is committed on ios branch
git add middleware.ts
git commit -m "Fix CORS for Capacitor iOS app"

# 2. Switch to main
git checkout main

# 3. Copy middleware.ts from ios branch
git checkout ios -- middleware.ts

# 4. Commit and push
git add middleware.ts
git commit -m "Fix CORS for Capacitor iOS app - handle preflight requests"
git push origin main
```

## After Pushing to Main

### 1. Check Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your `paperboxd` project
3. Watch for the new deployment (should start automatically)
4. Wait 1-2 minutes for deployment to complete

### 2. Test CORS on Production

Run this command to verify CORS is working:

```bash
curl -X OPTIONS \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v \
  https://paperboxd.in/api/books/sphere
```

**Expected:** HTTP 204 with CORS headers
**Bad:** HTTP 307 (redirect) or missing CORS headers

### 3. If CORS Test Passes

Rebuild your iOS app:

```bash
# Rebuild with latest code
npm run build:capacitor

# Open in Xcode
npx cap open ios

# Test on simulator or device
```

## Troubleshooting

### If Vercel doesn't auto-deploy:
- Check Vercel project settings → Git → Production Branch (should be `main`)
- Manually trigger deployment from Vercel dashboard

### If CORS still fails after deployment:
- Check Vercel function logs for middleware errors
- Verify middleware.ts was actually deployed (check file in Vercel)
- Wait a few minutes for CDN cache to clear

### Quick CORS Test Script
Use the provided test script:
```bash
./scripts/test-cors.sh https://paperboxd.in
```

