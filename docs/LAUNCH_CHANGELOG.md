# Launch work log

Companion to `LAUNCH_AUDIT.md`. One entry per significant change: what, why, repo, user problem, how it's measured, compatibility. Nothing here is committed by Claude — the owner commits.

## 2026-09-11 — P0 fixes (audit #1–3)

### Removed XP test routes — `paperboxd-backend`
- **What:** deleted `/api/v1/test/award-xp`, `/api/v1/test/xp-info`, `internal/handler/xp_debug.go`.
- **Why:** any signed-in user could grant themselves XP → fake leaderboard/streak/referral rewards.
- **Compat:** no client called them (grep across web/iOS/Android = 0).

### `/api/v1/admin/*` now operator-only — `paperboxd-backend`, `paperboxd`
- **What:** `/admin` route group uses `RequireInternalSecret` (same gate as `/analytics`) instead of a user JWT. Web `DELETE /api/cleanup/books` fails closed unless both `CLEANUP_SECRET` and `INTERNAL_SECRET` are set, and forwards `X-Internal-Secret`. `adminApi` removed from `lib/api/endpoints.ts`.
- **Why:** there is no admin role; a Bearer token proved nothing.
- **Compat:** any cron hitting `/api/cleanup/books` must now send `Authorization: Bearer <CLEANUP_SECRET>` and the web deploy needs `INTERNAL_SECRET` (it already has it for Google auth sync).

### `CleanupStaleBooks` no longer deletes user data — `paperboxd-backend`
- **What:** `queries/books.sql` now `NOT EXISTS` against `bookshelf`, `likes`, `favorites`, `list_books`, `reading_log`, `diary_entries`, `activities`. Regenerated `internal/db/books.sql.go`.
- **Why:** a book living only in a list or Top 4 was cascade-deleted after 15 idle days.
- **Compat:** none; fewer rows deleted.

### sqlc drift repaired (audit B-13) — `paperboxd-backend`
- `sqlc generate` now runs clean; `RecordAccountDeletionParams.EmailHash` is `pgtype.Text` and the one caller (`handler/users.go`) was updated.

## 2026-09-11 — Phase 1: first 60 seconds (web + backend)

### Onboarding: username → genres → **books you love** → **readers to follow** → aha — `paperboxd`
- **What:** `components/ui/onboarding/onboarding-flow.tsx`. The "tempo" step is gone (its value was never persisted anywhere). In its place:
  - **Books you love** — search (`/api/books/search`) plus a 12-book suggestion grid from `/api/onboarding/aha` (new `limit` param). Up to 4 picks; each is saved as a favourite (Top 4) **and** a `read` shelf entry, because `read` is the signal the recommendation engine ranks on (`recommendation_service.go` reads `bookshelf.status IN ('read','liked','pending')`, not `favorites`). Goodreads CSV import moved here as the secondary path and runs in the background.
  - **Readers to follow** — `GET /api/onboarding/suggested-readers` → Go `GET /api/v1/users/suggested`. One-tap follow via the existing follow route. Skippable.
  - Genres are saved as soon as chosen, so suggestions and the aha reveal are genre-aware, and a reader who leaves mid-flow is still onboarded.
  - Aha reveal excludes books already picked.
- **User problem:** home was empty after onboarding (no follows → no feed; genre-only → generic recs). Now the feed and recs have real signal before the reader ever sees home.
- **Measured:** `onboarding_started`, `book_selected_during_onboarding` (metadata: title, source=search|suggested), `person_followed_during_onboarding` (username, reason), `onboarding_completed` (books_selected, people_followed, genres, seconds, aha=saved|skipped|none|error). `first_book_added` / `first_follow` / `first_search` / `first_recommendation_click` are **derived**, not emitted: `MIN(created_at)` per user over `book.added_to_shelf` / `user.followed` / `book.searched` / `click` — wired up in the Phase 16 retention endpoint.
- **Compat:** `/api/onboarding/aha` still defaults to 5 books; `limit` is optional.

### Client analytics helper — `paperboxd`
- **What:** `lib/analytics.ts` `track(name, metadata?, bookId?)` → existing `/api/events/track` (which had zero callers). Fire-and-forget, `keepalive`, typed event-name union.
- **Naming:** new events are `snake_case`. Existing server events are dotted (`book.viewed`); Phase 16 migrates them to one convention.

### `GET /api/v1/users/suggested` — `paperboxd-backend`
- **What:** `queries/users.sql` `SuggestedUsers` + `handler/users.go` `Suggested`. Public, non-deleted, not self, not followed, not blocked either way, has ≥1 shelf row. Ranked by favourite-genre overlap with the caller → live read count → followers. Returns `reason` ("Also into fantasy and horror" / "Has read 42 books" / "Active reader") built server-side so all three clients show the same line.
- **Why:** there was no follow-suggestion endpoint at all.
- **Compat:** additive. Auth required. `limit` 1–20, default 8.
- **Verification:** sqlc parsed the query against the migration schema; `go build/vet/test` pass. Not executed against a live DB in this session (no local Postgres server installed).

### `profile_viewed` event — `paperboxd-backend`
- **What:** `GetByUsername` emits `profile_viewed` (metadata: profile_user_id, is_public, is_following) when an authenticated viewer looks at someone else's profile. Goroutine, same pattern as `book.viewed`.
- **Why:** Phase 16 needs profile views / social metrics; nothing recorded them.

### Landing CTA copy — `paperboxd`
- "Start saving your books" → "Join the readers" (both placements). Hero already covers track / diary / friends; the closing CTA was the only tracker-only line.

### iOS onboarding parity — `paperboxd-ios`
- **What:** `OnboardingViewModel` steps are now `username → genres → books → readers → ahaLoading → ahaReveal`. New `BooksStepView` (search + suggestion grid + 4-slot tray) and `ReadersStepView` in `OnboardingSteps.swift`; `TempoStepView` and `ReadingTempo` removed. Picks → `POST bookshelf {status:read}` + `POST favorites`, in a task group. Readers from `Endpoints.suggestedUsers`. Aha reveal gains "Skip to home" and excludes picked books. `RecBook` gained `init(searchResult:)`.
- **Events:** new `Network/Analytics.swift` (`Analytics.track`, `source: "mobile"`) emits the same four onboarding events with the same metadata as web.
- **DAU fix (audit A-04):** `AppState.recordDailyOpen()` posts `/users/me/daily-open` when the scene becomes active or the app lands on `.main`, guarded to once per UTC day.
- **Verified:** `xcodebuild -scheme PaperBoxd -destination 'generic/platform=iOS Simulator'` → BUILD SUCCEEDED. Not run on a device/simulator.

### Android onboarding parity — `paperboxd-android`
- **What:** `OnboardingStep { Username, Genres, Books, Readers, AhaLoading, AhaReveal }`. `BooksStep` / `PicksTray` / `PickSearchField` / `PickCover` / `ReadersStep` / `ReaderRow` in `OnboardingScreen.kt`; `TempoStep` and `ReadingTempo` removed. Same persistence as iOS via `BookRepository.addFavorite` (new) + `addToBookshelf`. `UserRepository.suggested()` / `dailyOpen()` (new). `ApiService`: `suggestedUsers`, `addFavorite`, `dailyOpen`.
- **Events:** new `AnalyticsRepository.track()`; `TrackEventBody` now sends `source = "mobile"` (previously omitted → backend defaulted to `web`, so existing `book_impression` rows from Android are mislabelled as web).
- **DAU fix:** `AppState.recordDailyOpen()` from `MainActivity.onStart` and on arrival at `AppDestination.Main`; once per UTC day.
- **Verified:** `./gradlew assembleDebug --offline` exit 0. No device/emulator run.

### Favourites race fixed (found in onboarding QA) — `paperboxd-backend` + all clients
- **Symptom:** picked 4 books in onboarding; profile Top 4 showed only the first.
- **Root cause:** `AddToFavorites` did count → pick free slot → insert with no serialisation. Four parallel requests all saw zero rows, all chose `display_order = 1`, three died on `UNIQUE(user_id, display_order)`. Clients swallow that error by design (onboarding must not block), so it surfaced only on the profile.
- **Fix:** `handler/favorites.go` resolves the book first (external API, outside any lock), then runs count/slot/exists/insert inside a transaction holding `pg_advisory_xact_lock(hashtext('favorites:<user_id>'))`. Fixes every caller, not just onboarding.
- **Also:** all three onboarding flows now send `display_order = pick index + 1`, so the Top 4 reads in the order the reader chose. Web favourite route forwards `displayOrder`; iOS `AddFavoriteBody`; Android `AddFavoriteBody.displayOrder`.
- **Verified:** `go build/vet/test`, `tsc`, `eslint`, `xcodebuild`, `gradlew assembleDebug` all green. Not re-run end-to-end on a device.

### Not done / follow-ups
- Landing hero chapter order still leads with tracking; revisit in the Phase 22 design pass if data says so.
- Existing Android `book_impression` rows carry `source = web`; correct going forward only.
- `SuggestedUsers` SQL still unexecuted against a live DB (see backend note above).

## 2026-09-11 — Phase 2: make Paperboxd feel alive

### Activity feed says what actually happened — `paperboxd-backend`
- **What:** shelf writes now emit a typed activity instead of one blanket `added_book`. `handler/bookshelf.go` gains `shelfActivityType(status)` → `finished_reading` / `started_reading` / `wants_to_read`, plus `recordBookActivity(...)` which every shelf path routes through. `MarkAsStarted`, `MarkAsFinished` and `UpdateBookshelfRating` emitted **nothing** before and now emit `started_reading`, `finished_reading` and `rated`; ratings ride along as `activities.metadata` `{"rating": n}` so a card can read "finished ★★★★★" without a second query.
- **Dedupe:** `ActivityExistsRecent` (new query) drops a repeat of the same `(user, book, type)` within 24 h, so re-saving a book from its page — or an import retry — does not repeat "finished Dune" for every follower. The guard lives in the shared helper, not in each caller.
- **User problem:** the feed said "added to their shelf" for finishing, starting and queueing alike, and finishing a book — the single most social act in the product — produced no feed row at all.
- **Measured:** `activities.activity_type` is now the retention-relevant verb; the Phase 16 event set is unchanged.
- **Compat:** `ActivityResponse` gains optional `metadata` and `book_cover`. Old iOS/Android builds fall through their `default` branch and render `finished reading` / `wants to read` — readable, just without stars. Existing `added_book` rows keep working; nothing was backfilled.

### `GET /api/v1/community` — `paperboxd-backend`
- **What:** new public endpoint (`handler/community.go`) returning one snapshot: `trending_books` (most shelved in 7 days, with the count), `popular_books` (fallback for a quiet week), `activity`, `lists`, `readers`. Cached 5 min in Redis, `Cache-Control: public, max-age=60`. Four new queries: `GetTrendingBooks`, `GetPublicActivities`, `GetPublicLists`, `GetPopularReaders`.
- **Privacy:** every query filters to `users.is_public = true` and `deleted_at IS NULL`; activity excludes anything with a `target_user_id` (those are notifications, not news) and any row whose list or diary entry is private. Lists need ≥3 books, readers need ≥1 shelf row.
- **Fairness:** `collapsePublicActivity` keeps one row per (user, object) and at most three per user, so one bulk import cannot own the feed. Covered by `community_test.go`.
- **Why:** nothing in the product could answer "what is happening here?" without an account, and a new account with no follows saw an empty social surface.
- **Compat:** additive, unauthenticated. Trending counts `bookshelf.created_at`, which the upsert leaves alone, so re-saves do not inflate it.

### Landing page shows the real community — `paperboxd`
- **What:** new `components/ui/landing/community.tsx` ("This week on Paperboxd") between the 3D section and the features: trending books with "shelved by N readers", public lists with real covers and owners, readers to follow with their Top 4. Each block renders only when it has enough real rows (books ≥4, lists ≥2, readers ≥3); the whole section returns `null` otherwise, so a quiet week shows nothing rather than a hollow shell.
- **Friends band:** now renders real public activity when ≥3 usable rows exist, each card linking to the book, list or profile. The illustrative cards remain as the pre-launch fallback only.
- **Plumbing:** `app/api/community/route.ts` proxy, `hooks/use-community.ts`, and `lib/activity-transform.ts` — the activity verb map extracted out of the following-activities route so the feed, the popover, the home rails and the landing strip all read the same vocabulary (and the new types get verbs everywhere at once).
- **User problem:** a logged-out visitor saw a beautiful page about a product with no visible people in it.

### Logged-in home answers "what's happening" and "what now" — `paperboxd`
- **What:** `components/ui/home/authenticated-home.tsx`:
  - **Trending this week** carousel from `/api/community`, deduped against the personalised rails.
  - **Around Paperboxd** rail — the friends rail's markup, fed by public activity, shown only once the friends fetch has returned with <3 rows. No follows no longer means no social surface.
  - **TBR nudge**: with nothing in progress, the hero offers a random untouched TBR book ("3 books waiting on your TBR → Start with *Piranesi*?") instead of "Nothing in progress"; with an empty TBR it offers search. `/api/home/stats` returns the new `tbrPick`.
  - **Truthful carousel copy**: "Your friends are liking these" → "Your friends are reading these" (the filter is read-or-liked, not liked); "Hand-picked picks we think you'll love" → "Picked for you from what you've read, rated and followed"; "Because you read… / Quiet, melancholy, a little odd" (a hardcoded mood claim about arbitrary books) → "Close to your taste".
  - Books carrying a Go slug now route by slug rather than by id-shape guessing.
- **Measured:** `home_viewed`, `tbr_nudge_clicked` (metadata: `tbr_count`) via `lib/analytics.ts`.
- **Also:** the activity page's book cards are clickable whenever the row carries a `book_id`, instead of only for five hardcoded types — the new verbs were unclickable dead cards.

### Mobile parity — `paperboxd-ios`, `paperboxd-android`
- **What:** both apps learn the real activity vocabulary (`FriendActivity.verbPhrase` / `ActivityItem.verbPhrase`, including ★ from `metadata.rating`) — the old maps listed `book_read` / `book_tbr` / `list_created`, which **the backend has never emitted**, so every card was falling through to the underscore-stripping fallback.
- Both homes gain a **Trending on Paperboxd** carousel and swap the friends rail for an **Around Paperboxd** rail when the reader follows nobody (`activityRail` / `ActivityRail`, same component, different copy).
- The recommendations carousel was titled "Your friends are liking these" on both platforms while showing the general recommendation pool; it is now "Picked from what you read."
- New `Models/Community.swift` / `CommunityResponse` + `Endpoints.community` / `ApiService.community()`.
- **Verified:** `xcodebuild -scheme PaperBoxd -destination 'generic/platform=iOS Simulator'` → BUILD SUCCEEDED; `./gradlew assembleDebug --offline` exit 0. No device/simulator run.

### Verification
`go build` / `go vet` / `go test ./...` pass (incl. new `TestCollapsePublicActivity`); web `tsc --noEmit` clean and `eslint` reports 0 errors; both mobile builds compile. The four new SQL queries were parsed by sqlc against the migration schema but **not executed against a live database** in this session (no local Postgres), same caveat as `SuggestedUsers` in Phase 1.

### Not done / follow-ups
- Community lists and readers are web-only; mobile decodes only `trending_books` and `activity`. A discovery tab is the natural home for the rest.
- Trending is a raw 7-day shelf count — no velocity, no "rising", no personalisation. Phase 6 (healthy FOMO) is where "rising this week" and "popular with your people" belong.
- Public activity is unpaginated (24 rows). Fine at launch scale; needs a cursor before it becomes a browsable feed.
- Old `added_book` rows still render as "shelved" — correct but less specific than new rows. No backfill: the original status was not recorded.

## 2026-09-11 — Phase 3: book discovery loop

### Two fabricated social claims removed — `paperboxd`
- **What:** the book page's "Community rating" cell rendered a **hardcoded histogram** — `[10, 8, 38, 32, 12]` — next to Google's average, so every book on Paperboxd showed the same invented distribution of reader opinion. The mobile hero's middle stat printed Google's *ratings count* under a **"Reading"** label, turning "12,300 strangers rated this" into "12.3k people are reading this here".
- **Why it matters:** the master prompt's "no fake polish / never hardcode fake numbers" rule, and these were the two most load-bearing trust claims on the most-shared page in the product.
- **Now:** both read from real Paperboxd data, and when we don't have it the number is labelled "Publisher" rather than dressed up as community sentiment.

### `GET /api/v1/books/{id}/social` — `paperboxd-backend`
- **What:** one optional-auth endpoint (`handler/book_social.go`) answering everything the book page needs: `readers` (Paperboxd rating + real 1★–5★ histogram, reads, reading, TBR, TBR adds in 30 days), `friends` (people the viewer follows who have the book, with their status, rating and page), and `lists` (public lists containing it, with covers).
- **New queries:** `GetBookReaderStats` (one row, all counters via `FILTER`), `GetListsContainingBook`. `GetFriendsReadingBook` gained `bs.rating` so a friend's stars ride along with their row — additive, so the existing `/friends-reading` consumers are unaffected.
- **Why:** `books.total_reads_count` and `total_tbr_count` have been **0 since migration 000003** and nothing has ever written them, and `books.average_rating` is the publisher's number from Google. Paperboxd had no way to say what Paperboxd readers thought. Counting live off `bookshelf` is both correct and cheaper than maintaining counters nobody updates.
- **Honesty floor:** `rating` is `null` unless at least one Paperboxd rating exists, so clients fall back to the publisher's number and say which one they are showing rather than printing `0.0`.
- **Privacy:** lists are filtered to public list + public, live owner. Friends require a signed-in viewer.
- **Verified:** `TestReaderRatingRounding` covers the rounding and the null floor.

### Book page answers "what do readers think?" — `paperboxd`
- **What:** `hooks/use-book-social.ts` + `components/ui/book/social-proof.tsx`, wired into `app/b/[slug]/page.tsx`:
  - **Paperboxd rating** with a real histogram in the desktop stats strip; publisher rating (labelled) until Paperboxd has ratings of its own.
  - **People you follow** card: "3 people you follow have read this · 2 are reading it · 2 rated it 4★ or higher", with faces linking to profiles and each person's stars or current page. `friendsSentence()` builds only claims the counts support, and the card hides entirely when there is nothing true to say. The `/friends-reading` endpoint existed since before this phase and **web never called it**.
  - **On Paperboxd** card: finished / reading / on-a-TBR counts, plus "N readers added it to their TBR this month" — gated at ≥3 so one add is not dressed up as momentum.
  - **Lists tab**: was the string "Lists containing this book will appear here." under a "Coming soon" heading; now renders the real lists with stacked covers, owner and save count, and a useful empty state ("Not in any public list yet — add it to one of yours"). Highlights keeps its honest placeholder.
- **User problem:** a reader deciding whether to read a book could see the blurb and a stranger's average, but nothing about the people whose taste they actually follow.

### Mobile book detail — `paperboxd-ios`, `paperboxd-android`
- **What:** both stat strips now lead with the Paperboxd rating when it exists (labelled "Paperboxd"), fall back to "Publisher", and swap the "Time to read" cell for a "Finished" count once readers have finished the book. New `BookSocialResponse` model, `Endpoints.bookSocial` / `ApiService.bookSocial()`, one extra parallel fetch in each book-detail view model.
- iOS and Android already showed friends-on-book and "What friends say" — that part was ahead of web, and is unchanged.
- **Verified:** `xcodebuild` BUILD SUCCEEDED; `./gradlew assembleDebug --offline` exit 0. No device/simulator run.

### Verification
`go build` / `go vet` / `go test ./...` pass; web `tsc --noEmit` clean, `eslint` 0 errors (45 pre-existing warnings); both mobile builds compile. The two new SQL queries were parsed by sqlc against the migration schema but **not executed against a live database** (no local Postgres) — same caveat as Phases 1–2.

### Not done / follow-ups
- `books.total_reads_count` / `total_tbr_count` / `average_rating` are still dead or publisher-sourced columns. Nothing reads them for social proof any more, but `vibe_search.go` and `recommendation_service.go` still select them — worth deleting or backfilling in a later pass.
- No "why this fits you" line on the book page yet; reason strings exist in the recommendation pool but are not carried into the book page. Phase 9 (recommendations as magic) is where that belongs.
- `/social` is uncached. It is 2–3 queries plus one cover query per list; add a short Redis TTL if book pages get hot.
- Mobile decodes only the `readers` block — lists-containing-book and the friends-rating detail are web-only for now.

## 2026-09-11 — Phase 4: reading identity

### "Books read" was capped at 100 — `paperboxd`
- **What:** the profile stat read `bookshelfBooks.length`, and `app/api/users/[username]/route.ts` loads the shelf as `bookshelfApi.get(username, 1, 100)`. Any reader past 100 finished books was shown as having read exactly 100 — the flagship number on the profile, wrong for precisely the serious readers the product wants.
- **Fix:** the route now passes Go's `total_count` through as `booksReadTotal`, and the stat prefers it, falling back to leaderboard stats and only then to the loaded array. Root cause was using a paginated page as a count, so the fix is at the route, not at the stat.

### Reading identity line — `paperboxd`
- **What:** new `components/ui/profile/reading-identity.tsx`, rendered under the username on both desktop and mobile headers: "Reads mostly Fantasy and Literary Fiction · 128 books finished · 23 this year".
- **Truthfulness:** every clause is dropped when its data is missing — genres come from the shelf's own category leaves (hierarchical Google strings like "Fiction / Fantasy / Epic" reduce to "Epic"; bare "Fiction"/"General" are skipped as taste-free), "this year" is suppressed when it would merely restate the total, and a profile with nothing on the shelf falls back to "Here since Mar 2026" or renders nothing at all.
- **User problem:** a profile opened as a database record — name, bio, counters. It never said what kind of reader the person is.

### Top 4 is prompted, not hidden — `paperboxd`
- **What:** the favourites strip previously rendered nothing when empty. On your own profile it now shows four dashed slots and "Pick your Top 4 — the four books you would hand to someone. They lead your profile."
- **Why:** the Top 4 is the most identity-dense thing on a profile and the emptiest profiles were the ones giving no reason to fill it.

### Verification
`tsc --noEmit` clean; `eslint` 0 errors on touched files. Web has no JS test runner and adding one for this was not worth a dependency — the identity logic is pure and exported (`identityClauses`, `topGenres`) so it can be asserted when a runner exists.

### Not done / follow-ups
- The identity line and the Top 4 prompt are web-only; iOS/Android profiles are unchanged (Phase 15 is the parity pass).
- Mobile profile screens fetch their own shelf and may repeat the same page-length-as-count mistake — not audited in this phase.
- Profile monolith (5,204 lines) untouched by design; this phase added one component and three small edits rather than a refactor.

## 2026-09-11 — Phase 5: social loop

### Follow suggestions explain themselves — `paperboxd-backend`
- **What:** `/api/v1/users/suggested` now leads with the two signals that actually persuade someone to follow a stranger: **books you have both finished** ("You both read Piranesi and 3 more") and **people you follow who follow them** ("Followed by 3 people you follow"). Genre overlap and read volume remain as fallbacks.
- **How:** the handler over-fetches candidates (4× the requested limit, capped at 60) from the existing genre query, then enriches with two set-based queries — `SharedReadCounts` and `MutualFollowCounts`, plus `UserReadBookIDs` / `FollowingIDs` to build their inputs — and re-ranks with `sort.SliceStable` so genre order survives as the tie-break.
- **Why not one SQL query:** sqlc's analyser cannot resolve the same table aliased twice inside a subquery (`bookshelf mine` joined to `bookshelf theirs` fails to generate, in JOIN, comma-join and nested-IN forms alike). Four small set-based queries generate cleanly and are readable; the alternative was hand-writing SQL outside sqlc. Noted in the query comments so the next person does not retry it.
- **Response:** `SuggestedUserResponse` gains `shared_books` and `mutual_follows`. Additive — existing onboarding clients ignore them and keep rendering `reason`.
- **Cost:** 3 extra queries per call, all set-based rather than per-candidate. Signal failures degrade to the old genre reason rather than failing the request.

### "Readers to follow" on home — `paperboxd`
- **What:** new `components/ui/home/suggested-readers.tsx`, shown on the logged-in home when the reader has fewer than 3 friend activities — the same condition that reveals the Around Paperboxd rail. One-tap follow, each card carrying the server-authored reason.
- **Why:** `/users/suggested` was built in Phase 1 and used **only during onboarding**. A reader who skipped that step, or followed nobody since, had no path to finding people anywhere in the product.
- **Measured:** `suggested_reader_followed` (metadata: the reason that persuaded them) — which reason converts is the thing worth knowing here.

### Activity reads as stories — `paperboxd`
- **What:** `groupActivities()` collapses several people doing the same thing to the same book into one card: "Maya and 2 others · finished Dune" rather than the same cover three times. Grouping is by (book, action) and the newest row keeps the timestamp and link.
- **Why:** the master prompt's "turn raw activity into understandable social stories" — and with Phase 2's real verbs, a popular book previously flooded the rail.

### Verification
`go build` / `go vet` / `go test ./...` pass; web `tsc --noEmit` clean, `eslint` 0 errors. The four new/changed SQL queries were parsed by sqlc against the migration schema but not executed against a live database.

### Not done / follow-ups
- Suggestions are still web + onboarding only; the mobile apps have `Endpoints.suggestedUsers` from Phase 1 but no rail on home.
- Grouping is client-side and only within the rail's fetched page; a real "3 people you follow started this" story on the book page would come from the `/social` friends block.
- `shared_books` counts any book both readers finished, without weighting by how rare the book is — two people who both read a bestseller score the same as two who both read something obscure.

## 2026-09-11 — Reported bugs (found by the owner while browsing)

### Signed-out Follow and "sign in" buttons went nowhere — `paperboxd`
- **Symptom:** as a logged-out visitor on `/u/[username]`, clicking **Follow** or the "Sign in to explore this profile" banner did nothing.
- **Root cause:** `handleFollow` and `handleAuthPrompt` both call the page-level `setAuthPromptOpen(true)` — but **no `AuthPromptDialog` was rendered at page level**. The only two instances live inside header subcomponents with their own separate `authPromptOpen` state, so the page-level state had no subscriber. The dialog itself was fine (`router.push("/auth")`).
- **Fix:** mount one `AuthPromptDialog` in the page body bound to that state. One dialog, not per-button handlers, so every caller of the existing state works — including any added later.

### Publisher rating rendered as `4.6041665/5` — `paperboxd`
- **Cause:** Google's `averageRating` is a raw float and was printed verbatim. Paperboxd's own rating is rounded server-side, which is why only the publisher fallback showed it.
- **Fix:** one decimal at every display site (`oneDecimal()` in the social-proof component, plus the book page's mobile hero and facts grid).

### A stock photo of a person was being served as a book cover — `paperboxd`
- **Symptom:** on the author page (and anywhere a book lacked a cover), an Unsplash portrait appeared as the cover art.
- **Root cause:** five API routes fell back to the same hardcoded Unsplash URL — `/api/books/by-author`, `/api/books/latest`, `/api/books/public`, and the `DEFAULT_COVER` constants in `/api/users/[username]` and its diary route. A stock photo is indistinguishable from a real cover to a reader, so this was quietly mislabelling books.
- **Fix:** all five now return `""`, and clients render their own neutral placeholder — the author page shows the book's title on a muted panel, the profile falls back to the existing `lib/utils` SVG. The dead `app/api/mobile/v1/*` routes still contain it and are slated for deletion (audit W-04).
- **Also:** "20 books in PaperBoxd" → "on PaperBoxd" (3 strings on the author page).

## 2026-09-11 — Phase 6: healthy FOMO

### Three discovery shelves, all from real shelf data — `paperboxd-backend`
- **What:** `GET /api/v1/community` gains `rising`, `most_tbr` and `hidden_gems`, each entry carrying a server-authored `label` stating the number that earned its place.
  - **Rising** (`GetRisingBooks`): shelved more in the last 7 days than in the 7 before. Momentum rather than volume — a steady bestseller does not qualify, a book three people just found does. Label: "shelved by 7 readers this week".
  - **Most added to TBR** (`GetMostTBRBooks`): `to-read` adds in the last week. Intent to read, which is a different signal from reads.
  - **Hidden gems** (`GetHiddenGems`): a real Paperboxd average of 4.0+ from **3 to 25** raters. The upper bound is what makes it a gem rather than a hit. Label: "4.4 from 6 ratings".
- **Honesty:** the label is generated next to the number it describes, so no client can restate it more strongly. Every shelf may legitimately return zero rows — a quiet week renders fewer shelves rather than invented ones — and a query failure logs and drops that shelf instead of failing the snapshot.
- **Cost:** three aggregate queries inside the existing 5-minute Redis cache, so once per five minutes for all visitors.

### Shelves on home and landing — `paperboxd`
- **Home:** "Rising this week", "Most added to TBR" and "Hidden gems" carousels, each rendered only with ≥4 books and deduped against the personalised rails above them. `BookCard` shows the label under the author in mono.
- **Landing:** rising and most-added rows join "This week on Paperboxd", so a logged-out visitor sees movement rather than a static top list.
- **No dark patterns:** no countdowns, no "only N left", no urgency language. Every line is a count of something that happened, stated in the past tense.

### Verification
`go build` / `go vet` / `go test ./...` pass; web `tsc --noEmit` clean, `eslint` 0 errors. The three new SQL queries were parsed by sqlc against the migration schema but not executed against a live database.

### Not done / follow-ups
- Shelves are global, not personalised — "popular with readers like you" needs the taste graph and belongs with the recommendation work in Phase 9.
- Hidden gems' 3-rating floor and 25-rating ceiling are guesses that will need tuning once there is real rating volume; at launch this shelf will likely be empty for a while, which is the correct behaviour.
- Mobile does not decode the new shelves yet (it reads only `trending_books` and `activity`).

## 2026-09-11 — Phase 7: lists as social content

### Lists other people made are now findable — `paperboxd`, `paperboxd-backend`
- **What:** `/lists` showed only your own lists. It now carries a "Lists worth reading — from other readers" grid below them, built from the public lists already returned by `/api/v1/community` (Phase 2), with covers, author and save count. The Go side raises that list limit from 6 to 12 so the grid has something to fill.
- **Why:** a list is the one thing on Paperboxd a reader writes *for an audience*, and until now it was only ever visible on its author's profile. Nobody could browse lists, which made writing one feel like filing rather than publishing.
- **Threshold:** the section hides below 2 usable lists, so it does not appear as a near-empty shelf at launch.

### Lists are prompted as writing, not folders — `paperboxd`
- **What:** the create form now offers five one-tap starting points — "Books that changed me", "My comfort books", "Books I want to read this year", "Everyone should read this once", "Books that destroyed me" — and the placeholder changed from "List name…" to "Books that changed me…". The field stays free text; the prompts fill it, they do not constrain it.
- **Why:** the master prompt's "make lists feel like publishing" — a bare "List name…" field reliably produces "Fantasy" and "2026". Nothing about these titles is hardcoded as a concept: they are placeholder strings, not categories.

### Verification
`go build` passes; web `tsc --noEmit` clean, `eslint` 0 errors.

### Not done / follow-ups
- List pages have no `generateMetadata`, so a shared list link still previews with generic OG tags — that is audit W-01 and belongs to Phase 20 (shareability) along with book and profile pages.
- No list cover image or custom ordering; the three-cover stack is derived from the books in the list.
- Public list discovery has no pagination or sorting beyond "most saved, then recently updated".

## 2026-09-11 — Phase 8: diary as expression

### Diary notes reach the book page — `paperboxd`
- **What:** `GET /api/v1/books/{id}/diary` has existed on the Go side all along, and `bookApi.getDiaryEntries` was already sitting in `lib/api/endpoints.ts` — **with no caller**. Web now has `app/api/books/[id]/diary/route.ts`, and `ReviewsList` fetches reviews and diary notes together.
- **Merged, not tabbed:** a shelf review and a diary note about the same book are the same act of writing, and a reader should not have to know which form produced which. Both render in one stream, newest first, deduped by author so someone who wrote both is not shown twice. Diary rows carry a quiet "from their diary" marker.
- **Privacy:** the Go endpoint already filters private entries and blocked users; nothing about visibility changed here.
- **Tab renamed** "Reviews" → "Readers", because the section is no longer only reviews.
- **Empty state:** "No reviews yet. Be the first." → "Nobody has written about this one yet. Rate it, or write a diary note — both show up here." — which now names both routes into the section.

### Verification
`go build` / `go vet` / `go test ./...` pass; web `tsc --noEmit` clean, `eslint` 0 errors (44 pre-existing warnings).

### Not done / follow-ups
- Diary likes are not surfaced on the book page (`likes_count` / `is_liked` come back from Go but the merged row drops them) — liking from the book page is the natural next step.
- The diary writing experience itself is untouched; this phase surfaced diary writing rather than improving the editor.
- Diary notes are not paginated on the book page (first 20).
- Mobile book detail already had a "What friends say" section and is unchanged; it does not merge public diary notes.

## 2026-09-11 — Phase 9: recommendations as magic

### "Similar books" has never rendered on the book page — `paperboxd`
- **Symptom:** the Similar books carousel on `/b/[slug]` was permanently empty.
- **Root cause:** Go returns `{ similar: [...] }`; the web proxy passed the body straight through; the book page reads `data.books`. Nothing errored — the section simply never met its `similarBooks.length > 0` guard.
- **Fix:** the proxy now flattens the candidates into the carousel's shape and returns **both** `similar` and `books`, so neither the page nor any other consumer breaks.

### Recommendation reasons reach the reader — `paperboxd`
- **What:** the pool has shipped a server-authored `reason` and `reasonType` with every book since Phase 1 ("Maya read this", "You read more by Le Guin", "Matches your taste for Epic"). The home carousels' `mapBook()` **dropped both fields on the floor**, so every personalised shelf looked like a random row of covers.
- **Now:** `mapBook` carries them, the home card renders the reason under the author, and `BookCarouselBook` gained optional `reason`/`reasonType` so the book page's similar-books cards explain themselves too.
- **No internals leaked:** the strings are written by `ReasonEngine.Build` and mention people, authors and genres — never embeddings, cosine similarity or model names. Verified against the engine's eight rules.
- **Why:** the master prompt's "make the intelligence legible". The intelligence was already there and already explained; only the last hop to the eye was missing.

### Verification
`tsc --noEmit` clean; `eslint` 0 errors.

### Not done / follow-ups
- The reason-to-tab filter in `/api/books/personalized` still matches on **text prefixes** (`'You read'`, `'Matches your'`) with `reasonType` only as a first check — audit A-07. Any copy change in `ReasonEngine` still silently breaks the filter tabs until that is inverted to type-first.
- Mobile carousels receive `reason` in `RecommendationItem` but do not display it.

## 2026-09-11 — Phase 10: Scan & Know

### Owner's email no longer hardcoded in the source — `paperboxd-backend` (closes audit B-04 / backlog #6)
- **What:** `scanUnlimitedEmails = {"hridyesh2309@gmail.com": true}` is gone. The allowlist now comes from `SCAN_UNLIMITED_EMAILS` (`config.ScanUnlimitedEmails`), empty by default, matched case-insensitively and whitespace-trimmed but never as a prefix or substring.
- **Why:** one account behaved differently from every other account in production, and changing that required a deploy. This is also the first seam toward the Plus `scan_unlimited` entitlement (Phase 18) — the capability check now has one place to live.
- **Verified:** `TestIsScanUnlimited` covers case, whitespace, near-miss addresses (`reader@example.com.evil`), an empty allowlist and a nil config — the last two being the production default, where nobody is exempt.

### A scan is reserved before the paid call and refunded if it fails — `paperboxd-backend` (closes audit B-09)
- **Before:** read `scan_uses_remaining` → call Claude → decrement. Two concurrent scans with one scan left both passed the gate and **both billed us for a Claude completion**.
- **Now:** an atomic `UPDATE … WHERE scan_uses_remaining > 0 RETURNING` reserves the scan up front; losing that race returns `scans_exhausted` without calling Claude. Every early return refunds via `defer`, and the reservation is only marked spent once a score comes back — so the existing promise ("your scan hasn't been used" on failure) is now enforced by the code rather than by ordering.
- **Refund is best-effort and logged loudly:** a failed refund costs a reader one scan, which is worth an error line.

### `?debug=true` removed — `paperboxd-backend` (closes audit B-08)
- The flag returned `user_profile` and `community_summary` — the full Claude prompt context, including the reader's shelf — to any authenticated caller. Deleted rather than gated: nothing in the product consumed it.

### Scan instrumentation — `paperboxd-backend`, `paperboxd-ios`, `paperboxd-android`
- `scan_failed` (with `stage: lookup | scoring`) and `scan_succeeded` are emitted server-side, where the outcome is actually known. `scan_started` is emitted by both apps at the moment the camera hands over an ISBN, which is what makes drop-off measurable.
- `ScanHandler` gained `EventSvc`; Android's `ScanFlowViewModel` gained `AnalyticsRepository`.

### Verification
`go build` / `go vet` / `go test ./...` pass (incl. `TestIsScanUnlimited`); `xcodebuild` BUILD SUCCEEDED; `./gradlew assembleDebug --offline` exit 0.

### Not done / follow-ups
- Scan has **no web surface at all** — it is iOS/Android only, so the "clear score hierarchy / strengths / mismatch" UI work in this phase's brief applies to screens that already exist on mobile and were not redesigned here.
- `scan_result_viewed`, `scan_book_added`, `scan_added_to_tbr`, `scan_started_reading` are not emitted yet; they need hooks in the mobile result screens.
- The quota itself is still a column on `users`, not an entitlement. Phase 18.

## 2026-09-11 — Phase 11: reading loop

### Finishing a book was silent — `paperboxd`
- **What:** `handleBookshelf()` marked a book finished and, on success, said **nothing**. Only the error paths produced a toast. The most rewarding action in the product — the end of DISCOVER → TBR → START → PROGRESS → FINISH — gave no acknowledgement and no next step. (Logging progress to 100% did fire a bare "Book completed!", so the two ways of finishing a book behaved differently.)
- **Now:** both paths call one `celebrateFinish()` — a toast naming the book, a line that adapts to whether the reader can rate it yet, and a single "Write a note" action that opens the diary editor. Lightweight by design: no modal, no confetti, no interruption, per the brief's "keep celebrations lightweight".
- **Saving to TBR** was silent on success too, and now acknowledges with where the book went ("It'll be waiting on your home page") — the start of the loop deserves the same treatment as the end.

### Loop instrumentation — `paperboxd`
- `reading_finished` and `tbr_added` are emitted from the book page, joining the Phase 16 event set. Both carry the book id.

### Verification
`tsc --noEmit` clean; `eslint` 0 errors.

### Not done / follow-ups
- Rating and review still have no success acknowledgement of their own; the finish toast points at the diary editor but not at the rating control.
- "Suggest the next useful action" is currently one action (write a note). A "what's next from your TBR" suggestion after finishing would close the loop back to discovery — it needs the TBR pick already built for the home hero in Phase 2.
- Mobile finish flows were not touched; iOS/Android have their own book-detail actions.

## 2026-09-11 — Phase 12: empty states (audit W-07)

### One component, and a rule — `paperboxd`
- **What:** `components/ui/shared/empty-state.tsx`. The rule it encodes: an empty surface **on your own profile always offers the action that fills it**, and an empty surface on **someone else's** profile never pretends the viewer can do something about it (the action is simply omitted).
- **Replaced:** the profile's lists, diary, overview and TBR/DNF empty states — all four previously said some variant of "Nothing here yet" with a sentence that described the emptiness rather than resolving it.
  - Lists → "A list is the one thing here you write for other people." + **Make a list**
  - Diary → "Write your first note — a line about what a book did to you is worth more later than you think." + **Find a book**
  - Overview → "Start your reading universe. Add a book you loved and your Top 4, current reads and stats fill in from there." + **Find a book**
  - TBR → "Save books you want to read." + **Browse books**
- **Sidebar shelves:** all three sheets (Liked / Want to read / Finished) shared the single line "Nothing here yet." Each now names what is missing and offers the same fix, with a button that closes the sheet and goes to search.
- **Add-to-list dialog:** "Create one above to get started" → a concrete suggestion, matching the Phase 7 prompts.

### Verification
`tsc --noEmit` clean; `eslint` 0 errors.

### Not done / follow-ups
- Search and feed empty states ("No results for …") were left alone: they are already specific, and the useful action there is changing the query.
- Mobile apps have their own empty states and were not touched.

## 2026-09-11 — Phase 13: failure honesty (audit W-02, backlog #10)

### The Goodreads import reported success for imports that mostly failed — `paperboxd`
- **Before:** every row that did not import — not found, rate-limited, backend error — incremented one `skipped` counter, and the client said `Imported ${d.imported} books from Goodreads` and nothing else. A 500-book library that landed 40 showed a green success toast. There was also **no row cap**, so a large library 429ed partway through under the global rate limit (audit B-07) and the failures were invisible.
- **Now:**
  - **Row cap of 500**, with `truncated`, `processed` and `total` in the response. Every row costs 1–3 backend calls inside one serverless request, so this is a real ceiling rather than a guess.
  - **`notFound` and `failed` are counted apart.** Not found means the book isn't on Paperboxd; failed means we found it and the write broke. They need different advice, so they are no longer the same number. `rateLimited` is flagged separately because it is the one failure worth retrying immediately.
  - **The toast tells the truth:** "Imported 40 books from Goodreads — 12 hit a rate limit, retry from your profile · 448 aren't on Paperboxd yet · only the first 500 of 812 rows were read". Zero imports is now an **error** toast, not a success one.
- **Compat:** `skipped` is still returned (now meaning not-found only) so any older client keeps working.

### Verification
`tsc --noEmit` clean; `eslint` 0 errors.

### Not done / follow-ups
- The import still runs inside one Next request. A 500-row import is survivable but slow; moving it to a single batched backend endpoint is the real fix (backlog #10's second half) and needs a Go endpoint that does not exist yet.
- No resume/retry UI: "retry from your profile" means re-uploading the CSV, and re-imports are idempotent only because the shelf endpoints treat 409 as success.
- Offline banners on iOS/Android (audit #31) and session-expiry handling were not part of this pass.

## 2026-09-11 — Phase 14: performance

### Per-route rate limits (audit B-06/B-07, backlog #9) — `paperboxd-backend`
- **Before:** one global limit (100/min per token or IP) covered everything, so the endpoints that cost money or enable abuse had the same budget as a book-cover fetch.
- **Now:** a `tightLimit(n)` helper layers a stricter limit under the global one:
  - `/auth/*` and `/api/mobile/auth/*` → **10/min**. This is the OTP email-bombing surface (audit B-06: `/auth/otp/send` had no cooldown at all) and the credential-guessing surface. A human never needs ten auth calls a minute.
  - `/scan/analyze` → **10/min**. Every call is a paid Claude completion; the quota is the real limit, this stops a loop burning it in seconds.
  - `/search/vibe` → **20/min**. Embedding plus model call per request.
- The global limit still applies on top, so this only ever tightens.

### `/books/{id}/social` is cached — `paperboxd-backend`
- **What:** the viewer-independent half (reader stats, histogram, lists — 2 queries plus one cover query per list) is cached in Redis for 2 minutes. The book page is the most-linked surface in the product and this endpoint was uncached, as flagged in the Phase 3 follow-ups.
- **Privacy guard:** the cached payload is explicitly stripped of `friends` and the friend counts before the per-viewer block is attached, so one reader's friends can never be served to another from cache. The split is structural — `buildBookSocial` only ever builds the shared half.
- Redis is optional at boot, so a nil cache simply means every request builds fresh.

### Verification
`go build` / `go vet` / `go test ./...` pass.

### Not done / follow-ups
- The profile page still fires ~24 client fetches on load (audit W-10 territory); consolidating them needs the profile monolith split and was out of scope here.
- No query-plan work: no slow-query log was available in this session, and guessing at indexes without one is how you get unused indexes. `EXPLAIN` on the new Phase 6 aggregates against production data is worth doing before launch.
- The Goodreads import is still N sequential batches inside one request (see Phase 13).

## 2026-09-11 — Phase 15: mobile parity

### Recommendation reasons on mobile — `paperboxd-ios`, `paperboxd-android`
- `RecommendationItem.reason` has been decoded by both apps since Phase 1 and displayed by neither. Both carousel cards now show it under the author, the same line web got in Phase 9 — so "Maya read this" reaches every client from one server-authored string.

### Discovery shelves on mobile — `paperboxd-ios`, `paperboxd-android`
- Both apps decoded only `trending_books` and `activity` from `/api/v1/community`. They now decode the Phase 6 shelves and render **Rising** ("Picking up speed.") and **Most saved** ("Going onto TBRs."), with the server's `label` carried into the card's reason line so the claim stays the server's. Same ≥4-book threshold as web, so a quiet week renders fewer shelves rather than thin ones.
- **iOS:** `CommunityShelfBook` decodes the book and its label from one flattened object via a custom `init(from:)`, and every field of `CommunityResponse` is now `decodeIfPresent` — an older backend that omits the new keys still decodes rather than throwing.
- **Android:** `CommunityShelfBook` mirrors the fields the carousel needs (Gson cannot flatten an embedded `Book`), including the same largest-first, force-HTTPS cover derivation as `Book.coverUrl`.
- Hidden gems is decoded on both but not yet rendered — at launch it will almost always be empty (it needs 3+ ratings on a book), and an empty shelf is not worth a section.

### Verification
`xcodebuild` BUILD SUCCEEDED; `./gradlew assembleDebug --offline` exit 0; web `tsc` clean and `eslint` 0 errors; `go build` / `go vet` / `go test ./...` pass.

### Not done / follow-ups — the honest parity gap
Web is ahead of mobile on everything below. None of it is broken on mobile; it simply does not exist there yet:
- **Phase 3:** book-page lists-containing-this-book, and the friends-with-ratings detail (mobile decodes only the `readers` block of `/social`).
- **Phase 4:** the reading-identity line and the Top 4 prompt on profiles.
- **Phase 5:** the suggested-readers rail (both apps have `Endpoints.suggestedUsers` but no rail) and activity grouping.
- **Phase 7:** public list discovery. **Phase 8:** diary notes merged into the book page.
- **Phase 12:** the empty-state pass — mobile empty states were not audited.
- **Audit #31:** app-wide offline banners on both platforms (`NetworkMonitor` is referenced from 2 files on iOS; Android has offline detection only in Scan).
