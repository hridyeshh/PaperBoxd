# PLAN - Frontend Integration Execution Strategy

**Project:** PaperBoxd Frontend Integration  
**Goal:** Connect Next.js frontend to Go/PostgreSQL backend  
**Timeline:** 1-2 weeks  
**Status:** Phase 5B Complete, Phase 5C Blocked by Auth Bug

---

## Overview

Replace MongoDB/NextAuth authentication with Go backend JWT authentication and migrate all API calls from Next.js API routes to Railway Go backend.

---

## Phase Breakdown

### Phase 5A: Authentication Bridge (COMPLETE)

**Duration:** 1 day  
**Status:** Complete  
**Completed:** April 30, 2026

**Deliverables:**
- `lib/api/client.ts` - Backend API client with typed methods
- `lib/auth/jwt-session.ts` - Server-side JWT session management
- `lib/auth/actions.ts` - Server actions for login/register/logout
- `scripts/test-backend-auth.ts` - Auth flow test script
- `.env.local` - Environment variables configured

**Outcome:** JWT authentication infrastructure ready

---

### Phase 5B: Update Authentication UI (COMPLETE)

**Duration:** 1 day  
**Status:** Complete (but auth flow has bug)  
**Completed:** May 1, 2026

**Deliverables:**
- `components/providers/auth-provider.tsx` - Client auth context
- `middleware.ts` - Route protection
- Updated auth forms to use new actions
- Migrated 25 files from useSession() -> useAuth()
- Updated all logout buttons

**Outcome:** UI uses new auth system, but login creates wrong user

---

### CRITICAL BLOCKER: Fix Auth Bug

**Duration:** 1-2 hours (investigation) + 30 mins (fix)  
**Status:** BLOCKING ALL PROGRESS

**Problem:**
Login creates new user "hridyesh2309" instead of authenticating existing user "hridyesh"

**Investigation Plan:**

1. **Database Analysis (15 mins)**
   - Query all users with "hridyesh" in username/email
   - Check for duplicates
   - Identify when "hridyesh2309" was created
   - Compare with migrated user "hridyesh"

2. **Backend Testing (15 mins)**
   - Test `/api/v1/auth/login` directly with curl
   - Test `/api/v1/auth/register` directly with curl
   - Examine response structures
   - Verify backend behavior in isolation

3. **Code Review (30 mins)**
   - Review `internal/handler/auth.go` login handler
   - Review `internal/handler/auth.go` register handler
   - Review `lib/auth/actions.ts` for fallback logic
   - Review `components/ui/auth/auth-form-1.tsx` submission logic
   - Search for username generation logic

4. **Root Cause Identification (15 mins)**
   - Is frontend calling register instead of login?
   - Is backend creating user on failed login?
   - Is there username conflict handling adding numbers?
   - Is there email-to-username auto-generation?
   - Is old NextAuth interfering?

5. **Fix Implementation (30 mins)**
   - Based on root cause, implement targeted fix
   - Test fix locally
   - Deploy if backend changes needed
   - Verify fix works

6. **Verification (15 mins)**
   - Delete test user "hridyesh2309"
   - Test login flow end-to-end
   - Verify correct user authenticated
   - Verify no new users created

**Success Criteria:**
- Login authenticates existing user
- Redirects to `/u/hridyesh` (not `/u/hridyesh2309`)
- Profile loads successfully
- No new users created in database

---

### Phase 5C: Update API Endpoints (PAUSED)

**Duration:** 2-3 days  
**Status:** PAUSED (waiting for auth fix)

**Strategy:**
Systematic replacement of all fetch calls with Go backend endpoints.

#### Day 1: Setup & User Endpoints (8 hours)

**Morning (4 hours):**
1. Create `lib/api/endpoints.ts` (1 hour)
2. Update user profile page (1 hour)
3. Update bookshelf component (2 hours, flat response changes)

**Afternoon (4 hours):**
4. Update lists (2 hours)
5. Update diary (1 hour)
6. Update social features (1 hour)

#### Day 2: Book & Search Endpoints (6 hours)

**Morning (3 hours):**
1. Update book search (1.5 hours)
2. Update book detail page (1.5 hours)

**Afternoon (3 hours):**
3. Update home page carousels (2 hours)
4. Update recommendations page (1 hour)

#### Day 3: Activity Feed & Client Actions (6 hours)

**Morning (3 hours):**
1. Update activity feed (2 hours)
2. Update activity indicators (1 hour)

**Afternoon (3 hours):**
3. Update client-side forms (3 hours)

#### Systematic Testing (2 hours)
For each updated component:
1. Test in browser
2. Check console for errors
3. Verify data displays correctly
4. Test authenticated vs public views
5. Mark complete in checklist

**Deliverables:**
- `lib/api/endpoints.ts` - Complete API helpers
- All pages using Go backend
- All fetch calls replaced
- All components tested
- `API_MIGRATION_CHECKLIST.md` - Status tracker

**Success Criteria:**
- No Next.js API routes used
- All data from Go backend
- Bookshelf flat structure working
- All features functional

---

### Phase 5D: Testing & Cleanup (2-3 days)

**Status:** PENDING

Day 1: Feature testing  
Day 2: Integration testing  
Day 3: Performance + cleanup

**Deliverables:**
- All features tested
- All edge cases handled
- Performance verified
- Code cleaned up
- Documentation updated

---

### Phase 5E: Production Deployment (1 day)

**Status:** PENDING

#### Pre-Deployment Checklist
- [ ] All TypeScript errors resolved
- [ ] No console errors in production build
- [ ] No warnings in build output
- [ ] All tests passing

#### Deployment Steps
1. Frontend deploy to Vercel
2. Update backend CORS
3. Verify domain/SSL
4. Run production smoke tests

#### Post-Deployment
Monitor logs, errors, and response times for first 24 hours.

---

## Dependencies

**Blocking Issues:**
- Auth bug must be fixed before Phase 5C can proceed

**External Dependencies:**
- Railway backend online
- PostgreSQL accessible
- Vercel deployment healthy

---

## Risk Mitigation

- Auth bug drags on -> cap investigation at 4 hours, fallback to temporary NextAuth path
- Response shape mismatches -> compatibility layer in API client
- Deployment issues -> rollback to previous Vercel deploy
- Performance issues -> optimize + add Redis where needed

---

## Success Metrics

- 100% API calls use Go backend
- 0 TypeScript errors
- < 2s page load times
- < 100ms cached API responses
- < 500ms uncached API responses

---

## Next Actions

**Immediate (Today):**
1. Fix auth bug
2. Test login flow
3. Resume Phase 5C

**This Week:**
1. Complete Phase 5C
2. Complete Phase 5D
3. Prepare Phase 5E

---

## Notes

- Auth bug discovered during Phase 5B testing
- Cannot continue endpoint migration until auth is reliable
- Core architecture is ready; issue is in flow logic
