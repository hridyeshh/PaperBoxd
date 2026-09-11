# Paperboxd — Launch Audit (Phase 0)

**Date:** 2026-09-11
**Scope:** `paperboxd` (web, `main` @ c24339a), `paperboxd-backend` (`main` @ 63ad2fd), `paperboxd-ios` (`main` @ 938280d), `paperboxd-android` (`main` @ 8a8a934), `analytics-paperboxd` (`main` @ c0dd0d5)
**Method:** Read-only. Every finding cites the file it was verified in. Nothing was changed.
**Verified green:** web `tsc --noEmit` clean; backend `go build`, `go vet`, `go test ./...` pass. iOS/Android builds not run in this audit (no simulator/adb here) — PARITY_HANDOFF.md claims `assembleDebug` compiles as of 2026-08-09.

Priority key: **P0** launch blocker · **P1** high impact · **P2** important polish · **P3** later.

---

## 1. Snapshot

| Layer | State |
|---|---|
| Backend | Go 1.25 / chi / pgx / sqlc / pgvector / Redis. 31k LOC. 41 migrations, auto-applied at boot. Redis optional (degrades to DB-only). Nightly cron: signal profiles, diary centroids, 30-day purge of soft-deleted users. |
| Web | Next.js (turbopack) + NextAuth + Go JWT cookies. 77 API routes proxying to Go. Legacy MongoDB still wired into 8 routes. Book page 2.3k LOC, profile page 5.2k LOC, both fully client-rendered. |
| iOS | SwiftUI, 26k LOC, no tests. Bundle ID `com.paperboxd.PaperBoxd`. No deep links. No Apple Sign-In UI. |
| Android | Compose, 28k LOC, no tests. `in.paperboxd.app`. App Links declared for `/b/` and `/u/`. Keystore placeholders. |
| Analytics | Password-gated Next dashboard reading 3 Go endpoints. Retention/cohort views are stubs. |
| Legal | Backend `docs/PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md` complete except effective date. |

---

## 2. Findings by area

### 2.1 Backend — security / integrity

| ID | P | Finding | Evidence |
|---|---|---|---|
| B-01 | **P0** | **Any authenticated user can mint XP.** `/api/v1/test/award-xp` and `/test/xp-info` are live behind plain `Authenticate`. Marked "TEMPORARY TEST ROUTES - DELETE BEFORE PRODUCTION". Poisons leaderboards, streaks, referral milestones. | `cmd/api/main.go` (test route group), `internal/handler/xp_debug.go` |
| B-02 | **P0** | **Any authenticated user can delete books.** `DELETE /api/v1/admin/cleanup-books` and `POST /admin/leaderboard/rebuild` have no admin check — only `Authenticate`. There is no admin concept anywhere (no `is_admin` column, no allowlist). | `cmd/api/main.go` (`/admin` route), `internal/handler/books.go:1229`, `leaderboard.go:92` |
| B-03 | **P0** | **`CleanupStaleBooks` destroys user data.** Excludes only `bookshelf` and `likes`; `list_books`, `favorites`, `reading_log`, `book_embeddings` all `ON DELETE CASCADE`. A book that lives only in someone's list or Top 4 and hasn't been opened in 15 days is deleted along with those rows. Web exposes it via `/api/cleanup/books` whose guard is skipped when `CLEANUP_SECRET` is unset. | `queries/books.sql:86-95`, `migrations/000005:19`, `000004:17`, `000020:4`; `paperboxd/app/api/cleanup/books/route.ts:6` |
| B-04 | P1 | **Hardcoded owner email bypasses Scan quota in source.** `scanUnlimitedEmails = {"hridyesh2309@gmail.com"}`. Master prompt explicitly asks this be removed from normal flows. Should be env/DB-driven (and is the natural first `entitlement` seam — Phase 18). | `internal/handler/scan.go:100-113` |
| B-05 | P1 | **Mobile access JWT lives 30 days and is stateless.** `Authenticate` never touches DB, so logout, account deletion, block, and password reset cannot revoke a mobile session for up to 30 days. Deleted users can keep writing on endpoints that don't re-fetch the user (events, follow, like, bookshelf). | `internal/config/config.go` (`AccessTokenExpiryMobile` 30d), `internal/auth/mobile.go:104-108`, `internal/middleware/auth.go` |
| B-06 | P1 | **No OTP send cooldown.** `/auth/otp/send`, `/register/send-otp`, `/mobile/auth/otp/send` only bounded by global 100 req/min/IP → email bombing of a victim and Resend quota burn. Verify side is fine (hashed, 5 attempts, 10-min TTL). | `internal/auth/otp.go`, `register_otp.go`, `mobile.go` |
| B-07 | P1 | **Single global rate limit (100/min per token or IP in prod).** Web profile page fires 24 fetches; each Next route fans out to 1–3 Go calls. Goodreads import does 2–3 Go calls per book with no row cap → any import >~40 rows starts 429-ing mid-way and silently skips. | `cmd/api/main.go` (httprate), `internal/config/config.go` (`RATE_LIMIT_PER_MINUTE`), `paperboxd/app/api/import/goodreads/route.ts:93-145` |
| B-08 | P2 | `?debug=true` on `/scan/analyze` returns the full Claude prompt context (`user_profile`, `community_summary`) to any user. | `internal/handler/scan.go:117,404-407` |
| B-09 | P2 | Scan quota check-then-decrement race: two concurrent scans with 1 remaining both hit Claude (cost), one decrements. Not user-visible; costs money. | `scan.go:157,368` |
| B-10 | P2 | Referral XP (50, cap-exempt) has no per-referrer cap → leaderboard farming via throwaway signups. | `internal/service/referral_service.go:40-52` |
| B-11 | P2 | Login has no per-account lockout (bcrypt + IP limit only). Acceptable at launch scale; note for later. | `internal/auth/auth.go` |
| B-12 | P2 | Web `GoogleAuth` internal-secret compare is not constant-time (mobile one is). | `internal/auth/auth.go:412` vs `middleware/internal_secret.go` |
| B-13 | P2 | **sqlc output has drifted from `queries/*.sql`.** `sqlc generate` (v1.30.0) rewrites `models.go`/`users.sql.go` (`RecordAccountDeletionParams.EmailHash` as `pgtype.Text`, not `string`) → build breaks. Generated code was hand-edited after migration 000041. Regenerate + fix callers once, or nobody can safely add a query. | `internal/db/users.sql.go`, `handler/users.go:350` |

### 2.2 Backend — analytics foundation

| ID | P | Finding | Evidence |
|---|---|---|---|
| A-01 | P1 | **`events.user_id` is NOT NULL → no anonymous events.** `landing_viewed`, `signup_started`, logged-out browse are untrackable. Phase 16 acquisition funnel impossible on current schema. | `internal/service/events.go:23-25`, `handler/events.go:29` |
| A-02 | P1 | **Three naming conventions in one table.** Server emits `book.viewed`, `user.followed` (dotted, 16 types); rec feedback emits `impression`/`click`/`dismiss`; iOS emits `book_impression`. No validation on `event_type`. | grep of `EventType:` in `internal/`; `paperboxd-ios/.../HomeViewModel.swift:164`; `handler/events.go:56` |
| A-03 | P1 | **Web has zero client-side tracking.** `/api/events/track` exists but has no callers. Android/iOS only send rec impressions. None of the Phase 1/16 events (`onboarding_*`, `first_*`, `search`, `profile_viewed`, `feed_viewed`) exist anywhere. | `paperboxd/app/api/events/track/route.ts`; grep of callers = 0 |
| A-04 | P1 | **DAU/WAU/MAU derive from `users.last_activity_date`, which only XP-earning actions and web `daily-open` update.** Neither mobile app calls `/users/me/daily-open` → mobile lurkers are invisible. | `handler/analytics.go:48-50`, `queries/leaderboard.sql:25,56`, `handler/users.go:409`; grep in iOS/Android = 0 |
| A-05 | P1 | No retention/cohort endpoint at all (D1/D7/D14/D30, activation). Dashboard shows "needs cohort endpoint". | `handler/analytics.go` (3 endpoints only); `analytics-paperboxd/app/(dashboard)/retention/page.tsx:33-37` |
| A-06 | P2 | `session_id` column exists but nothing populates it → no sessions/user metric. | `migrations/000028`, `handler/events.go:70` |
| A-07 | P2 | Reason engine couples to web by **string prefix matching** (`'You read'`, `'Matches your'`) instead of `Type`. Any copy change silently breaks the filter tabs. | `internal/service/reason_engine.go:19-25`, `paperboxd/app/api/books/personalized/route.ts` |

### 2.3 Web

| ID | P | Finding | Evidence |
|---|---|---|---|
| W-01 | P1 | **Book and profile pages are `"use client"` with no `generateMetadata`.** Shared links to `/b/[slug]` and `/u/[username]` render generic OG tags — no title, cover, or avatar in iMessage/WhatsApp/Twitter previews. Also zero SEO for book pages. Only layout/privacy/faq/terms/case-studies export metadata. | `app/b/[slug]/page.tsx:1`, `app/u/[username]/page.tsx:1` |
| W-02 | P1 | **Goodreads import unbounded + serverless.** No row cap, runs inside one Next request (Vercel timeout), 429s under B-07. Large libraries partially import with a success toast. | `app/api/import/goodreads/route.ts` |
| W-03 | P1 | **Android App Links can't verify.** `public/.well-known/assetlinks.json` has `REPLACE_WITH_UPLOAD_KEY_SHA256` placeholders. No `apple-app-site-association` at all. | `public/.well-known/assetlinks.json:8-9` |
| W-04 | P2 | **Legacy MongoDB still on the request path.** 8 routes import `lib/db/mongodb` (7 dead `app/api/mobile/v1/*` routes no client calls, plus `delete-account` dual-purge). `mongodb`, `mongoose` remain in deps. | `grep mongodb app/api`; `app/api/users/delete-account/route.ts:19` |
| W-05 | P2 | Dev pages shipped: `/test`, `/demo`, `/clear-cookies`. Unlinked but reachable. | `app/test/page.tsx`, `app/demo/page.tsx`, `app/clear-cookies/` |
| W-06 | P2 | Onboarding = username → genres → tempo (+ optional Goodreads CSV) → aha reveal. **No "pick books you love", no "follow readers" step**, no onboarding events. Backend onboarding only stores genres + authors. | `components/ui/onboarding/onboarding-flow.tsx:80`, `internal/handler/users.go:285-310` |
| W-07 | P2 | Empty states are generic ("No lists yet", "Nothing here yet", "No books found") with no CTA. 14 distinct generic strings. | grep across `app/` + `components/` |
| W-08 | P2 | `middleware.ts` protects `/settings` — route doesn't exist. Settings live inside the 5.2k-line profile page. | `middleware.ts:5`, `app/u/[username]/page.tsx` |
| W-09 | P2 | No `robots.txt` / `sitemap` despite `docs/SEO_SETUP.md`. | `app/`, `public/` |
| W-10 | P3 | Monolith pages (profile 5,204 lines, book 2,352). Refactor risk; defer unless a Phase 3/4 change requires it. | wc -l |

Landing page: already truthful — real covers from `/api/books/landing`, gradient fallback, planned features labelled "Not built yet". No fake social proof found. ✔

### 2.4 iOS

| ID | P | Finding | Evidence |
|---|---|---|---|
| I-01 | **P0** | **Bundle ID still `com.paperboxd.PaperBoxd` (Xcode template default).** Keychain service and Google OAuth client were set up for `in.paperboxd.app` per code comments. Backend `APPLE_ALLOWED_AUDIENCES` and `APNS_TOPIC` default to `com.paperboxd.PaperBoxd`. Bundle ID is permanent once the App Store record exists — **decide before creating it**, then align backend env + Google console. | `PaperBoxd.xcodeproj/project.pbxproj`, `PaperBoxd/Config/Config.swift:25-30`, `Network/GoogleOAuth.swift:11`, `backend/internal/config/config.go` |
| I-02 | P1 | **No deep links / universal links.** No `CFBundleURLTypes`, no `applinks`, no `onOpenURL`. Shared `paperboxd.in/b/...` links open Safari, never the app. Empty entitlements file. | `PaperBoxd/Info.plist`, `PaperBoxd/*.entitlements` |
| I-03 | P1 | **Apple Sign-In not surfaced.** `loginWithApple` exists in VM, backend endpoint exists, but no button/`ASAuthorizationController`/entitlement. Guideline 4.8 is satisfied by email OTP, but Google-only social login on iOS is a conversion loss. | `Features/Auth/AuthViewModel.swift:198`; grep `ASAuthorizationController` = 0 |
| I-04 | P2 | API base URL hardcoded to Railway hostname in both Debug and Release. Any Railway URL change bricks shipped builds. Recommend `api.paperboxd.in` CNAME before submission. | `Config/Config.swift:14-16` |
| I-05 | P2 | No automated tests. | repo root |
| I-06 | P2 | `NetworkMonitor` referenced from only 2 files — offline banner not app-wide. | grep |
| I-07 | P3 | Version `1.0 (1)`; fine for first submission. | pbxproj |

Resolved since `RELEASE_READINESS.md` (2026-07-23): app icon present (light/dark/tinted 1024), legal `[PLACEHOLDER]` blocks gone. That doc is stale on those two points.

### 2.5 Android

| ID | P | Finding | Evidence |
|---|---|---|---|
| D-01 | **P0** | **Release signing has `CHANGE_ME` ×3 in `keystore.properties`.** Cannot produce a signed release/AAB. (File is git-ignored, so must be fixed on the build machine.) | `keystore.properties` |
| D-02 | P1 | App Links (`autoVerify`) will fail until W-03 is fixed with the real upload + Play-signing SHA-256. | `app/src/main/AndroidManifest.xml:45-51` |
| D-03 | P2 | API base URL hardcoded to Railway hostname (same as I-04). | `config/Config.kt:10` |
| D-04 | P2 | `isMinifyEnabled = false` on release → larger APK, no R8. Acceptable for v1. | `app/build.gradle.kts:54` |
| D-05 | P2 | No automated tests. Offline detection only in Scan screen. | `find app/src/test` = 0 |

Parity: feature directories match 1:1 (auth, author, bookdetail, diary, home, jazy, leaderboard, onboarding, profile, scan, search, settings, splash, wrapped, write). Both create/like/delete diary, create lists, block/report. Android is ahead on share sheet, change password, home currently-reading card. No parity blocker found. ✔

Push notifications: backend has `device_tokens` table + `PUSH_ENABLED` config, but **neither app registers a device token** and the privacy audit predates the migration. Push is effectively not shipped — deferred, not broken.

### 2.6 Analytics dashboard

| ID | P | Finding | Evidence |
|---|---|---|---|
| N-01 | P1 | **"MAU" KPI is wrong.** Retention page sums `active_by_day` over 30 days — counts the same user up to 30 times. Overview page uses the correct backend `mau`. Two numbers labelled MAU disagree. | `app/(dashboard)/retention/page.tsx:32` vs `overview/page.tsx` |
| N-02 | P1 | D1/D30/activation/stickiness/dormant cards are all `"—"`. Cohort section is a TODO pointing at a nonexistent endpoint. | `retention/page.tsx:33-37,55-58` |
| N-03 | P2 | Infra page hardcodes `Status: connected`, `Provider: Supabase`, `Replication: not configured` — decorative, not live. Violates "never hardcode fake numbers". | `app/(dashboard)/infra/page.tsx` |
| N-04 | P2 | Auth cookie stores the raw dashboard password; compare is not constant-time. Internal tool, low exposure, but trivial to fix (HMAC of password). | `app/api/auth/route.ts:9`, `middleware.ts:8` |
| N-05 | P2 | No feature-adoption ↔ retention view, no power-user drill-down beyond top-N by XP. | `features/page.tsx`, `users/page.tsx` |

### 2.7 Legal / privacy

| ID | P | Finding | Evidence |
|---|---|---|---|
| L-01 | P1 | Effective date `[PLACEHOLDER — set on publish]` in canonical docs **and** in the Android bundled copies (rendered live in-app). iOS `LegalText.swift` is clean. Everything else resolved (governing law, age, hosting). | `backend/docs/PRIVACY_POLICY.md:3`, `TERMS_OF_SERVICE.md:3`, `paperboxd-android/app/src/main/assets/legal/*.md:3` |
| L-02 | P2 | Web `components/legal/*` is a divergent binding copy of backend docs (per memory: `project-legal-docs-audit`). Needs a single source or a sync script (`scripts_sync_legal.py` exists in backend). | `paperboxd/components/legal/`, `backend/scripts_sync_legal.py` |
| L-03 | P2 | `docs/PRIVACY_AUDIT.md` (2026-07-18) says "no push, no device tokens" — now false (migration 000036). Update before anyone relies on it. | `backend/docs/PRIVACY_AUDIT.md` |

What's solid: account deletion (soft-delete → placeholders free email/username → refresh tokens revoked → 30-day purge; audit row stores only email hash), OTP hashing + attempt caps, private-profile middleware, block filtering on diary/reviews, Redis-optional boot, CORS allowlist with mobile passthrough, migrations embedded and idempotent. ✔

---

## 3. Prioritised launch backlog

### P0 — launch blockers (must close before any public build)

| # | Item | Repo | Effort |
|---|---|---|---|
| 1 | ✅ **Fixed 2026-09-11.** Deleted `/test/award-xp`, `/test/xp-info` and `xp_debug.go` | backend | — |
| 2 | ✅ **Fixed 2026-09-11.** `/admin/*` now behind `RequireInternalSecret`. Web `/api/cleanup/books` fails closed unless both `CLEANUP_SECRET` and `INTERNAL_SECRET` are set, forwards `X-Internal-Secret`; `adminApi` removed | backend, web | — |
| 3 | ✅ **Fixed 2026-09-11.** `CleanupStaleBooks` now `NOT EXISTS` against bookshelf, likes, favorites, list_books, reading_log, diary_entries, activities | backend | — |
| 4 | Decide and lock iOS bundle ID; align Xcode, Keychain service, Google OAuth iOS client, backend `APPLE_ALLOWED_AUDIENCES` / `APNS_TOPIC` | ios, backend env, Google console | 1 h + decision |
| 5 | Generate release keystore, fill `keystore.properties`, record upload-key SHA-256 | android | 30 min |

### P1 — high impact (target before launch; all are small-to-medium)

| # | Item | Repo | Phase |
|---|---|---|---|
| 6 | Move scan allowlist out of source → `SCAN_UNLIMITED_EMAILS` env or a `users.entitlements` seam | backend | 10, 18 |
| 7 | Shorten mobile access JWT (≤24 h) and rely on the existing refresh-token rotation; or add a Redis revocation check in `Authenticate` | backend, ios, android | 13, 21 |
| 8 | OTP send cooldown (60 s per email, Redis or `otp_codes.created_at`) | backend | 21 |
| 9 | Per-route rate limits: loosen authenticated reads, tighten `/auth/*` and `/scan/analyze`; verify prod `RATE_LIMIT_PER_MINUTE` | backend | 14 |
| 10 | Goodreads import: cap rows (e.g. 500), batch via a single backend endpoint, return partial-failure report instead of success toast | web, backend | 1 |
| 11 | `generateMetadata` for `/b/[slug]` and `/u/[username]` (title, description, OG image via existing `/api/og/share`) — needs a thin server wrapper around the client pages | web | 20 |
| 12 | Real `assetlinks.json` fingerprints + add `apple-app-site-association`; iOS `applinks` entitlement + `onOpenURL` router for `/b/`, `/u/`, `/u/*/lists/*` | web, ios | 15, 20 |
| 13 | Analytics schema: make `events.user_id` nullable + add `anon_id`; validate `event_type` against a Go enum; unify naming to `snake_case` (`book_viewed`); populate `session_id` | backend | 16 |
| 14 | Emit the Phase 1/16 event set from all three clients through the one `/events` endpoint (web has the route already, unused) | web, ios, android | 1, 16 |
| 15 | Mobile apps call `/users/me/daily-open` on foreground (fixes DAU) | ios, android | 16 |
| 16 | `/analytics/retention` endpoint (D1/D7/D14/D30 cohorts from `users.created_at` × `events`) + wire retention page; fix MAU sum | backend, analytics | 16, 17 |
| 17 | Apple Sign-In button + entitlement on iOS | ios | 15 |
| 18 | Set legal effective dates; run `scripts_sync_legal.py` so web copy matches backend | backend, web | 0 |

### P2 — important polish (during Phases 1–22)

| # | Item | Repo |
|---|---|---|
| 19 | Remove `?debug=true` from scan (or gate behind internal secret) | backend |
| 20 | Atomic scan quota: `UPDATE … WHERE scan_uses_remaining > 0 RETURNING` **before** the Claude call, refund on failure | backend |
| 21 | Referral cap (e.g. 10 rewarded signups / 30 d) | backend |
| 22 | Remove dead `app/api/mobile/v1/*` + Mongo deps once Atlas is confirmed decommissioned; keep `delete-account` dual-purge until then | web |
| 23 | Delete `/test`, `/demo`, `/clear-cookies` pages | web |
| 24 | Onboarding: add "pick 3 books you loved" + "follow 3 readers" steps; emit events | web, ios, android |
| 25 | Empty states with CTAs on shelf/TBR/diary/lists/followers/home (Phase 12) | all clients |
| 26 | Rec reason filter on `Type` not text prefix | web, backend |
| 27 | `api.paperboxd.in` custom domain; update both mobile configs | infra, ios, android |
| 28 | Dashboard: remove fake infra card; HMAC the auth cookie | analytics |
| 29 | `robots.txt` + `sitemap.xml` for books, profiles, lists | web |
| 30 | Update `PRIVACY_AUDIT.md` for device tokens; update `RELEASE_READINESS.md` | backend, ios |
| 31 | App-wide offline banner on iOS/Android | ios, android |

### P3 — later / Plus

- Split profile and book monolith pages (only if a Phase 3/4 change forces it).
- R8/minify on Android release.
- Per-account login lockout.
- Push notifications (device-token registration on clients, APNs/FCM sender).
- Unit/UI test scaffolding on mobile.

---

## 4. Intentionally deferred to Paperboxd Plus

- Scan quota → entitlement (`scan_unlimited`); billing; paywall UI.
- Smart TBR, reading intelligence, planner, AI companion, memory, social intelligence, advanced stats/wrapped, profile customization.
- Only the **entitlement seam** (Phase 18) ships in this cycle — driven first by item 6 above.

## 5. Open questions for the owner

1. **iOS bundle ID:** `in.paperboxd.app` (matches Android + Keychain + Google client) or keep `com.paperboxd.PaperBoxd` (matches backend defaults)? Recommendation: `in.paperboxd.app`, update backend env.
2. **Book cleanup:** keep the sliding-window delete at all? Books cost rows, not money. Recommendation: disable the endpoint; revisit with a proper orphan query later.
3. **Prod env values** not verifiable from repo: `RATE_LIMIT_PER_MINUTE`, `CLEANUP_SECRET`, `INTERNAL_SECRET`, `TOKEN_EXPIRY_MOBILE`, `CORS_ALLOWED_ORIGINS`, `GOOGLE_OAUTH_ALLOWED_AUDIENCES`. Confirm before launch lock.
4. **MongoDB Atlas:** decommissioned yet? Gates W-04.
