# Fusion — build log (2026-09-13)

Two readers' shelves side by side, made from a one-time link. Like Spotify
Blend: you get a link, send it to one person, and when they open it and tap
Fuse the story is built from both profiles.

Design source: `Paperboxd design elements/fusion-v3/` (prototype with the
missing screens added: Invite, Your Fusions, Sign in, Join, They joined, and
the four link states). Open `Paperboxd Fusion v3.html` over a local server.

## Flow

```
You                              Them
Profile → Create a Fusion        opens paperboxd.in/fusion/<token>
        → Invite (link, share)   → web join page (sign in if needed)
                                 → app: Join → tap Fuse
        ← "X fused with you"     → Analyzing → Story (10 pages) → Explore
        → Play your Fusion
```

## Backend (`paperboxd-backend`)

- Migration `000048_fusions`: `fusion_invites` (token pk, inviter, expires,
  cancelled, consumed) and `fusions` (one row per pair, `user_a < user_b`,
  `snapshot` jsonb with the story from each side).
- `internal/service/fusion.go`: invites, accept (row-locked, first to tap
  wins, blocked pairs read as unavailable), list, get (rebuilds the snapshot
  when either `bookshelf.updated_at` is newer or after 24h), delete.
- `internal/service/fusion_view.go`: pure story assembly. Score is
  `ComputeOverlap` from `taste_overlap.go`. Agree/Split use trait axes when
  both profiles have signal, else fall back to shared genres, median page
  count and genre share. Picks come from both readers' home recommendations,
  filtered to books neither has shelved; a book on both lists is the
  "Strong Fusion pick". Empty sections are empty arrays; clients skip
  those pages. `low_data` when a shelf has < 3 books or < 3 shared and no
  traits.
- Routes under `/api/v1/fusions` (see `MOBILE_API.md` §3.12). Preview is
  optional-auth so the web join page renders signed out.
- Accepting writes a `fusion_joined` activity addressed to the inviter
  (`metadata.fusion_id`); `queries/activities.sql` keeps it out of profile
  and follower feeds.
- Tests: `fusion_test.go` (story assembly from both sides, picks unread by
  both, wildcard genre gate, low data, token validity).

## Web (`paperboxd`)

- `app/fusion/[token]/page.tsx` + `components/ui/fusion/fusion-join.tsx`:
  join page (sign in → Fuse → "Open in the app"), plus own/used/expired/
  unavailable states. No story on web.
- `components/ui/fusion/pending-fusion.tsx`: remembers the token across
  sign-in and sends the reader back from `/`.
- `public/.well-known/apple-app-site-association` (team `JHJZJSU6SA`,
  `/fusion/*`), served as JSON via `next.config.ts` headers.
- `fusion_joined` rendered in `lib/activity-transform.ts`.

## iOS (`paperboxd-ios`)

- `Features/Fusion/`: `FusionKit` (Swiss kit over the Wrapped motion
  primitives), `FusionChapters` (10 pages), `FusionPlayerView` (player,
  Explore, share card), `FusionRootView` (route → join / analyzing / joined /
  story / states), `FusionsSection` (profile section, Create sheet, Invite).
- `Models/Fusion.swift` mirrors the Go JSON; `PreviewData.fusionStory` is
  decoded from JSON the Go builder produced.
- `AppState.fusionRoute` (+ `handleIncomingURL`) presents `FusionRootView` as
  a full-screen cover over `MainTabView`. A link opened signed out waits in
  UserDefaults until sign-in.
- Entitlements: `applinks:paperboxd.in`. Info.plist: `paperboxd://` scheme.
- Notifications: `fusion_joined` tap opens the Fusion with the "X fused with
  you" intro.
- Known fix: reading the window's safe-area insets during the player's body
  caused an AttributeGraph cycle that froze page 1; chrome now lives in an
  `.overlay` and uses layout safe areas.

## Android (`paperboxd-android`)

- `ui/screens/fusion/`: `FusionKit`, `FusionChapters`, `FusionStoryScreen`
  (player, Explore, share card), `FusionFlow` (view model + root + join /
  analyzing / joined / states), `FusionsSection` (profile section + Create
  sheet + Invite).
- `domain/model/Fusion.kt`, `data/repository/FusionRepository.kt`,
  `ApiService` endpoints.
- `AppState.fusionRoute` (+ `handleIncomingUri`, pending token in
  `SecurePrefs`), rendered by `MainScaffold` above the dock;
  `LocalFusionRouting` lets the profile section and the notifications sheet
  open one.
- Manifest: `/fusion/` added to the verified `paperboxd.in` filter, plus a
  `paperboxd://fusion` filter. `MainActivity.onNewIntent` handles warm links.
- Not screenshot-verified: the only AVD has no system image installed.
  Compiles clean; layouts are line-for-line twins of the iOS pages that were
  verified in the simulator.

## Not done / decisions

- No push notification: the inviter learns via the in-app Updates sheet.
- Deferred deep links (link → install → open) are not handled; the web join
  page completes the Fusion on its own, and the app then lists it.
- `assetlinks.json` still has placeholder fingerprints, so Android App Links
  are not verified in prod yet; the `paperboxd://` scheme covers the "Open in
  the app" button meanwhile.
- Trait backfill has not run in prod, so Agree/Split will use the genre and
  page-count fallbacks until it does.
