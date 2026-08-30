# ROADMAP - PaperBoxd Product Development

**Project:** PaperBoxd - Social Book Tracking Platform  
**Vision:** Letterboxd for books  
**Current Stage:** Backend Migration & Frontend Integration  
**Last Updated:** May 1, 2026

---

## Product Vision

Create the premier social platform for book lovers to discover, track, and share their reading journey with modern UX, mobile-first design, and intelligent recommendations.

---

## Timeline Overview

```text
2025 Q4: MVP Development (MongoDB)
2026 Q1: Backend Migration (Go/PostgreSQL) COMPLETE
2026 Q2: Frontend Integration <- CURRENT
2026 Q3: Mobile Apps
2026 Q4: Growth & Scale
2027+: Advanced Features
```

---

## Phase 1: MVP Development (COMPLETE)

**Timeline:** December 2025  
**Status:** Complete

Deliverables included Next.js app, MongoDB, NextAuth, user profiles, bookshelf, lists, diary, social features, and search.

---

## Phase 2: Backend Migration (COMPLETE)

**Timeline:** March 15 - April 3, 2026  
**Status:** Complete (zero data loss)

Highlights:
- Go + Chi backend, PostgreSQL, Redis, JWT auth
- 39 users and 4,129 books migrated
- Type-safe queries with sqlc
- 10x performance improvements on cached reads

---

## Phase 3: Frontend Integration (IN PROGRESS)

**Timeline:** April 30 - May 14, 2026  
**Status:** ~50% complete, blocked by auth bug

### 3A: Auth Bridge (Complete)
- JWT sessions, API client, auth actions

### 3B: Auth UI (Complete)
- Auth provider, middleware, auth form migration

### Critical Blocker
- Login creates a new user instead of authenticating existing user

### 3C: API Endpoint Migration (Paused)
- Unified API helpers
- Full page-by-page endpoint migration
- Response-shape compatibility fixes

### 3D: Testing & Cleanup (Pending)
- End-to-end feature testing
- Performance checks
- Remove obsolete routes

### 3E: Production Deployment (Pending)
- Vercel deploy, CORS/cookies validation, monitoring

Success criteria:
- All frontend features run on Go backend
- Session persistence works
- No regressions for existing users

---

## Phase 4: MongoDB Cleanup (Pending)

**Timeline:** May 15-22, 2026  
After one stable week on PostgreSQL:
- Remove MongoDB infra and secrets
- Update docs and operational runbooks

---

## Phase 5: Mobile Apps (Future)

**Timeline:** June-August 2026

- iOS app (SwiftUI)
- Android app (Kotlin/Jetpack Compose)
- Shared Go backend + JWT auth

---

## Phase 6: Growth & Optimization (Future)

**Timeline:** Sep-Dec 2026

- Recommendation engine v2 (embeddings)
- Performance improvements and caching
- Social features v2
- Reading analytics

---

## Phase 7: Scale & Enterprise (2027+)

- Multi-region infrastructure
- Premium/partnership features
- External API and growth model expansion

---

## Strategic Goals

**Short term (Q2 2026):**
- Complete frontend integration
- Deploy stable production build
- Prepare mobile roadmap

**Medium term (Q3-Q4 2026):**
- Launch mobile apps
- Improve recommendations/social loops
- Grow active users

**Long term (2027+):**
- Scale platform reliability and business model

---

## Current Status Summary

As of May 1, 2026:

- Completed: backend migration and auth infrastructure
- Blocking: auth login flow creates wrong user
- Paused: full API endpoint migration
- Upcoming: finish integration, deploy, then mobile

---

## Next Milestones

### This Week
- Fix auth bug
- Complete API migration
- Full feature testing
- Deploy production update

### This Month
- Stabilize production
- Start mobile planning
- Gather early user feedback

---

## Links

- Website: <https://paperboxd.in>
- Backend API: <https://paperboxd-backend-production-d9e0.up.railway.app>
- Contact: `hridyesh@paperboxd.in`

---

**Last Updated:** May 1, 2026  
**Next Review:** May 15, 2026
