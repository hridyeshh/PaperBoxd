# PaperBoxd

> *Your reading universe, organized.*

PaperBoxd is a modern social book-tracking platform that transforms reading into a connected, discoverable experience — inspired by the simplicity and community spirit of Letterboxd, but built exclusively for books.

**Website:** [paperboxd.in](https://paperboxd.in) · **Contact:** paperboxd@gmail.com

---

## Table of Contents

- [What is PaperBoxd?](#what-is-paperboxd)
- [Repository Map](#repository-map)
- [System Architecture](#system-architecture)
- [Backend (Go + PostgreSQL)](#backend-go--postgresql)
- [Frontend (Next.js)](#frontend-nextjs)
- [iOS App (SwiftUI)](#ios-app-swiftui)
- [Design System](#design-system)
- [Mobile API Contract](#mobile-api-contract)
- [Deployment](#deployment)
- [Development Setup](#development-setup)
- [Roadmap](#roadmap)

---

## What is PaperBoxd?

PaperBoxd solves a fundamental problem: reading is deeply personal yet inherently social, but existing platforms fragment the experience. PaperBoxd is a unified space where readers can:

- **Track their journey** — from "to-be-read" aspirations to finished masterpieces
- **Discover meaningfully** — through community curation and authentic recommendations
- **Express authentically** — with rich profiles, custom lists, and a full-featured reading diary
- **Connect organically** — by following fellow readers and exploring their literary landscapes

### Core Philosophy

> "The best book recommendations come from people, not algorithms."

PaperBoxd is designed around the principle that reading communities thrive when readers can express themselves, discover through trusted networks, and maintain control over their own data and privacy.

### Anti-references

| Platform | What we avoid |
|----------|---------------|
| **Goodreads** | Cluttered UI, information overload, dated form controls, no visual hierarchy |
| **Generic SaaS** | Inter everywhere, blue primary, rounded card grids, zero editorial character |
| **Letterboxd clone** | Dark film-festival aesthetic — PaperBoxd is for books and has its own visual identity |
| **Amazon / retail** | Commerce-forward energy, rating everywhere, no editorial personality |

---

## Repository Map

| Repository | Description | Stack |
|---|---|---|
| `paperboxd-backend` | REST API server | Go 1.25, PostgreSQL 16, Redis 7 |
| `paperboxd` | Web frontend | Next.js 15, React 19, TypeScript 5 |
| `paperboxd-ios` | Native iOS app | SwiftUI, Swift 5.9+ |
| `Paperboxd design elements` | Design system & UI specs | CSS tokens, HTML prototypes, JSX frames |
| `analytics-paperboxd` | Internal analytics dashboard | Next.js, Tailwind |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│   ┌──────────────────┐   ┌──────────────────┐                    │
│   │   Next.js Web    │   │    iOS (SwiftUI)  │                    │
│   │  (Vercel · CDN)  │   │   (App Store)    │                    │
│   └────────┬─────────┘   └────────┬─────────┘                    │
└────────────│────────────────────────│────────────────────────────┘
             │  HTTPS / REST JSON     │  HTTPS / REST JSON
             ▼                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Go Backend  (Railway · Singapore)               │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ Chi Router │  │  JWT Auth     │  │  Redis 7 Cache           │ │
│  │ 60+ routes │  │  bcrypt hash  │  │  15-day book TTL         │ │
│  └────────────┘  └───────────────┘  └──────────────────────────┘ │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ sqlc-gen'd │  │ Rate limiting │  │  pgvector embeddings     │ │
│  │ DB queries │  │ 100 req/min   │  │  (recommendations)       │ │
│  └────────────┘  └───────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │ SQL / pgx
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              Data & External Services                            │
│  ┌──────────────┐  ┌────────────┐  ┌───────────┐  ┌──────────┐  │
│  │ PostgreSQL 16│  │  Redis 7   │  │  ISBNdb   │  │  Google  │  │
│  │  (Railway)   │  │ (Railway)  │  │    API    │  │  Books   │  │
│  └──────────────┘  └────────────┘  └───────────┘  └──────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Deployment:**
- **Backend:** Railway Hobby ($5/month) — Go binary, PostgreSQL 16, Redis 7
- **Frontend:** Vercel — Next.js 15 on global CDN
- **Region:** Singapore (optimal latency for Indian users)

---

## Backend (Go + PostgreSQL)

**Repository:** `paperboxd-backend`

The backend is a production-grade Go API server that was fully migrated from the original Next.js/MongoDB stack in March–April 2026, with zero data loss.

### Tech Stack

| Layer | Technology |
|---|---|
| HTTP Router | [chi v5](https://github.com/go-chi/chi) |
| Database | PostgreSQL 16 via [pgx/v5](https://github.com/jackc/pgx) |
| ORM / SQL | [sqlc](https://docs.sqlc.dev/) — type-safe, compile-time SQL |
| Cache | Redis 7 via [go-redis/v9](https://github.com/redis/go-redis) |
| Auth | JWT access tokens ([golang-jwt/jwt v5](https://github.com/golang-jwt/jwt)) + bcrypt |
| Migrations | [golang-migrate](https://github.com/golang-migrate/migrate) (28 migration files) |
| Vector search | [pgvector-go](https://github.com/pgvector/pgvector-go) for embedding-based recommendations |
| Rate limiting | [go-chi/httprate](https://github.com/go-chi/httprate) — 100 req/min per IP |
| Config | [godotenv](https://github.com/joho/godotenv) |

### Project Layout

```
paperboxd-backend/
├── cmd/api/             # HTTP server entrypoint (main.go)
├── internal/
│   ├── auth/            # Register, login, OTP, refresh, logout
│   ├── cache/           # Redis helpers
│   ├── config/          # Env config loader
│   ├── cron/            # Scheduled jobs (book TTL cleanup, leaderboard refresh)
│   ├── db/              # sqlc-generated models & queries (do not edit by hand)
│   ├── external/        # ISBNdb, Google Books API clients
│   ├── handler/         # Route handlers: users, books, lists, diary, leaderboard, ...
│   ├── middleware/       # JWT authentication middleware
│   ├── reqctx/          # Request context helpers
│   ├── service/         # Business logic services (mailer, recommendations, ...)
│   ├── token/           # JWT creation & validation
│   ├── types/           # Shared request/response types & error helpers
│   └── util/            # Common utilities
├── migrations/          # 28 SQL migration files (source of truth for schema)
├── queries/             # sqlc query files (.sql)
├── docs/
│   ├── API.md           # Full REST API reference
│   ├── MIGRATION_REPORT.md
│   └── LESSONS_LEARNED.md
├── docker-compose.yml   # Local Postgres + Redis
├── sqlc.yaml            # sqlc configuration
├── Makefile             # Developer commands
├── MOBILE_API.md        # Mobile-specific API contract
├── CHANGELOG.md         # Version history
└── ROADMAP.md           # Development roadmap
```

### Database Schema (28 Migrations)

The PostgreSQL schema has evolved across 28 migrations, tracking every feature addition:

| Migration | Description |
|---|---|
| 000001 | Initial schema — users, books, bookshelf |
| 000002 | Social features — follows, likes |
| 000003 | Frontend compatibility layer |
| 000004 | Reading status and top-4 favorites |
| 000005 | Reading lists |
| 000006 | Diary entries and activity feed |
| 000007–008 | Migration support & remaining MongoDB data |
| 000009 | Password reset tokens |
| 000010–012 | Account deletions, OTP codes, registration metadata |
| 000013–016 | Leaderboard columns, stats, XP transactions, referral system |
| 000017 | pgvector extension for embedding-based recommendations |
| 000018–020 | Temporal signals, newsletter, reading log |
| 000021–022 | Bookshelf review system |
| 000023–026 | Embedding audit columns, recommendation signals, book last-accessed |
| 000027 | Mobile onboarding flag |
| 000028 | Analytics event columns |

### API Endpoints (60+)

The API is versioned under `/api/v1`. Mobile-specific auth lives under `/api/mobile/auth/*`.

| Group | Coverage |
|---|---|
| `/api/health` | Connectivity probe (no DB round-trip) |
| `/api/mobile/auth/*` | Mobile login, register, OTP, Google OAuth, token refresh |
| `/api/v1/users/me` | Current user CRUD, onboarding, XP, referrals |
| `/api/v1/users/{username}` | Public profiles, follow/unfollow, bookshelf, diary, lists, favorites, TBR, streak |
| `/api/v1/books/*` | Search, detail, like/unlike, share, currently-reading, reviews |
| `/api/v1/leaderboard/*` | Global, friends, and dimension-based leaderboards |
| `/api/v1/recommendations/*` | Home feed, similar books, feedback signals |
| `/api/v1/activities/*` | Personal and following activity feeds |
| `/api/v1/search/vibe` | Semantic (embedding-based) vibe search |
| `/api/v1/newsletter` | Email subscription |

Full reference: [`docs/API.md`](docs/API.md)

### Makefile Commands

| Command | Description |
|---|---|
| `make dev` | `go run cmd/api/main.go` (hot-reload friendly) |
| `make build` | Compile to `bin/api` |
| `make docker-up` / `make docker-down` | Start/stop local Postgres + Redis via Docker Compose |
| `make migrate-up` / `make migrate-down` | Apply/roll back migrations |
| `make sqlc` | Regenerate `internal/db/` from `queries/*.sql` |
| `make fmt` | `go fmt ./...` |
| `make tidy` | `go mod tidy` |

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | ≥32 character secret for signing JWTs |
| `REDIS_URL` | recommended | Redis address (default: `localhost:6379`) |
| `PORT` | — | HTTP listen port (default: `8080`) |
| `ENVIRONMENT` | — | `development` or `production` |
| `GOOGLE_BOOKS_API_KEY` | — | Book search fallback |
| `ISBNDB_API_KEY` | — | Primary book metadata source |
| `RATE_LIMIT_PER_MINUTE` | — | Default `100` prod, `5000` dev |
| `CORS_ALLOWED_ORIGINS` | — | Browser allowlist for CORS |
| `TOKEN_EXPIRY_MOBILE` | — | Mobile JWT lifetime (default: 30 days) |

### Migration Achievements (March 2026)

Successfully migrated from MongoDB to PostgreSQL with **zero data loss**:

| Data | Count |
|---|---|
| Users | 39 |
| Books | 4,129 |
| Bookshelf entries | 39 |
| Likes | 23 |
| Reading lists | 4 (9 books) |
| Diary entries | 5 |
| Follows | 3 |
| Activity entries | 37 |

**Performance gains:**
- Book search: **10–50 ms** (PostgreSQL) vs 200–500 ms (MongoDB + Google Books API)
- Auto-caching reduces external API calls by **~70–80%**
- Type-safe sqlc queries prevent entire class of runtime SQL errors

---

## Frontend (Next.js)

**Repository:** `paperboxd`

The web frontend is a Next.js 15 application deployed on Vercel.

### Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, Framer Motion |
| UI Components | Radix UI primitives (Shadcn pattern), react-aria-components |
| Auth | NextAuth.js v5 (Credentials + Google OAuth) |
| Database (legacy) | MongoDB Atlas + Mongoose 8 (being migrated to Go backend) |
| Forms | react-hook-form + Zod |
| Rich Text | Tiptap v3 (full editor with 10+ extensions) |
| Email | Resend API (OTP codes, password resets) |
| 3D / Visuals | Three.js, @react-three/fiber, @shadergradient/react |
| Notifications | Sonner (toasts) |
| Book APIs | Google Books, ISBNdb, Open Library |
| Typography | Adobe Fonts (CoFo Glassier, Helvetica, El Paso, Brooklyn Heritage Script) |

### Page & Route Structure

```
app/
├── page.tsx                     # Home (Pinterest masonry grid when authed, carousels when public)
├── b/[slug]/                    # Book detail pages
├── u/[username]/                # User profile pages
│   └── lists/[listId]/          # Reading list detail pages
├── activity/                    # Activity feed
├── recommendations/             # Personalized recommendations page
├── auth/                        # Sign in / sign up pages
├── choose-username/             # Post-registration username selection
├── onboarding/                  # Preference questionnaire
├── profile/                     # Auth-gated profile redirect
├── sitemap.ts                   # Dynamic sitemap (SEO)
└── api/
    ├── auth/                    # NextAuth + OTP login + password reset
    ├── users/[username]/        # User CRUD, books, lists, diary, follows, activities
    ├── books/                   # Search, public carousels, personalized, by-author
    ├── recommendations/         # Recommendation engine endpoints
    ├── onboarding/              # Genre list, status check
    ├── events/                  # Client-side event tracking
    └── newsletter/              # Email subscription
```

### Key Features

#### Book Management
- **Bookshelf** — read books in 3-column grid with pagination, sorted by most-recently finished
- **TBR (To-Be-Read)** — "the procrastination wall", with notes and priority
- **Currently Reading** — track page progress in real time
- **Likes** — liked books in paginated grid
- **Favorites** — curated top-4 favorites
- **Hybrid Search** — DB-first (10–50ms), falls back to Google Books API; debounced at 300ms

#### User Profiles
- Dynamic `/u/[username]` routes (SEO-friendly, server-rendered)
- Profile sections: Bookshelf, Diary, Authors, Lists, TBR, Likes
- Owner-aware copy (e.g., "Your Library, organised" vs "{username}'s library")
- Edit Profile side-sheet modal — username, bio, gender, pronouns, birthday, links
- Profile link sharing via clipboard

#### Social Features
- Asymmetric follow system (like Twitter/Letterboxd)
- Activity feed tracking 8+ event types (book added, list created, list shared, book shared, diary liked, access granted, etc.)
- "Updates" header indicator — real-time poll for new friend activity
- Share books and lists directly with specific followers
- Author discovery — author cards with 3-book cover grids, per-author dialog

#### Reading Lists
- Create public or private ("secret") lists
- Private lists with username-based access management (grant/revoke)
- 3-column card grid showing 3-book cover thumbnails
- Full CRUD: edit, add/remove books, delete, save other users' lists

#### Recommendation Engine
- Multi-signal rule-based engine with Maximal Marginal Relevance (MMR) diversity injection
- Signals: ratings, likes, reads, searches, friend activity, time-of-day, reading velocity
- A/B testing framework for algorithm variants, caching with TTL
- Explainable recommendations ("Because you read X")
- Personalized home-page carousels + dedicated `/recommendations` page

#### Authentication

| Method | Details |
|---|---|
| Email + Password | bcrypt hashing, Zod validation, username uniqueness check |
| Google OAuth | Optional, seamless account linking |
| OTP Login | 6-digit code via email (Resend), 10-min expiry, rate-limited (3/hour) |
| Password Reset | SHA-256 hashed token, 1-hour expiry, email enumeration protection |

#### Tiptap Rich Text Editor
Full-featured diary editor: Bold, Italic, Underline, Strikethrough, Code, Headings H1–H3, Blockquotes, lists, text alignment, highlighting (multicolor), Subscript, Superscript, custom link dialog, Undo/Redo.

#### SEO
- Dynamic `sitemap.xml`, configured `robots.txt`, JSON-LD Schema.org structured data
- Open Graph + Twitter Card meta tags, canonical URLs
- Performance targets: FCP < 1.5s, LCP < 2.5s, CLS < 0.1

---

## iOS App (SwiftUI)

**Repository:** `paperboxd-ios`

A native SwiftUI app consuming the Go backend's mobile API. Built with MVVM architecture and a custom bottom dock navigation system.

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | SwiftUI |
| State Management | `@ObservableObject` + `@EnvironmentObject` (AppState) |
| Networking | `URLSession` + async/await (`APIClient.swift`) |
| Auth Storage | Keychain (`KeychainManager`) |
| Auth | JWT Bearer tokens — 30-day lifetime, background refresh |
| Google Auth | Google Sign-In SDK (`GoogleOAuth.swift`) |

### App Screens & Navigation

Navigation is a custom bottom dock (`CustomDock`) with 6 tabs:

| Tab | Icon | Feature |
|---|---|---|
| Home | `house` | `HomeView` — masonry book grid + activity feed |
| Search | `magnifyingglass` | `SearchView` — books + users |
| Leaders | `trophy` | `LeaderboardView` — global, friends, dimension-based |
| Write | `pencil.circle.fill` | `WriteView` — diary entry composer (full-screen cover) |
| Diary | `book.closed` | `DiaryView` — personal reading diary |
| You | `person.crop.circle` | `ProfileView` — own profile |

### Feature Directory

```
Features/
├── Auth/         # LoginView, RegisterView, OTPView, AuthViewModel
├── BookDetail/   # Book detail with similar books, friends reading, reviews
├── Diary/        # Diary list + entry detail
├── Home/         # HomeView (masonry grid), HomeViewModel, NotificationsView
├── Leaderboard/  # Global + friends leaderboard with dimension filters
├── Onboarding/   # Genre selection, username pick, avatar upload
├── Profile/      # ProfileView, ProfileHeaderView, ProfileGridView, FollowListView
├── Search/       # SearchView (books + users), SearchViewModel
├── Share/        # Share sheet integration
├── Splash/       # SplashView (2.5s minimum display)
└── Write/        # Diary entry composer
```

### App State Machine

```
AppScreen:
  .splash          →  bootstrap(): keychain → health check → token refresh
  .auth            →  LoginView / RegisterView / OTPView
  .onboarding(User)  →  Username selection → genre picks → avatar upload
  .main(User)        →  MainTabView (6-tab dock)
```

**Bootstrap flow:**
1. Read JWT from Keychain
2. Ping `/api/health` (unauthed) — if unreachable, fall back to cached user
3. Call `/api/mobile/auth/refresh` — re-mint token; on failure, route to `.auth`
4. Hold splash screen for at least 2.5s to prevent flicker on hot starts

### Models

```
Models/
├── User.swift             # Auth user (id, username, email, avatarURL, level, xp)
├── UserProfile.swift      # Full profile (bio, stats, pronouns, links)
├── Book.swift             # Book metadata (title, author, cover, isbn, genres)
├── BookDetailExtras.swift # Friends reading, reviews
├── BookshelfAction.swift  # Add/remove/update bookshelf status
├── CurrentlyReading.swift # Reading progress (page, percentage)
├── DiaryEntry.swift       # Diary entry (content, book ref, date)
├── ReadingList.swift      # List (id, title, books, privacy)
├── Activity.swift         # Activity feed event
├── Leaderboard.swift      # Leaderboard entry (rank, user, score)
├── Onboarding.swift       # Genre selection, preferences
└── Recommendation.swift   # Recommended book + reason
```

### Auth & Security

- JWT stored in iOS **Keychain** — never in UserDefaults
- Proactive refresh: if token has < 7 days remaining, refresh in background
- On `401 EXPIRED_TOKEN` → clear keychain, route to `.auth`
- On `401 INVALID_TOKEN` → clear keychain, force logout
- No cookies ever written or read — pure Bearer token auth

---

## Design System

**Repository:** `Paperboxd design elements`

A standalone design language specification covering colors, typography, spacing, and interactive states.

### Color Tokens (OKLCH)

PaperBoxd uses OKLCH for perceptually uniform colors, with a complete light/dark token set:

| Role | Light | Dark |
|---|---|---|
| Background | `oklch(1 0 0)` — pure white | `oklch(0.18 0 0)` — deep charcoal |
| Card / Elevated | `oklch(1 0 0)` | `oklch(0.22 0 0)` |
| Primary | `oklch(0.205 0 0)` — dark charcoal | `oklch(0.922 0 0)` — near-white |
| Border | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| Muted text | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| Destructive | `oklch(0.577 0.245 27.3)` — warm red | `oklch(0.704 0.191 22.2)` |

### Typography

| Role | Typeface | Fallback | Usage |
|---|---|---|---|
| Wordmark | `brooklyn-heritage-script` | Pinyon Script | Brand logo / hero |
| Editorial H2 | `cofo-glassier` | Playfair Display | Section headings |
| Display Accent | `el-paso` | Abril Fatface | Decorative display |
| Display Brand | `fabulosa` | Playfair Display | Landing page |
| Body Editorial | `helvetica` | Inter | Long-form copy |
| UI / Body | `Geist` | Inter, system-ui | All functional UI |
| Mono | `Geist Mono` | JetBrains Mono | Code, timestamps |

**Semantic type classes:** `.pb-wordmark`, `.pb-h1`, `.pb-h2`, `.pb-h3`, `.pb-body`, `.pb-body-editorial`, `.pb-muted`, `.pb-small`, `.pb-mono`

### Spacing & Radius

```
--radius:     0.625rem (10px)   base
--radius-sm:  0.375rem (6px)
--radius-md:  0.5rem   (8px)
--radius-lg:  0.625rem (10px)
--radius-xl:  0.875rem (14px)
--radius-2xl: 1rem     (16px)   cards
--radius-full: 9999px            pills
```

### Design Principles

1. **Social proof is the product.** Every individual action surfaces community context nearby.
2. **Restraint is the feature.** A sparse book cover grid is more inviting than a data-dense list.
3. **Literary without being precious.** Personality from typography hierarchy, not forced dark aesthetics.
4. **Earned familiarity.** Established patterns executed with precision to feel distinctly PaperBoxd.
5. **Discovery is the reward loop.** Every screen offers a credible next book or person to follow.

### HTML Prototypes

| Prototype | File |
|---|---|
| Home / Feed | `Pages/Home.html` |
| Landing Page | `Pages/Landing.html` |
| Profile Page (Rich) | `Pages/Profile Page Rich.html` |
| Book Detail Page | `Pages/Book Page.html` |
| Leaderboard System | `Pages/Leaderboard System.html` |
| Onboarding v2 | `Pages/Onboarding v2.html` |
| Search | `Pages/Search.html` |
| Loading States | `Pages/Loading.html` |

Plus interactive JSX device frames: `Components/ios-frame.jsx`, `Components/android-frame.jsx`, `Components/design-canvas.jsx`, `Components/tweaks-panel.jsx`

---

## Mobile API Contract

The Go backend exposes a dedicated mobile namespace at `/api/mobile/auth/*` with:

- **Long-lived JWT tokens** (30-day default) — no cookies
- **Pure Bearer auth** — `Authorization: Bearer <jwt>`
- **Consistent error shape:**
  ```json
  { "error": "Human readable message", "code": "SNAKE_CASE_CODE" }
  ```
- **Mobile pagination block:**
  ```json
  { "pagination": { "page": 1, "per_page": 20, "total": 123, "total_pages": 7 } }
  ```

### Auth Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/mobile/auth/login` | POST | Email + password login |
| `/api/mobile/auth/register` | POST | Registration (auto-generates username) |
| `/api/mobile/auth/otp/send` | POST | Send 6-digit OTP to email |
| `/api/mobile/auth/otp/verify` | POST | Verify OTP → issue JWT |
| `/api/mobile/auth/google` | POST | Google ID token verification → JWT |
| `/api/mobile/auth/refresh` | POST | Re-mint token (requires valid Bearer) |

### Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/params failed validation |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `INVALID_TOKEN` | 401 | Token parse or signature mismatch |
| `EXPIRED_TOKEN` | 401 | Token past `exp` |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Uniqueness violation (email/username taken) |
| `RATE_LIMITED` | 429 | Rate limit tripped — retry after 60s |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### Rate Limits

- **100 req/min** per Bearer token (or per IP if unauthenticated) in production
- **5,000 req/min** in development
- On `429 RATE_LIMITED`: back off ≥ 60s before retrying

Full mobile API contract: [`MOBILE_API.md`](MOBILE_API.md)

---

### Production Infrastructure

| Service | Provider | Spec | Cost |
|---|---|---|---|
| Go API | Railway | Hobby plan, Singapore | $5/month |
| PostgreSQL 16 | Railway | 5GB storage, 25 connections | included |
| Redis 7 | Railway | 256MB memory | included |
| Next.js Frontend | Vercel | Pro-tier CDN | separate |

| Surface | URL |
|---|---|
| Website | https://paperboxd.in |
| Backend API | https://paperboxd-backend-production-d9e0.up.railway.app |

## Documentation

| Document | Description |
|---|---|
| [`docs/API.md`](docs/API.md) | Full REST API reference |
| [`MOBILE_API.md`](MOBILE_API.md) | Mobile client API contract |
| [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md) | MongoDB → PostgreSQL migration details |
| [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) | Reflections on the migration process |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`ROADMAP.md`](ROADMAP.md) | Development roadmap |

---

## Contact

**Developer:** Hridyesh  
**Email:** paperboxd@gmail.com  
**Website:** [paperboxd.in](https://paperboxd.in)

---
