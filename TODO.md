# TODO - PaperBoxd Frontend Integration

**Last Updated:** May 1, 2026  
**Current Phase:** 5B -> 5C (Auth Bug Blocking Progress)

---

## URGENT - Critical Blocker

### Auth Flow Bug (MUST FIX FIRST)

**Problem:** Login creates new user "hridyesh2309" instead of authenticating existing user "hridyesh"

**Status:** BLOCKING

**Tasks:**
- [ ] Run database query to find all "hridyesh" users
- [ ] Test backend `/api/v1/auth/login` directly with curl
- [ ] Test backend `/api/v1/auth/register` directly with curl
- [ ] Examine Go backend `internal/handler/auth.go` login handler
- [ ] Examine Go backend `internal/handler/auth.go` register handler
- [ ] Check frontend `components/ui/auth/auth-form-1.tsx` login submission
- [ ] Check frontend `lib/auth/actions.ts` for fallback logic
- [ ] Search for username generation logic (grep for "2309", email.split, etc.)
- [ ] Identify root cause (frontend calling wrong action? backend auto-creating?)
- [ ] Implement fix based on root cause
- [ ] Delete test user "hridyesh2309" from database
- [ ] Test login flow end-to-end
- [ ] Verify no new users created on login
- [ ] Document fix in CHANGELOG.md

**References:**
- Database: `postgresql://postgres:...@mainline.proxy.rlwy.net:46739/railway`
- Backend: `https://paperboxd-backend-production-d9e0.up.railway.app`
- Code: `internal/handler/auth.go`, `lib/auth/actions.ts`, `components/ui/auth/auth-form-1.tsx`

---

## Phase 5B: Authentication UI COMPLETE

- [x] Created `components/providers/auth-provider.tsx`
- [x] Updated `app/layout.tsx` with AuthProvider
- [x] Created `middleware.ts` for route protection
- [x] Updated auth forms (login/register) to use JWT actions
- [x] Migrated 25 files from useSession() -> useAuth()
- [x] Updated all logout buttons to use logoutAction()
- [x] Build compiles with 0 TypeScript errors

---

## Phase 5C: Update API Endpoints (IN PROGRESS - BLOCKED)

**Status:** PAUSED (waiting for auth fix)

### Setup Tasks
- [ ] Create `lib/api/endpoints.ts` with unified API helpers
- [ ] Create `API_MIGRATION_CHECKLIST.md`
- [ ] Audit all fetch calls (find app/api routes)

### User Endpoints
- [ ] Update user profile page (`app/u/[username]/page.tsx`)
- [ ] Update bookshelf component (CRITICAL: handle flat response structure)
- [ ] Update TBR component
- [ ] Update currently reading component
- [ ] Update lists page
- [ ] Update list detail page
- [ ] Update diary page
- [ ] Update followers/following components
- [ ] Update follow/unfollow functionality
- [ ] Update user search

### Book Endpoints
- [ ] Update book search
- [ ] Update book detail page
- [ ] Update public carousels (homepage)
- [ ] Update personalized carousels (authenticated home)

### Activity Endpoints
- [ ] Update activity feed page
- [ ] Update check-new-activities functionality

### Recommendation Endpoints
- [ ] Update home page recommendations
- [ ] Update recommendations page

### Response Format Changes
- [ ] Fix all `.book.volumeInfo` -> `.volumeInfo` (bookshelf flat structure)
- [ ] Fix all `.book.slug` -> `.slug`
- [ ] Verify books in lists use flat structure
- [ ] Test all updated components

### Client-Side Actions
- [ ] Update add to bookshelf button/form
- [ ] Update create list form
- [ ] Update add book to list
- [ ] Update create diary entry form
- [ ] Update all authenticated forms

---

## Phase 5D: Testing & Cleanup (NOT STARTED)

**Status:** PENDING

### Endpoint Testing
- [ ] Test user profile loads
- [ ] Test bookshelf (read/reading/TBR tabs)
- [ ] Test lists (view, create, add books)
- [ ] Test diary (view, create, edit)
- [ ] Test search (books and users)
- [ ] Test activity feed
- [ ] Test home page carousels
- [ ] Test recommendations page
- [ ] Test follow/unfollow
- [ ] Test likes

### Integration Testing
- [ ] Test complete user journey (signup -> onboarding -> profile)
- [ ] Test authenticated vs public views
- [ ] Test protected routes redirect correctly
- [ ] Test session persistence across refreshes
- [ ] Test logout clears session

### Performance Testing
- [ ] Check page load times
- [ ] Check API response times
- [ ] Check for unnecessary re-renders
- [ ] Check bundle size

### Cleanup
- [ ] Remove old Next.js API routes (backup first)
- [ ] Remove NextAuth dependencies (after confirming not needed)
- [ ] Remove unused imports
- [ ] Update documentation

---

## Phase 5E: Production Deployment (NOT STARTED)

**Status:** PENDING

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Environment variables set correctly

### Deployment
- [ ] Deploy frontend to Vercel
- [ ] Update CORS settings on backend
- [ ] Test production API calls
- [ ] Verify cookies work on production domain

### Post-Deployment
- [ ] Monitor error rates
- [ ] Monitor API response times
- [ ] Test all features in production
- [ ] Get user feedback

---

## Future Phases (After Phase 5)

### Phase 6: MongoDB Cleanup
- [ ] Monitor PostgreSQL backend for 1 week
- [ ] Verify no issues
- [ ] Delete MongoDB cluster
- [ ] Remove MongoDB connection strings
- [ ] Update documentation

### Phase 7: Mobile Apps
- [ ] iOS app (SwiftUI) - 2-4 weeks
- [ ] Android app (Kotlin) - 2-4 weeks
- [ ] Same Go backend serves all platforms

### Phase 8: Advanced Features
- [ ] Recommendation engine v2 (vector embeddings)
- [ ] Redis caching for profiles
- [ ] Rate limiting
- [ ] Email notifications
- [ ] Social features v2

---

## Daily Priorities

### Today (May 1, 2026)
1. FIX AUTH BUG (highest priority)
2. Test login flow thoroughly
3. Continue Phase 5C if auth fixed

### This Week
- Complete Phase 5C (API endpoint migration)
- Complete Phase 5D (testing)
- Begin Phase 5E (deployment prep)

### This Month
- Complete frontend integration
- Deploy to production
- Start mobile app planning

---

## Notes

- **Auth bug is blocking all progress** - must fix before continuing
- Phase 5B complete but auth doesn't work = wasted effort if not fixed
- Once auth works, Phase 5C should go quickly (systematic replacement)
- Keep MongoDB running as backup until production stable
- Document all fixes in CHANGELOG.md

---

## Quick Reference

**Key Files:**
- Auth: `lib/auth/actions.ts`, `lib/auth/jwt-session.ts`
- API Client: `lib/api/client.ts`, `lib/api/endpoints.ts` (to create)
- Backend: `internal/handler/auth.go`
- Database: Railway PostgreSQL

**Key Commands:**
```bash
# Test backend directly
curl -X POST https://paperboxd-backend-production-d9e0.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'

# Check database
railway run psql postgresql://postgres:...@mainline.proxy.rlwy.net:46739/railway

# Run dev server
npm run dev

# Build check
npm run build
```
