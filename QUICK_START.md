# 🚀 Quick Start: Deploy iOS App

## What's Ready
✅ Token-based authentication implemented
✅ CORS middleware configured
✅ Capacitor build system working
✅ API client auto-includes auth headers

## What You Need to Do

### Step 1: Deploy CORS Fix (5 min)
```bash
git add middleware.ts
git commit -m "Fix CORS for Capacitor iOS app"
git push origin main
```

Wait for Vercel to deploy (~2 min)

### Step 2: Test Production CORS (1 min)
```bash
./scripts/test-cors.sh https://paperboxd.in
```

**Should see:**
```
✓ Preflight request successful (HTTP 204)
✓ CORS headers present
✓ GET request successful
All CORS tests passed! ✓
```

**If you see errors**, check DEPLOY_CORS_FIX.md for troubleshooting.

### Step 3: Build iOS App (3 min)
```bash
npm run build:capacitor
npx cap open ios
```

### Step 4: Test in Xcode (5 min)
1. Click "Run" in Xcode
2. Go to /auth page
3. Sign in with your credentials
4. Test protected features

## Testing Credentials
Make sure you have a test account on https://paperboxd.in to sign in with.

## If Something Goes Wrong

### CORS Still Fails?
- Check Vercel deployment completed
- Check middleware.ts in production
- See DEPLOY_CORS_FIX.md

### App Won't Build?
```bash
npm install
npm run build:capacitor
```

### Can't Sign In?
- Check production API is running
- Check token endpoints exist
- Test with: `./scripts/test-cors.sh`

## Documentation
- **Full deployment guide:** DEPLOY_CORS_FIX.md
- **Complete status:** IOS_DEPLOYMENT_STATUS.md
- **Architecture details:** In conversation history

## Quick Test Commands

**Test CORS on production:**
```bash
./scripts/test-cors.sh https://paperboxd.in
```

**Test CORS on local:**
```bash
npm run dev
./scripts/test-cors.sh http://localhost:3000
```

**Rebuild iOS:**
```bash
npm run build:capacitor && npx cap open ios
```

---

**Total time to working iOS app:** ~15 minutes from now

**Priority:** Deploy middleware.ts to production ASAP! 🚨
