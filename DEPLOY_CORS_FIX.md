# CORS Fix Deployment Guide

## What Was Fixed

Updated `middleware.ts` to handle CORS for Capacitor iOS app:
- ✅ Handles OPTIONS preflight requests (returns 204, not 307)
- ✅ Adds CORS headers to all API responses
- ✅ Supports `capacitor://localhost` origin
- ✅ Maintains existing authentication logic

## Critical: Deploy to Production

The CORS fix is in your **local code** but needs to be deployed to **https://paperboxd.in**.

### Step 1: Commit and Push

```bash
# Check what changed
git status

# Add the middleware file
git add middleware.ts

# Commit
git commit -m "Fix CORS for Capacitor iOS app

- Handle OPTIONS preflight requests before auth checks
- Add CORS headers for capacitor://localhost origin
- Prevent 307 redirects on API preflight requests"

# Push to main branch (or your production branch)
git push origin main
```

### Step 2: Verify Vercel Deployment

1. Go to https://vercel.com/dashboard
2. Check that the deployment started
3. Wait for it to complete (usually 1-2 minutes)
4. Verify deployment is live

### Step 3: Test CORS on Production

**Test OPTIONS (Preflight) Request:**
```bash
curl -X OPTIONS \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v \
  https://paperboxd.in/api/books/sphere
```

**Expected Response:**
```
< HTTP/2 204
< access-control-allow-origin: capacitor://localhost
< access-control-allow-credentials: true
< access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
< access-control-allow-headers: Content-Type, Authorization, Cookie, X-Requested-With
< access-control-max-age: 86400
```

**Should NOT see:**
- ❌ `HTTP/2 307` (redirect)
- ❌ `access-control-allow-origin` header missing

**Test Actual GET Request:**
```bash
curl -X GET \
  -H "Origin: capacitor://localhost" \
  -v \
  https://paperboxd.in/api/books/sphere?limit=10
```

**Expected Response:**
```
< HTTP/2 200
< access-control-allow-origin: capacitor://localhost
< access-control-allow-credentials: true
< content-type: application/json

{"books": [...]}
```

### Step 4: Test Token Auth Endpoint

```bash
# Test login endpoint CORS
curl -X OPTIONS \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v \
  https://paperboxd.in/api/auth/token/login

# Should return 204 with CORS headers
```

## If CORS Still Fails

### Option 1: Check Vercel Configuration

Create `vercel.json` in project root if not exists:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-Requested-With, Content-Type, Authorization, Cookie"
        }
      ]
    }
  ]
}
```

**Note:** Don't set `Access-Control-Allow-Origin` in `vercel.json` - let the middleware handle it dynamically.

### Option 2: Add CORS to Individual Routes

If middleware still doesn't work, add OPTIONS handler to each API route.

**Example for `app/api/books/sphere/route.ts`:**

```typescript
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  const allowedOrigins = [
    "https://paperboxd.in",
    "capacitor://localhost",
    "http://localhost:3000",
  ];

  const response = new NextResponse(null, { status: 204 });

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return response;
}
```

## Rebuild iOS App After Production Deploy

**Only after CORS is working on production:**

```bash
# Rebuild iOS app with updated code
npm run build:capacitor

# Open in Xcode
npx cap open ios

# Run on simulator or device
```

## Troubleshooting

### Still Getting 307?

**Check middleware matcher:**
```typescript
// Make sure config.matcher includes /api/*
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### CORS Headers Not Appearing?

**Check production logs:**
1. Go to Vercel dashboard
2. Click on deployment
3. Check "Functions" tab
4. Look for middleware execution logs

### Test with Browser Console

```javascript
// Test in Safari/Chrome console
fetch('https://paperboxd.in/api/books/sphere?limit=10', {
  method: 'GET',
  headers: {
    'Origin': 'capacitor://localhost'
  }
})
  .then(r => r.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));
```

## Summary

1. ✅ Code is ready (middleware updated)
2. ⏳ **Deploy to production** (git push)
3. ⏳ **Test CORS with curl** (verify 204 response)
4. ⏳ **Rebuild iOS app** (npm run build:capacitor)
5. ⏳ **Test in Xcode** (should work now!)

---

**Priority:** Deploy middleware.ts to production ASAP. The iOS app won't work until CORS is fixed on https://paperboxd.in.
