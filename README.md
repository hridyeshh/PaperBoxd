# PaperBoxd

> *Your reading universe, organized.*

PaperBoxd is a modern social book-tracking platform that transforms reading into a connected, discoverable experience — inspired by the simplicity and community spirit of Letterboxd, but built exclusively for books.

**Website:** [paperboxd.in](https://paperboxd.in) · **API:** [api.paperboxd.com](https://api.paperboxd.com) · **Contact:** contact@paperboxd.in

---

## Table of Contents

- [What is PaperBoxd?](#what-is-paperboxd)
- [Repository Map](#repository-map)
- [System Architecture](#system-architecture)
- [Backend (Go + PostgreSQL)](#backend-go--postgresql)
- [Discovery Engine](#discovery-engine)
- [Frontend (Next.js)](#frontend-nextjs)
- [iOS App (SwiftUI)](#ios-app-swiftui)
- [Android App (Jetpack Compose)](#android-app-jetpack-compose)
- [Design System](#design-system)
- [Mobile API Contract](#mobile-api-contract)
- [Deployment](#deployment)
- [Development Setup](#development-setup)
- [Documentation](#documentation)

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
| `paperboxd-backend` | REST API server — the only backend | Go 1.25, PostgreSQL 16 + pgvector, Redis 7 |
| `paperboxd` | Web frontend (this repo) | Next.js 15, React 19, TypeScript 5 |
| `paperboxd-ios` | Native iOS app | SwiftUI, Swift 5, iOS 17+ |
| `paperboxd-android` | Native Android app | Kotlin 2.0, Jetpack Compose, Hilt |
| `analytics-paperboxd` | Internal analytics dashboard | Next.js, Tailwind |
| `Paperboxd design elements` | Design system & UI specs | CSS tokens, HTML prototypes, JSX frames |

Each repository has its own README with the deep dive; this one is the map.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                           Clients                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │  Next.js Web   │  │  iOS (SwiftUI) │  │ Android (Compose)  │  │
│  │ (Vercel · CDN) │  │  (App Store)   │  │   (Google Play)    │  │
│  └───────┬────────┘  └───────┬────────┘  └─────────┬──────────┘  │
└──────────│───────────────────│─────────────────────│─────────────┘
           │          HTTPS / REST JSON · Bearer JWT │
           ▼                   ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Go Backend  (Railway · Singapore)               │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ Chi Router │  │  JWT Auth     │  │  Redis 7 Cache           │ │
│  │ 140+ routes│  │  bcrypt hash  │  │  soft dependency         │ │
│  └────────────┘  └───────────────┘  └──────────────────────────┘ │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ sqlc-gen'd │  │ Rate limiting │  │  Discovery engine        │ │
│  │ DB queries │  │ global + per- │  │  traits · ranking · feed │ │
│  │            │  │ route         │  │  search · Jazy           │ │
│  └────────────┘  └───────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │ SQL / pgx · HTTPS
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              Data & External Services                            │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ PostgreSQL 16│  │  Redis 7  │  │  ISBNdb  │  │ Google Books│  │
│  │ + pgvector   │  │ (Railway) │  │ Hardcover│  │ Open Library│  │
│  └──────────────┘  └───────────┘  └──────────┘  └─────────────┘  │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Claude       │  │  Cohere   │  │Cloudinary│  │   Resend    │  │
│  │ (scan, Jazy) │  │ embeddings│  │ (images) │  │  (email)    │  │
│  └──────────────┘  └───────────┘  └──────────┘  └─────────────┘  │
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
| Migrations | [golang-migrate](https://github.com/golang-migrate/migrate) (48 migration files, embedded, auto-applied on boot) |
| Vector search | [pgvector-go](https://github.com/pgvector/pgvector-go) for recommendations, vibe search and Jazy |
| AI | Anthropic Claude (Sonnet 4.6 for Scan & Jazy, Haiku 4.5 for book traits) · Cohere embeddings |
| Rate limiting | [go-chi/httprate](https://github.com/go-chi/httprate) — 100 req/min per token or IP, tighter per-route limits on auth, search, Jazy and scan |
| Config | [godotenv](https://github.com/joho/godotenv) |

### Project Layout

```
paperboxd-backend/
├── cmd/
│   ├── api/             # HTTP server entrypoint (main.go)
│   ├── backfill-embeddings/  # One-shot: embed the catalog
│   └── backfill-traits/      # One-shot: extract book traits + reader trait profiles
├── internal/
│   ├── auth/            # Register, login, OTP, refresh, logout, Google, Apple
│   ├── cache/           # Redis helpers
│   ├── config/          # Env config loader
│   ├── cron/            # Nightly jobs (signal, diary & trait profiles, taste overlaps, soft-delete purge)
│   ├── db/              # sqlc-generated models & queries (do not edit by hand)
│   ├── external/        # ISBNdb, Google Books, Hardcover, Cloudinary clients
│   ├── handler/         # Route handlers: users, books, lists, diary, leaderboard, wrapped, community, ...
│   ├── middleware/      # Authenticate, OptionalAuthenticate, RequireInternalSecret, RequireProfileAccess
│   ├── reqctx/          # Request context helpers
│   ├── service/         # Discovery engine (candidates, ranking, reasons, traits, feedback, feed,
│   │                    #   search, Jazy, taste overlap, intelligence, fusion), XP, events, mailer
│   ├── token/           # JWT creation & validation
│   ├── types/           # Shared request/response types & error helpers
│   └── util/            # Common utilities
├── migrations/          # 48 SQL migration pairs (source of truth for schema)
├── queries/             # sqlc query files (.sql)
├── docs/
│   ├── API.md           # Full REST API reference
│   ├── MIGRATION_REPORT.md
│   ├── LESSONS_LEARNED.md
│   └── PRIVACY_AUDIT.md
├── docker-compose.yml   # Local Postgres + Redis
├── sqlc.yaml            # sqlc configuration
├── Makefile             # Developer commands
├── MOBILE_API.md        # Mobile-specific API contract
├── CHANGELOG.md         # Version history
└── ROADMAP.md           # Development roadmap
```

### Database Schema (48 Migrations)

The PostgreSQL schema has evolved across 48 migrations, tracking every feature addition. Migrations are embedded in the binary and auto-applied on boot:

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
| 000029 | Profile banner URL |
| 000030–033 | Scan & Know — quota, source counts, Open Library counts, ratings average |
| 000034 | UGC moderation — blocks and reports |
| 000035 | Sign in with Apple user id |
| 000036 | Push device tokens |
| 000037 | Activity read state |
| 000038 | Follow requests (private profiles) |
| 000039–041 | Privacy pass — purge unearned ratings, drop private-diary embeddings, hash deletion-audit emails |
| 000042 | Canonical event taxonomy, anonymous events |
| 000043 | Reconcile `books.embedding` to `vector(1024)` |
| 000044 | Book traits (9 axes) + reader trait profiles |
| 000045 | Recommendation feedback — verdicts, reason codes, dismissals |
| 000046 | Taste overlap (taste twins) |
| 000047 | Recent (90-day) taste profile |
| 000048 | Fusion — one-time invites and per-pair story snapshots |

### API Endpoints (140+)

The API is versioned under `/api/v1`. Mobile-specific auth lives under `/api/mobile/auth/*`.

| Group | Coverage |
|---|---|
| `/api/health` | Connectivity probe (no DB round-trip) |
| `/api/mobile/auth/*` | Mobile login, register, OTP, Google, Apple, token refresh |
| `/api/mobile/users/me` | Profile patch, push device-token register / deregister |
| `/api/v1/auth/*` | Web auth — register, login, refresh, OTP, password reset, Google |
| `/api/v1/users/me` | Current user, onboarding, daily open, XP & leaderboard stats, referrals, **Wrapped**, **taste dashboard**, visibility, follow requests, avatar/banner upload, account deletion |
| `/api/v1/users/suggested` | Readers to follow, each with a reason |
| `/api/v1/users/{username}` | Profiles (private-aware), follow/unfollow, block, bookshelf, diary, lists, favorites, TBR, DNF, authors, reading progress & activity, streak |
| `/api/v1/books/*` | Search, detail, by slug / author, like, share, reviews, **social proof**, **"why you'll like this" fit** |
| `/api/v1/recommendations/*` | Home, **feed modules**, similar books, **verdict feedback**, **taste twins**, **surprise me** |
| `/api/v1/search`, `/search/vibe`, `/search/context(s)` | Conversational search with refinements, semantic vibe search, situation presets |
| `/api/v1/jazy` | Jazy concierge (mobile apps) |
| `/api/v1/scan/analyze` | Scan & Know compatibility score (mobile apps) |
| `/api/v1/fusions/*` | Fusion — one-time invite links (mint, preview, accept, cancel), your Fusions, the story, delete |
| `/api/v1/community` | Public snapshot — trending, activity, lists, readers |
| `/api/v1/activities/*`, `/leaderboard/*`, `/authors/info` | Activity feeds, leaderboards, author info |
| `/api/v1/reports`, `/events`, `/newsletter` | Moderation reports, analytics events, email subscription |
| `/api/v1/analytics/*`, `/admin/*` | Operator-only, `X-Internal-Secret` |

Full reference: `docs/API.md` in the backend repo.

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
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | ≥32 character secret for signing JWTs |
| `REDIS_URL` | recommended | Redis address or full `redis://` URL (default: `localhost:6379`) |
| `PORT` | — | HTTP listen port (default: `8080`) |
| `ENVIRONMENT` | — | `development` or `production` |
| `GOOGLE_BOOKS_API_KEY` / `ISBNDB_API_KEY` | — | Book metadata sources |
| `HARDCOVER_API_TOKEN`, `BRAVE_API_KEY` | — | Scan community stats and sentiment |
| `ANTHROPIC_API_KEY` | — | Scan scoring, Jazy voice, vibe reasons, trait extraction |
| `COHERE_API_KEY` | — | Embeddings for recommendations and semantic search |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | — | Transactional email (OTP) |
| `CLOUDINARY_*` | — | Avatar / banner uploads |
| `GOOGLE_OAUTH_ALLOWED_AUDIENCES` | for Google sign-in | Accepted Google client IDs — fails closed when empty |
| `APPLE_ALLOWED_AUDIENCES` | — | Accepted Apple audiences (default: iOS bundle ID) |
| `INTERNAL_SECRET` | for analytics/admin | Shared secret for `/analytics/*` and `/admin/*` |
| `SCAN_UNLIMITED_EMAILS` | — | Accounts exempt from the scan quota |
| `RATE_LIMIT_PER_MINUTE` | — | Default `100` prod, `5000` dev |
| `CORS_ALLOWED_ORIGINS` | — | Browser allowlist for CORS |
| `TOKEN_EXPIRY_MOBILE` | — | Mobile JWT lifetime (default: 30 days) |
| `AUTO_MIGRATE` | — | Apply embedded migrations on boot (default: on) |

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

## Discovery Engine

Built in seven releases in September 2026 (R0–R7), all in `paperboxd-backend/internal/service`. Every client renders the same answers. Full build log: [`docs/DISCOVERY_ENGINE.md`](docs/DISCOVERY_ENGINE.md).

| Release | What it added |
|---|---|
| **R0 Instrument** | Canonical event taxonomy, anonymous acquisition events, retention cohorts, and a discovery funnel per reason type (impression → open → save → start → finish → 4★ → diary → share) |
| **R1 Book traits** | Claude Haiku scores every book on nine axes (pacing, darkness, emotional intensity, …); readers get trait preferences from their ratings |
| **R2 Negative taste** | Verdicts (*loved · maybe · not for me · not now · already read*) and reason codes that train only their own axis; early abandonment counts as a rejection |
| **R3 Ranking 2.0** | Human confidence tiers, real content diversity caps (MMR is gone), hidden gems, interleaved exploration that names what it stretches away from |
| **R4 Search 2.0** | Deterministic intent parser + Redis sessions — "like Murakami, under 300 pages", then "shorter" refines instead of restarting |
| **R5 Jazy 2.0** | The concierge: may ask one clarifying question, ranks through search, and Claude writes the voice from everything the reader has shelved, rated, abandoned and (non-private) diaried |
| **R6 Feed & social** | Server-titled home modules, taste twins (readers who rate like you), "people like you loved this" |
| **R7 Intelligence** | Surprise Me (five modes), taste dashboard, situation presets ("I have a long flight"), "why you'll like this" on book pages |
| **Fusion** (2026-09-13) | Two readers' shelves side by side from a one-time link — the Spotify Blend shape. A ten-page story (score, both loved, agree, split, shelves, the pick, wildcard, verdict) built from both taste profiles, seen from each reader's side. Web hosts the join page; the story plays in the apps. See [`docs/FUSION.md`](docs/FUSION.md) |

Every recommendation carries a reason sentence gated on its own evidence — "because you loved *X*" only when the book really sits near *X*, "maya loved this" only when she rated it 4★+. **The engine's flags default off**, and trait-driven features stay empty until the trait backfill has run.

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
| Auth | NextAuth.js v5 (Credentials + Google OAuth), bridged to Go backend JWTs |
| Data | The Go backend, via thin `app/api/*` proxies (`lib/api/client.ts`) |
| Database (legacy) | MongoDB + Mongoose 8 — only the credentials provider, account deletion and legacy mobile routes remain |
| Forms | react-hook-form + Zod |
| Rich Text | Tiptap v3 (full editor with 10+ extensions) |
| Email | Resend API (OTP codes, password resets) |
| 3D / Visuals | Three.js, @react-three/fiber, @shadergradient/react |
| Notifications | Sonner (toasts) |
| Share images | `@vercel/og`, `html-to-image` |
| Analytics | `lib/analytics.ts` — canonical event names, `anon_id` + `session_id` |
| Book APIs | Google Books, ISBNdb, Open Library |
| Typography | Adobe Fonts (CoFo Glassier, Helvetica, El Paso, Brooklyn Heritage Script) |

### Page & Route Structure

```
app/
├── page.tsx                     # Landing (signed out) · home with feed modules (signed in)
├── b/[slug]/                    # Book detail pages
├── u/[username]/                # User profile pages (taste dashboard on your own)
│   └── lists/[listId]/          # Reading list detail pages
├── authors/[authorName]/        # Author pages
├── fusion/[token]/              # Fusion join page — sign in → Fuse → "Open in the app"
├── activity/                    # Activity feed
├── feed/                        # Feed view
├── lists/                       # Discover lists other readers made
├── leaderboard/                 # Global and friends leaderboards
├── search/                      # Library + vibe search with refinement chips
├── recommendations/             # Personalized recommendations page
├── auth/                        # Sign in / sign up, OTP login, forgot / reset password
├── choose-username/, setup-profile/, onboarding/
├── faq/, case-studies/          # FAQ, research
├── privacy/, terms/             # Legal (components/legal/legal-doc.tsx)
├── sitemap.ts                   # Dynamic sitemap (SEO)
└── api/                         # Thin proxies to the Go backend, plus web-only routes:
    ├── auth/                    # NextAuth + OTP login + password reset (sends the email)
    ├── books/[id]/{fit,social,rating,reviews,share,diary}
    ├── recommendations/{feed,feedback,similar,surprise,twins}
    ├── fusions/invites/[token]  # Invite preview + accept proxies
    ├── search/                  # Conversational search proxy
    ├── users/me/{taste,visibility,follow-requests}
    ├── community/, home/, leaderboard/, lists/, authors/, onboarding/
    ├── import/goodreads/        # Goodreads CSV import
    ├── og/share/                # Open Graph share-card images (@vercel/og)
    ├── events/                  # Client analytics
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
- Profile sections: Bookshelf, Diary, Authors, Lists, TBR, Likes — "books read" is no longer capped at 100
- Owner-aware copy (e.g., "Your Library, organised" vs "{username}'s library")
- Edit Profile side-sheet modal — username, bio, gender, pronouns, birthday, links
- Profile link sharing via clipboard

#### Social Features
- Asymmetric follow system (like Twitter/Letterboxd)
- Activity feed tracking 8+ event types (book added, list created, list shared, book shared, diary liked, access granted, etc.)
- "Updates" header indicator — real-time poll for new friend activity
- Share books and lists directly with specific followers
- Private profiles and follow requests (block and report are in the apps)
- Author discovery — author cards with 3-book cover grids, per-author dialog

#### Reading Lists
- Create public or private ("secret") lists
- Private lists with username-based access management (grant/revoke)
- 3-column card grid showing 3-book cover thumbnails
- Full CRUD: edit, add/remove books, delete, save other users' lists

#### Discovery on the Web
Everything below is served by the backend's [Discovery Engine](#discovery-engine); the web renders it.
- **Home feed modules** (`hooks/use-feed.ts`) above the legacy rails, deduped against them, with the server's time-of-day greeting in the reader's zone ("Good evening, hridyesh.")
- **Reason + confidence** on every recommendation card; reason chips colour-coded by type (because you loved, TBR-similar, trait, recent, hidden gem, trending, people like you)
- **Verdict + reason chips** in place on carousel cards (`components/ui/book/rec-feedback.tsx`) — *not for me · too slow*, and the reason trains only its own axis
- **Surprise Me** on home (`surprise-me.tsx`) and a **taste dashboard** on your own profile (`taste-dashboard.tsx`)
- **"Why you'll like this"** card on book pages (`/api/books/[id]/fit`) — hidden when nothing personal applies
- **Conversational search**: the Vibe tab keeps a session, shows a "Refined: like Murakami · under 300 pages" line, and offers one-tap refinements — Shorter · Darker · Lighter · More emotional · Less weird · No romance
- **Impressions counted on visibility**, not render (`hooks/use-rec-impression.ts`)

#### Community & Reading Identity
- **Landing page shows the real community** — trending books, live activity, lists and readers from `/api/v1/community`, no fabricated numbers
- **Discovery shelves** — trending this week, rising, most saved — from real shelf data
- **Social proof on book pages** (`use-book-social.ts`) — Paperboxd readers, friends who read it, lists it's on, diary notes
- **Reading identity line** on profiles and a prompted **Top 4**
- **Readers to follow** on home and in onboarding, each suggestion explaining itself
- **Private profiles** with follow requests (`follow-requests-panel.tsx`)
- **Share cards** (`book-share-card.tsx`) and OG images for shared links

#### Fusion (web side)
- `/fusion/[token]` is the **join page** only — sign in if needed, tap Fuse, then "Open in the app". Own / used / expired / unavailable links each get their own state. The story itself plays in iOS and Android; there is no web player.
- `pending-fusion.tsx` remembers the token across sign-in and sends the reader back from `/`.
- `public/.well-known/apple-app-site-association` (served as JSON via a `next.config.ts` header) makes `paperboxd.in/fusion/*` a universal link for the iOS app. Android's `assetlinks.json` still carries placeholder fingerprints.
- `fusion_joined` activities render in the Updates feed (`lib/activity-transform.ts`).

#### Onboarding & Import
- Onboarding: username → genres → **books you love** → **readers to follow** → aha
- **Goodreads import** that reports partial failures honestly instead of claiming success
- One `empty-state` component used everywhere, with a rule for what an empty state must offer

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

A native SwiftUI app consuming the Go backend's mobile API. MVVM with a root state machine, zero third-party dependencies, and a light "paper and ink" brutalist look on every screen.

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | SwiftUI, iOS 17+ (native Liquid Glass tab bar on iOS 26) |
| State Management | `ObservableObject` ViewModels (`@MainActor`) + root `AppState` |
| Networking | `URLSession` + async/await in an `actor` (`APIClient.swift`) |
| Auth Storage | Keychain (`KeychainManager`) |
| Auth | JWT Bearer tokens — 30-day lifetime, re-minted on every launch |
| Google Auth | In-house Authorization Code + PKCE via `ASWebAuthenticationSession` — no SDK |
| Dependencies | None — no Swift packages |
| Deep links | `applinks:paperboxd.in` + `paperboxd://` scheme (Fusion) |

### App Screens & Navigation

Four dock tabs plus a floating **Pip** button:

| Tab | Icon | Feature |
|---|---|---|
| Home | `house` | `HomeView` — greeting, currently reading, friends' activity, feed modules, For you, discovery shelves |
| Search | `magnifyingglass` | `SearchView` — books + users |
| Leaderboard | `trophy` | `LeaderboardView` — global, friends, dimension-based |
| You | avatar | `ProfileView` — XP ring, sections, Monthly Wrapped entry |
| **Pip** | floating | **Ask Jazy** — describe a feeling, get a deck; Scan & Know opens from its camera |

### Feature Directory

```
Features/
├── Auth/         # Login, Register, OTP, legal sheets
├── Author/       # Author page — portrait, Wikipedia blurb, books
├── BookDetail/   # Book detail, social proof, progress, reviews, similar books
├── Diary/        # Diary list + entry detail
├── Fusion/       # Fusion — join, analyzing, 10-page story player, profile section
├── Home/         # HomeView, feed modules, friend activity popup, notifications
├── Jazy/         # Ask Jazy — concierge, results deck, taste gate
├── Leaderboard/  # Global + friends leaderboard with dimension filters
├── Moderation/   # Report content, block readers
├── Onboarding/   # Username, genres, books you love, readers to follow, aha
├── Profile/      # Profile, XP ring + level sheet, lists, heatmap, share, edit
├── Scan/         # Scan & Know — barcode scanner, three SpriteKit games, score reveal
├── Search/       # Books + users
├── Settings/     # Privacy, account, Goodreads import, delete account
├── Share/        # Book share cards
├── Splash/       # Splash with bundled video
├── Wrapped/      # Monthly Wrapped — 14-chapter story player
└── Write/        # Diary entry composer
```

### App State Machine

```
AppScreen:
  .splash            →  bootstrap(): keychain → health check → token refresh
  .auth              →  Login / Register / OTP
  .onboarding(User)  →  username → genres → books → readers → aha
  .main(User)        →  MainTabView (4 tabs + Pip)
```

**Bootstrap flow:**
1. Read JWT from Keychain
2. Ping `/api/health` (unauthed) — if unreachable, fall back to cached user
3. Call `/api/mobile/auth/refresh` — re-mint token; on failure, route to `.auth`
4. Hold the splash at least 4.6s (the splash clip plus its fade)

### Auth & Security

- JWT stored in iOS **Keychain** — never in UserDefaults
- Token re-minted on every launch via `/api/mobile/auth/refresh`
- Any `401` → clear keychain, post `.paperboxdSessionExpired`, route to `.auth`
- No cookies ever written or read — pure Bearer token auth
- **Sign in with Apple** is supported by the backend but not wired in the app yet — a ship blocker while Google sign-in is offered

---

## Android App (Jetpack Compose)

**Repository:** `paperboxd-android`

A port of the iOS app, not an independent design — screen-for-screen parity is the goal, and the source names each file's iOS twin in its KDoc. Where Android convention argues otherwise (the dock, Credential Manager), Android wins and the divergence is commented.

### Tech Stack

| Layer | Technology |
|---|---|
| UI | Jetpack Compose (Material 3), single Activity, one light theme |
| Architecture | MVVM + repositories returning `Result<T>` + root `AppState` |
| DI | Hilt |
| Networking | Retrofit + OkHttp + Gson (79 endpoints) |
| Auth Storage | `EncryptedSharedPreferences` |
| Google Auth | Credential Manager (`GetSignInWithGoogleOption`) |
| Camera | CameraX + ML Kit barcode scanning |
| SDK | `minSdk` 26, `targetSdk` / `compileSdk` 36 |

### Screens

Same four dock tabs and Pip → Ask Jazy as iOS. Screens: auth · author · book detail · diary · Fusion · home · Jazy · leaderboard · onboarding · profile · Scan & Know (Compose `Canvas` ports of the SpriteKit games at a fixed 60 Hz) · search · settings · splash · Wrapped · write. Rec verdicts are a long-press `DropdownMenu`; share cards can also be saved to the gallery.

**Release:** signs from a git-ignored `keystore.properties`, which still holds placeholder values — a real upload key is needed before a Play release.

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

### Mobile Palette (Brutalist Paper)

Both native apps draw one light "paper and ink" kit on every screen, from the *Home - Brutalist Mobile* prototype. iOS (`BrutalKit`, asset catalog light appearance) and Android (`Color.kt`, `BrutalLightKit`) carry identical hexes:

| Token | Hex | Role |
|---|---|---|
| Paper | `#F2EDE1` | Background |
| Card | `#FDFBF6` | Elevated surfaces |
| Ink | `#151513` | Text, primary action plates |
| Muted | `#6A6456` | Secondary text, eyebrows |
| Accent | `#D23B26` | Progress fills, marks |
| Crimson | `#C0271C` | Primary CTA, destructive |

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
| `/api/mobile/auth/apple` | POST | Apple identity token verification → JWT |
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
- **Per-route:** 10/min on auth, Jazy and scan; 20/min on search
- On `429 RATE_LIMITED`: back off ≥ 60s before retrying

Full mobile API contract: `MOBILE_API.md` in the backend repo.

---

## Deployment

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

Backend schema changes ship with the binary — migrations auto-apply on boot. Discovery features are gated by rows in the backend's `feature_flags` table, all off by default; see the backend README for the rollout order.

---

## Development Setup

**Web (this repo):**

```bash
nvm use                 # Node 22 (.nvmrc)
npm install
cp .env.example .env.local
npm run dev             # next dev --turbopack on http://localhost:3000
```

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_API_URL` | The Go backend base URL — point at `http://localhost:8080` for local backend work |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | NextAuth sessions |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `MONGODB_URI` | Legacy credentials sign-in path only (see below) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | OTP and password-reset email |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_*` | Avatar uploads |
| `ISBNDB_API_KEY` | ISBNdb lookups in web routes |
| `INTERNAL_SECRET` | Operator-only proxies |

`npm run build` and `npm run lint` are the checks. There is no web test suite; type-check with `npx tsc --noEmit`.

**Legacy data layer.** Almost every web API route is now a thin proxy to the Go backend. A few paths still touch MongoDB through Mongoose — the NextAuth credentials provider, account deletion, and the legacy `app/api/mobile/v1/*` routes the native apps no longer call. Remove them with the Mongo dependency, not one at a time.

**Backend, iOS, Android:** see each repository's README — `make docker-up && make dev` for the backend, open `PaperBoxd.xcodeproj` for iOS, `./gradlew installDebug` for Android.

---

## Documentation

**This repo:**

| Document | Description |
|---|---|
| [`docs/DISCOVERY_ENGINE.md`](docs/DISCOVERY_ENGINE.md) | Discovery engine R0–R7 build log, gap passes, flags, rollout order |
| [`docs/FUSION.md`](docs/FUSION.md) | Fusion build log — flow, backend, web, iOS, Android, open decisions |
| [`docs/LAUNCH_AUDIT.md`](docs/LAUNCH_AUDIT.md) | Pre-launch audit across web, backend, iOS, Android and analytics |
| [`docs/LAUNCH_CHANGELOG.md`](docs/LAUNCH_CHANGELOG.md) | Launch work log, phase by phase |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Version history |
| [`ROADMAP.md`](ROADMAP.md) | Development roadmap |
| [`PRODUCT.md`](PRODUCT.md) | Product vs. brand register, design context |

**Backend repo:** `docs/API.md` (REST reference), `MOBILE_API.md` (mobile contract), `docs/MIGRATION_REPORT.md`, `docs/LESSONS_LEARNED.md`, `docs/PRIVACY_AUDIT.md`, and the canonical privacy policy and terms.

---

## Contact

**Email:** contact@paperboxd.in  
**Developer:** Hridyesh · hridyesh@paperboxd.in  
**Website:** [paperboxd.in](https://paperboxd.in)

---
