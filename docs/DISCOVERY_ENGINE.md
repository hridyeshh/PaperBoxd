# Discovery Engine — R0–R7 build log

**Date:** 2026-09-11 → 2026-09-12
**Source:** `~/Desktop/paperboxd-personal-discovery-engine-roadmap.md`
**Status:** all seven releases built and verified, plus gap passes for all phases 0–25; **nothing committed**; **no migrations run against prod**; **backfill not run**.

Every repo compiles and tests pass: backend `go build/vet/test`, web + dashboard `tsc --noEmit`, Android `compileDebugKotlin`, iOS `xcodebuild`.

---

## What each release delivered

### R0 — Instrument & unblock
| Where | What |
|---|---|
| `backend/migrations/000042` | `events.user_id` nullable, `anon_id`, `events_actor_present` CHECK, dotted names → `snake_case`, rec verbs → `rec_*`, funnel index |
| `backend/migrations/000043` | Reconciles `books.embedding` to `vector(1024)` — no-op on prod, repair on fresh DBs. **Answers B2.** |
| `backend/internal/service/event_types.go` | Canonical enum; `NormalizeEventType` maps every shipped-client alias |
| `backend/internal/handler/analytics_discovery.go` | `/analytics/retention` (D1/7/14/30 cohorts, activation, stickiness), `/analytics/discovery` (impression→open→save→start→finish→4★ by `reason_type`) |
| `backend` | `/events` now `OptionalAuthenticate`; anon allowlist enforced |
| `web/lib/analytics.ts` | Canonical names, `anon_id` + `session_id`, `landing_viewed`, `book_viewed`, `search_performed` wired |
| `web/hooks/use-rec-impression.ts` | Impressions counted on visibility, not render |
| `ios`, `android` | `rec_impression` + `reason_type` metadata |
| `analytics-paperboxd` | Retention page real; new Discovery page; MAU no longer summed 30× |

### R1 — Book traits
| Where | What |
|---|---|
| `backend/migrations/000044` | `book_traits` (9 scalar axes + jsonb), `trait_prefs/dislikes/confidence` on profiles, `trait_ranking` flag |
| `service/trait_extractor.go` | Haiku batch extractor, index-aligned, confidence-aware. Mirrors `vibe_reasons.go` |
| `service/trait_service.go` | `ComputeTraitProfile`, `TraitFit`, `TraitClash`, persistence |
| `service/trait_reasons.go` | "You tend to love quiet, character-driven stories" — gated on reader conviction **and** book match |
| `service/recommendation_service.go` | `scoreV2` rewritten: weight-normalised so unextracted books aren't penalised; trait fit + clash terms |
| `cmd/backfill-traits` | `--dry-run --limit --sample --profiles` |
| `cron` | nightly trait profile recompute |

### R2 — Negative taste
| Where | What |
|---|---|
| `backend/migrations/000045` | `recommendation_feedback` (verdict + reason codes), `dismissed_until/forever`, `depth_signal` |
| `service/feedback_service.go` | 5 verdicts, 12 reason codes, **codes move only their own axis**, `not_now`=90d / `not_for_me`=forever, `already_read` never trains dislike, early-abandon (<25%) as implicit rejection |
| `handler/recommendations.go` | `POST /feedback` accepts verdicts; `GET /feedback/options` |
| `web/components/ui/book/rec-feedback.tsx` | Verdict chips + reason chips, in-place on carousel cards |

### R3 — Ranking 2.0
| Where | What |
|---|---|
| `service/ranking.go` | `RecConfidence` (evidence-based, capped on clash) → `ConfidenceLabel` (4 human tiers, never a number); `diversify` replaces MMR — **old MMR measured `1-\|scoreA-scoreB\|`, a statement about two numbers, never diversified content**; author/category caps; `IsHiddenGem` with rating floor; 20% exploration **interleaved**, not appended |
| `recommendation_service.go` | Hidden-gem retrieval path; community stats hydration |

### R4 — Search 2.0
| Where | What |
|---|---|
| `service/search_intent.go` | Deterministic parser: 7 intents, page limits, `SimilarTo`, exclusion ceilings, axis words, 5 context words; **adjectives only, never topic nouns**; `ParseRefinement` for comparatives ("shorter", "less weird"); `Merge` for constraint-only follow-ups |
| `service/search_session.go` | Redis `SearchSession`, 30-min TTL, ownership-checked, tracks shown books |
| `service/search.go` | Retrieve → hard filters → taste rank → explain. Author/title anchoring for "like X". `POST /api/v1/search` |
| `web` | `/api/search` proxy; Vibe tab uses it; "Refined: like Murakami · under 300 pages" line |

### R5 — Jazy 2.0
| Where | What |
|---|---|
| `service/reader_context.go` | Full picture: recent/abandoned/disliked/rejected-as/TBR/saved-never-started/friends-loved/previous-asks/taste lines/recent shift. Shared by vibe + concierge prompts |
| `service/concierge.go` | `POST /api/v1/jazy`: one clarifying question when open-ended (comfort-vs-stretch for known readers, pace for strangers), else deck via the search pipeline + Claude voice |
| `ios/JazyService.swift`, `JazyView.swift` | `ask()`, session, `pendingQuestion` UI, `AnonID` |
| `android/JazyViewModel.kt`, `JazyScreen.kt` | same |

### R6 — Feed & social
| Where | What |
|---|---|
| `backend/migrations/000046` | `taste_overlap` materialised pairs, `taste_twins` flag |
| `service/taste_overlap.go` | Shelf Jaccard+containment, rating agreement, trait distance — weighted by evidence; nightly O(n²) (ponytail: block past 5k readers); `GetTasteTwins`, `PeopleLikeYouLoved` |
| `service/feed.go` | 10 modules with server-authored titles; **Your Next Read** fires only ≤5d after a finish with nothing in progress; `GET /feed`, `/twins` |
| `web/hooks/use-feed.ts`, home | Modules render above legacy rails, deduped |

### R7 — Intelligence
| Where | What |
|---|---|
| `service/intelligence.go` | `SurpriseMe` (5 modes, weighted random), `GetTasteDashboard` (bars/shifts/mood/dislikes/6 gated insights), 6 context presets sharing the search constraint vocabulary |
| routes | `GET /recommendations/surprise`, `GET /users/me/taste`, `GET /search/contexts`, `POST /search/context` |
| `web` | `surprise-me.tsx` on home; `taste-dashboard.tsx` on own profile |

---

## Phase 0–2 gap closure (2026-09-12)

Second pass against the roadmap's "Discovery 1.0" deliverables. Five gaps found and closed:

| # | Gap | Fix |
|---|---|---|
| 1 | `negative_taste` flag existed but was never read | `scoreOptions` threaded into `scoreV2`; clash penalty gated. Collection always runs — the flag only kills the ranking *effect* |
| 2 | Recent taste computed but not a ranking term | migration **000047** `trait_recent`; `RecentTraitProfile` (90d window) saved alongside long-term; `wRecent=0.08` term behind `recent_taste` flag; reason rule "You've been drawn to X lately" |
| 3 | Verdicts only reached ranking after nightly cron | `PostFeedback` kicks `ComputeAndSaveNegativeSignals` async on `loved`/`not_for_me` |
| 4 | TBR + finished-unrated taught nothing | `traitSignalWeight`: read=0.3, pending=0.2 — strictly below any rating; ten saved doorstops cannot outvote three loved novellas (tested) |
| 5 | No verdict UI on mobile | iOS `.contextMenu` on carousel cards; Android long-press `DropdownMenu` on "picked for you" only. Verdict only — reason chips stay on web |

## Phase 3–4 gap closure (2026-09-12)

Second pass against "Recommendation 2.0" (roadmap phases 3–4). What R3 shipped was confidence, diversity and hidden gems; the candidate stage and the reason list were still the R0 pair. Gaps found and closed:

| # | Gap | Fix |
|---|---|---|
| 1 | Candidate sources were vector + social (+ gems, exploration). Roadmap lists eight | `service/candidates.go`: **author** (unread books by authors weighted ≥0.3), **TBR** (neighbours of the TBR centroid), **trending** (2+ live shelves this week, same definition as the community rail), **twins** (top-25 twins rated 4+, behind `taste_twins`). Path C runs them in one goroutine; `mergeCandidatePools` is now variadic and a book found by several sources keeps every source's evidence |
| 2 | `books.like_count` / `total_reads_count` are never written, so popularity was always 0, exploration `ORDER BY total_reads_count` was unordered, and **every** ≥3.8 book passed the hidden-gem awareness check | `fetchCandidateCommunity` counts shelves live off `bookshelf`; exploration orders by external `ratings_count`; `IsHiddenGem` adds a `ratings_count ≤ 200` global-awareness ceiling (Paperboxd shelf counts cannot tell a gem from a bestseller at 63 users) |
| 3 | No community-quality or similar-reader ranking dimension | `wQuality=0.05` on `qualityScore(avg, count)` (3.0→0, 5.0→1, discounted under 20 ratings); `wTwin=0.10` on twins who rated it 4+ (`fetchTwinSignals`, one query over the pool). `wRecency` renamed `wPopularity` and scaled to `popularShelfCount=10` |
| 4 | No "because you loved X" / "rated Y 5★" / "similar books on your TBR" reasons — the specific-book evidence the roadmap lists first | `loadAnchors` (40 loved + 20 TBR shelf books with embeddings, request-scoped on `UserSignalProfile.Anchors`); `nearestAnchor` records the closest one ≥ `anchorMinSim=0.72` (loved beats TBR at any margin); reason types `because_loved`, `tbr_similar` |
| 5 | Social reason said "read this" even when every friend liked it; no twin reason in the pool; no compound reasons | "X loved this" only when `FriendLovedCount == len(FriendNames)`; `people_like_you` reason ("@ana loved this" / "4 readers with your taste loved this"); social and twin lines get a trait tail when the book matches the reader — "maya loved this — and you tend to love quiet, character-driven stories". Feed's `peopleLikeYou` re-query deleted; it slices the pool by reason type like every other module |
| 6 | Confidence tier computed and serialised, rendered nowhere | Web home card shows it under the reason (reason itself now `line-clamp-2`, not `truncate`); iOS `RecommendationItem.confidence` + rail card; Android `RecommendationItem.confidence` + card. New chip colours on the web grid for `because_loved`/`tbr_similar`/`trait`/`recent`/`hidden_gem`/`trending`/`people_like_you` |

Reason priority is now: vibe → social → twins → recent → trait → anchor → velocity → diary → author → genre → trending → popular → picked. Still not covered from phase 3's dimension list: **current intent** (last search/Jazy ask as a home-ranking term) and **reading fit** (page length vs the reader's finished median) — both need a new profile field; add when `/analytics/discovery` shows length or intent mismatch in the not-for-me reason codes.

Tests: `reason_engine_test.go` — loved-vs-read verb, twin precedence, anchor text per kind, trait tail only on a matching book, anchor threshold and loved-over-TBR, merge evidence + cap, quality discount.

## Phase 5–6 gap closure (2026-09-12)

Third pass, against "Search 2.0" (roadmap phases 5–6). The parser, session and pipeline were sound; the gaps were around them.

| # | Gap | Fix |
|---|---|---|
| 1 | **Jazy advanced the session twice per turn** — `Concierge` called `AdvanceSearchSession`, then `Search`, which advanced it again. "Shorter" tightened twice, "more emotional" stepped +0.6, turns doubled | `Concierge` calls `searchWithSession` with the session it already advanced (the split that function existed for) |
| 2 | Web never sent one-word refinements: the Vibe tab required 10+ chars, so "shorter" / "darker" were silently dropped and the conversation could not happen | Minimum is 3 chars while a session is live. `REFINE_CHIPS` (Shorter · Darker · Lighter · More emotional · Less weird · No romance) under the results, one tap → refinement |
| 3 | Page bounds were applied after ANN, so "under 250 pages" over 120 long-book neighbours left a handful | `VibeSearchBooks` takes optional `max_pages` / `min_pages` (sqlc `narg`); books without a page count are excluded from a length request. sqlc regenerated (`models.go` now matches 000042–47) |
| 4 | Mobile had no view of the accumulated ask | `ConciergeResponse.understood` + `refined`; iOS and Android deck header quotes the accumulated ask on a refinement instead of the bare word |
| 5 | Parser edge cases vs the roadmap's own table | "sad but hopeful, …" is `multi` (emotional + mood), not `emotional`; first "shorter" with no ceiling is under 300 (the roadmap's example), not 233; "funny/humorous/witty" is a mood word; `Describe()` walks `TraitAxes` in order so the understood line stops reshuffling per render |
| 6 | Search applied the clash penalty regardless of `negative_taste` | Same flag gates it in `searchScore`, so the kill switch means one thing everywhere |

Roadmap's `SearchSession` fields: `query` ✓ `intent` ✓ `constraints` ✓ `previous_results` (`Shown`) ✓ `follow_up_queries` (`Turns`) ✓; `taste_context` is not stored — it is the reader's live profile at rank time, and a snapshot would only go stale.

Still open: Jazy's `intro` line is decoded on both mobile apps and rendered on neither (phase 7 territory). Fresh-topic detection is "≥3 words and not constraint-only"; a two-word new topic after a refinement ("Japanese horror") is merged as a refinement. Add a stop-word check when `/analytics/discovery` shows search abandonment after refinement.

Tests: `TestFirstShorterIsUnder300`, `TestSearchSessionDescribeIsStable`, intent table updated.

## Phase 7–8 gap closure (2026-09-12)

Fourth pass, against "Jazy 2.0" (roadmap phases 7–8). The concierge and the one-question rule were built in R5; three of the twelve things Jazy "should know" were missing, and the question's answers changed nothing.

| # | Gap | Fix |
|---|---|---|
| 1 | **Favorite authors** never reached the prompt — `AuthorWeights` stayed in the profile | `ReaderContext.TopAuthors` → "keeps coming back to: Ishiguro, Le Guin" |
| 2 | **Diary** was a centroid vector only; Jazy could not quote the reader | `DiaryLines`: last 3 non-private entries, "Title: first ~140 chars", cut at a word. Private entries never leave the app (same rule as migration 000040) |
| 3 | Loved books listed without their rating; the roadmap's flagship line is "you gave *Never Let Me Go* 5★" | `LovedBooks` carry the star; prompt tells Claude to name the shelf book with its rating when one genuinely resembles the pick, and that it may quote a diary feeling back |
| 4 | **Phase 8 answers were inert.** "Surprise me" / "Close to my usual" folded into the query text and parsed to nothing — the question was a form field | Context words `comfort` and `surprise`; `searchScore` doubles taste terms on comfort, zeroes them on surprise and rewards leaving the reader's genres (`(1-g)·0.10`). Tested: in-genre book outranks out-of-genre on comfort and the reverse on surprise |
| 5 | Jazy's `intro` decoded on iOS and Android, rendered on neither | Drawn under the quoted ask on the first card of the deck, both platforms |

Roadmap's twelve: read ✓ rated ✓ loved ✓ disliked ✓ abandoned ✓ TBR ✓ who you follow (count + what they loved) ✓ favorite authors ✓ pace ✓ recent interests ✓ diary ✓ previous asks ✓.

Tests: `TestClarifyingAnswersSteerTaste`, `TestReaderContextCarriesAuthorsAndDiary`.

## Phase 9–10 gap closure (2026-09-12)

Fifth pass, against "Feed 2.0" (roadmap phases 9–10).

| # | Gap | Fix |
|---|---|---|
| 1 | Roadmap lists ten modules; feed had eight. Missing **Trending among readers like you** and **You might be ready for…** | `trending_like_you` (pool books that are trending *and* survived this reader's ranking) and `ready_for` (the `recent`-drift reason type, previously folded into Picked). Both omitted when empty, like every module |
| 2 | Greeting computed in server time (UTC on Railway) — "Good morning" at 17:30 IST | `GET /feed?tz=Asia/Kolkata`; web sends `Intl.DateTimeFormat().resolvedOptions().timeZone`; unknown zone → UTC |
| 3 | Greeting fetched by web and never rendered; hero said "Welcome back" | Hero reads `feed.greeting` → "Good evening, hridyesh." |
| 4 | Phase 10's third line missing | `TwinCount ≥ 5` → "Readers who rate books like you do are obsessed with this" |
| 5 | Taste overlap lacked **shared authors** | `TasteTwin.shared_authors`: authors both rated 4+, most-shared first, cap 5, one query per twin list |

**Mobile feed (same day, after sign-off):** both apps now call `GET /recommendations/feed?tz=<device zone>`. iOS `FeedModule`/`FeedResponse` + `HomeViewModel.feedModules`; Android `FeedModule`/`FeedResponse`, `ApiService.feed`, `HomeUiState.feedModules`. Modules render above the legacy rails with a short client eyebrow per `kind` and the server's title; every legacy rail is deduped against module books (`usedIDs`/`usedIds`); the greeting block reads the server greeting ("Good evening, maya") and falls back to "Hello". Feed failure leaves the legacy home untouched. Subtitles are not drawn on mobile — the carousel header has no slot for a second line; add when a module's subtitle carries the claim (the twin overlap % does; that module is phase 11).

## Phase 11–17 gap closure (2026-09-12)

Sixth pass, "Discovery Network". Twins, gems, serendipity, surprise, feedback and evaluation were all built in R3/R6/R7; the gaps were on the edges.

| Phase | Gap | Fix |
|---|---|---|
| 11 Taste Twin | Feed module named the % but not what you both loved; no "Steal their TBR" | `TasteTwin.shared_loved_titles` (feed only, cap 3) folded into the subtitle — "You both loved A, B and C · Books they loved that you haven't read"; web CTA **Steal their TBR →** to the twin's bookshelf |
| 12 Hidden Gems | — | already closed in the phase 3–4 pass (dead-column awareness fix, global ratings ceiling) |
| 13 Serendipity | Stretch pick said "not your usual thing" without saying what the usual thing was | Exploration candidates come from genres the reader never shelved, so the line now names it: "You don't usually read Historical Fiction, but you love quiet, character-driven stories" |
| 14 Surprise Me | — | five modes with a because-line, unchanged |
| 15 Feedback loop | Funnel stopped at rating; roadmap ends at diary and share | `/analytics/discovery` adds `diaried` (a diary entry on the book) and `shared` (`shared_book` activity) per reason type; dashboard table shows 5★, Diary, Shared |
| 16 Evaluation | — | north star already `love_rate` (recommended → 4★+); 5★ now visible next to it |
| 17 Diversity | Caps were genre + author only; roadmap lists nine axes | `diversify` adds per-page caps on **length** (≤10 per short/mid/long bucket), **popularity** (≤8 with ≥10 shelves) and **familiar authors** (≤8 already on the reader's shelf, via `knownAuthors(profile)`); `Candidate.PageCount` hydrated with the community stats. Publication year, geography: no data on the candidate — add when `books.published_date` is backfilled |

Tests: `TestDiversifyCapsLengthPopularityAndKnownAuthors`.

## Phase 18–25 gap closure (2026-09-12)

Seventh and last pass, "Paperboxd Intelligence".

| Phase | Gap | Fix |
|---|---|---|
| 18 Unified | Book page had no "Why you'll like this" — the one surface where a reader arrives already interested | `GET /books/{id}/fit` (`service/book_fit.go`): hydrates one candidate and hands it to the same `rankCandidates` the feed uses — same score, confidence and sentence. 204 when nothing personal applies. Web: `/api/books/[id]/fit` proxy, `useBookFit`, a card above the stats strip with the line and confidence tier |
| 19 Next Read | — | feed `next_read` (best / shorter / different), unchanged |
| 20 Context | — | six context presets + comfort/surprise, unchanged |
| 21 Fusion | — | concierge = parser → search retrieval → taste ranking → Claude voice, unchanged |
| 22 Knows-me moments | Four of the roadmap's seven lines had no rule | **"You've been reading heavier books lately. Maybe you need this"** (recent darkness/intensity ≥0.7 with confidence, book ≤0.3); **"Connects N books you rated highly, including X"** (`AnchorCount` ≥3 over `anchorMinSim`); **"Like X on your TBR, but shorter"** (TBR anchor + ≤250 pages — the saves-but-never-starts nudge); **"You haven't read A yet, but they feel very you"** (trait fit ≥0.8, author not on shelf). Author line reworded to "You've loved A before. Here's another of theirs". Not done: "loved 4 books readers associate with this" (needs item-item co-occurrence) |
| 23 Dashboard | — | `GET /users/me/taste` + web `taste-dashboard.tsx`, unchanged. **Mobile has no taste dashboard** — a new screen on both apps; not a gap pass |
| 24 Advanced | — | six gated insights, unchanged. "Debut vs established" and "discovered through readers vs search" need data the schema does not hold |
| 25 Loop | — | closed: impression → click → shelf → finish → rating/diary/share → verdicts → trait profile → ranking |

Tests: `TestKnowsMeLinesRequireTheirSignal`.

## Feature flags (all default `false`)
`ranking_v2` (pre-existing) · `trait_ranking` · `negative_taste` · `recent_taste` · `taste_twins`

Turn on in order after backfill: `ranking_v2` → `trait_ranking` → `negative_taste` → `recent_taste` → `taste_twins`.

## Rollout order
1. Run migrations 000042–000047 (all idempotent; auto-applied at backend boot).
2. **Verify B2**: `SELECT atttypmod FROM pg_attribute WHERE attrelid='books'::regclass AND attname='embedding';` — 000043 logs a NOTICE either way.
3. `go run ./cmd/backfill-traits --limit 24 --sample 8` — eyeball 8 known titles before spending on the corpus.
4. `go run ./cmd/backfill-traits --profiles` — full corpus + reader profiles.
5. Flip flags. Watch `/analytics/discovery` love-rate by `reason_type` for a week before touching weights.

## Deliberate simplifications (ponytail)
- `RecomputeTasteOverlaps` is full pairwise. Block by genre cluster past ~5k readers.
- Search `Standalone` penalty is soft (−0.15), not a filter; `is_series` is model-extracted.
- `SurpriseMe` picks from the home pool, not a fresh retrieval.
- No ivfflat index on `books.embedding` — exact scan wins under ~100k rows.
- `popularShelfCount=10` and `hiddenGemMaxGlobalRatings=200` are absolutes sized for a ~100-reader community. Make them corpus percentiles once the community outgrows them.
- `anchorMinSim=0.72` is a calibration knob for Cohere embed-v3 cosine. Eyeball twenty "because you loved X" pairs after backfill and move it.

## Tests added
`event_types_test`, `trait_extractor_test`, `feedback_service_test`, `ranking_test`, `search_intent_test`, `concierge_test`, `taste_overlap_test`, `intelligence_test` — 60+ cases, all no-DB.
