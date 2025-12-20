# iOS Capacitor App - Deployment Status

## ✅ Completed Implementation

### 1. Token-Based Authentication
- ✅ `/api/auth/token/login` - JWT token login endpoint
- ✅ `/api/auth/token/verify` - Token verification endpoint
- ✅ `lib/auth-token.ts` - Dual auth helper (supports tokens + sessions)
- ✅ Token storage in Capacitor Preferences (iOS Keychain)
- ✅ Auto-verification on app load
- ✅ 30-day token expiration

### 2. API Client Updates
- ✅ Auto-includes `Authorization: Bearer <token>` header for Capacitor
- ✅ Uses cookies for web, tokens for iOS
- ✅ Unified `apiClient()` function

### 3. Authentication Flow
- ✅ `hooks/useAuth.ts` - Unified auth hook for web + iOS
- ✅ `lib/auth-client.ts` - Platform-aware sign in
- ✅ Session persistence across app restarts
- ✅ Automatic token refresh on app launch

### 4. CORS Configuration (NEW)
- ✅ Updated `middleware.ts` with CORS handling
- ✅ Handles OPTIONS preflight requests (returns 204)
- ✅ Adds CORS headers for `capacitor://localhost` origin
- ✅ Prevents 307 redirects on API requests
- ✅ Maintains existing auth logic for web

### 5. Capacitor Build System
- ✅ Static export configured (`output: "export"`)
- ✅ API routes excluded from iOS bundle
- ✅ Middleware replaced for static export
- ✅ Dynamic routes work with client-side rendering
- ✅ Build script: `npm run build:capacitor`

## ⚠️ CRITICAL: Deploy to Production

The CORS fix is **ready locally** but must be deployed to **https://paperboxd.in**.

### Deployment Steps

```bash
# 1. Commit changes
git add middleware.ts
git commit -m "Fix CORS for Capacitor iOS app"

# 2. Push to production
git push origin main

# 3. Wait for Vercel deployment (1-2 minutes)

# 4. Test CORS on production
./scripts/test-cors.sh https://paperboxd.in

# 5. If CORS tests pass, rebuild iOS app
npm run build:capacitor
npx cap open ios
```

## 🧪 Testing Checklist

### Before Deploying
- [x] Local build succeeds
- [x] CORS middleware compiles
- [x] Token auth endpoints exist
- [x] Test script created

### After Deploying to Production
- [ ] Run `./scripts/test-cors.sh https://paperboxd.in`
- [ ] Verify OPTIONS returns 204 (not 307)
- [ ] Verify CORS headers present
- [ ] Test token login endpoint
- [ ] Test token verify endpoint

### In iOS App
- [ ] App loads without errors
- [ ] Login page appears
- [ ] User can sign in
- [ ] Token stored in device
- [ ] API calls include token
- [ ] Protected features work
- [ ] Logout clears token
- [ ] Token persists after app restart

## 📁 Files Modified/Created

### Backend (Production Deployment Needed)
- `middleware.ts` - **MUST DEPLOY** (CORS fix)
- `app/api/auth/token/login/route.ts` - Token login
- `app/api/auth/token/verify/route.ts` - Token verification
- `lib/auth-token.ts` - Dual auth helper

### Frontend (Already in Capacitor Build)
- `lib/api/client.ts` - Auto-includes auth header
- `lib/auth-client.ts` - Platform-aware auth
- `hooks/useAuth.ts` - Unified auth hook
- `lib/capacitor/auth-storage.ts` - Token storage
- `components/providers.tsx` - Session provider config

### Configuration
- `next.config.ts` - Capacitor build config
- `middleware.capacitor.ts` - No-op middleware for static export
- `package.json` - Added `build:capacitor` script

### Testing/Documentation
- `scripts/test-cors.sh` - CORS testing script
- `DEPLOY_CORS_FIX.md` - Deployment guide
- `IOS_DEPLOYMENT_STATUS.md` - This file

## 🚨 Current Issues & Fixes

### Issue 1: CORS 307 Redirect (CRITICAL - NOT YET DEPLOYED)
**Problem:** Production API redirects before setting CORS headers
**Status:** ⏳ **Fix ready, awaiting deployment**
**Action Required:** Deploy `middleware.ts` to production

### Issue 2: Font Files 404 (Minor)
**Problem:** Custom fonts not included in static export
**Status:** ⏳ Can be ignored (app uses fallback fonts)
**Action:** Optional - Remove custom fonts or use web fonts

### Issue 3: NextAuth Pattern Error (Minor)
**Problem:** NextAuth trying to run in Capacitor
**Status:** ✅ Fixed (SessionProvider configured with baseUrl)
**Action:** None (already handled by providers.tsx update)

## 🎯 Next Immediate Steps

### 1. Deploy CORS Fix (5 minutes)
```bash
git status
git add middleware.ts
git commit -m "Fix CORS for Capacitor iOS app"
git push origin main
# Wait for Vercel deployment
```

### 2. Test Production CORS (2 minutes)
```bash
./scripts/test-cors.sh https://paperboxd.in
```

**Expected output:**
```
✓ Preflight request successful (HTTP 204)
✓ CORS header 'Access-Control-Allow-Origin' present
✓ CORS header 'Access-Control-Allow-Credentials' present
✓ GET request successful (HTTP 200)
✓ Response contains data
✓ Login endpoint preflight successful (HTTP 204)

All CORS tests passed! ✓
```

### 3. Rebuild iOS App (3 minutes)
```bash
npm run build:capacitor
npx cap open ios
```

### 4. Test in Xcode (10 minutes)
- Run app in simulator
- Try to sign in with credentials
- Verify API calls work
- Test protected features

## 📊 Build Statistics

**Latest Capacitor Build:**
- 32 static pages generated
- API routes: 5 (login, verify, books/search, image-proxy, og/share)
- Bundle size: ~430 KB (first load)
- Middleware size: 33.9 KB
- Build time: ~3 seconds

## 🔐 Security Notes

**Token Security:**
- JWT signed with `NEXTAUTH_SECRET`
- 30-day expiration
- Stored in iOS Keychain (via Capacitor Preferences)
- Transmitted via Authorization header (not cookies)

**CORS Security:**
- Allowed origins: `capacitor://localhost`, `https://paperboxd.in`
- Credentials required for all requests
- Preflight requests cached for 24 hours

## 🆘 Troubleshooting

### If CORS test fails:
1. Check Vercel deployment completed
2. Check middleware.ts was deployed
3. Check Vercel logs for errors
4. Try adding `vercel.json` (see DEPLOY_CORS_FIX.md)

### If login doesn't work:
1. Check token is being stored (Capacitor Preferences)
2. Check Authorization header in network requests
3. Check production API logs
4. Verify NEXTAUTH_SECRET is set in production

### If API calls fail:
1. Check CORS headers in network tab
2. Verify token is included in requests
3. Test endpoints with curl
4. Check production logs

## 📝 Additional Notes

**Architecture:**
- **Web:** Cookie-based auth (NextAuth) - unchanged
- **iOS:** Token-based auth (JWT) - new implementation
- **API Routes:** Support both auth methods seamlessly

**Why two auth systems?**
- Capacitor apps can't use cookies across origins
- Web apps work better with cookies (CSRF protection)
- Dual system provides best UX for each platform

**Production API:**
- All API routes must support both auth methods
- Use `getUserFromRequest()` helper in protected routes
- Returns user from either token or session

---

**Current Status:** ⚠️ **Waiting for production deployment of CORS fix**

**ETA to working iOS app:** 10-15 minutes after deploying middleware.ts

**Last Updated:** 2025-12-19
