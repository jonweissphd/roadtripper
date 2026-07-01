# Streaming Recs

Personal, cross-platform streaming recommendations driven by **your own taste
list** — not by connecting any streaming accounts.

- **Build a taste list.** Search any movie or show and add it. Mark the ones you
  *really* loved with a **super-like** (weighted much higher).
- **Toggle your services.** Flip on the platforms you actually pay for
  (Netflix, Hulu, Disney+, Max, Prime Video, Apple TV+, Peacock, Paramount+, …).
- **Swipe through picks (Tinder-style).** Swipe right (🔖) to save a pick to your
  watchlist, left (✕) to dismiss, up (★) to super-like into your taste — with
  mouse, touch, the on-screen buttons, or ← ↑ → keys. Every swipe feeds the
  engine, so the deck keeps sharpening. Prefer a bird's-eye view? Toggle to
  **Grid**.
- **Audit your watchlist.** The **Audit** view is a second swipe deck over your
  saved titles: ← removes, → keeps, ↑ ("loved it") promotes the title into your
  taste list and clears it from the watchlist. (Both decks share one generic
  `SwipeStack`.)
- **Save vs. taste, kept separate.** A right-swipe *saves* (a "want to watch"
  marker); it doesn't pollute the taste seeds that drive recommendations. Saved
  and dismissed titles are excluded from future picks.
- **Trailers.** Every card has a ▶ Trailer button that plays the YouTube trailer
  in a lightbox (fetched on demand).
- **Get living recommendations.** Picks are generated from your favorites and
  **filtered to only titles you can stream on your services**, each card showing
  which of *your* platforms has it and *why* it was picked. Change your taste
  list and the results change with it.
- **No account, no login.** Your taste list and toggles live in your browser
  (localStorage) — private to your device.

## How it works

Everything runs on free, official data from **[TMDb](https://www.themoviedb.org/)**:

- `/search/multi` — find titles to add to your taste list.
- `/{movie,tv}/{id}/recommendations` and `/similar` — candidate picks derived
  from each favorite. Candidates are scored by how many of your favorites point
  to them, weighted so **super-likes count ~3×** a normal like.
- `/{movie,tv}/{id}` (credits + keywords) — builds a **taste fingerprint** of the
  cast, directors/creators, and themes you gravitate toward, then uses
  `/discover` (with a provider filter) to surface more titles matching those
  people and keywords. So recs aren't only "others also liked" — they also follow
  *your* actors, directors, and themes.
- `/{movie,tv}/{id}/watch/providers` — streaming availability (powered by
  JustWatch), used to keep only titles available on your enabled services, in the
  **region** you select.

Your TMDb credential lives only on the server; the browser talks to local
`/api/tmdb/*` routes, so the key is never exposed.

## Setup

1. **Get a free TMDb API credential.** Create an account at
   [themoviedb.org](https://www.themoviedb.org/), then go to
   **Settings → API** and request a key. Copy the **API Read Access Token**
   (a long token — preferred) or the v3 **API Key**.

2. **Configure env.**

   ```bash
   cp .env.example .env.local
   # then paste your token into TMDB_ACCESS_TOKEN (or TMDB_API_KEY)
   ```

3. **Install and run.**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000.

## Notes & limitations

- **Availability freshness:** JustWatch/TMDb refresh availability roughly daily,
  so a title added to a service today may take up to ~a day to appear.
- **Region:** availability is looked up for `TMDB_REGION` (default `US`).
- **No personal history from streamers.** Netflix, Hulu, etc. don't expose your
  watch history via any API, which is *by design* here — the app is driven by the
  taste list you curate, so it works for everyone with no account linking.
- **Attribution:** streaming data is provided by JustWatch via TMDb. This product
  uses the TMDb API but is not endorsed or certified by TMDb.

## Architecture

```
app/
  page.tsx                 # the whole client app (taste list, toggles, results)
  api/tmdb/search/route.ts    # title search proxy
  api/tmdb/recommend/route.ts # scoring + availability filtering
  api/tmdb/video/route.ts     # trailer lookup
lib/
  tmdb.ts        # server-only TMDb client (+ in-memory cache)
  recommend.ts   # candidate gathering, affinity, scoring, platform filtering
  platforms.ts   # the toggleable services (TMDb provider ids)
  types.ts       # shared types
  useLocalStore.ts # localStorage-backed state
components/
  SwipeStack.tsx   # generic swipe mechanics (drag/keys/buttons/overlays)
  SwipeDeck.tsx    # recommendations deck (wraps SwipeStack)
  AuditDeck.tsx    # watchlist audit deck (wraps SwipeStack)
  TrailerModal.tsx, Recommendations.tsx (grid), PlatformToggles.tsx,
  RegionSelect.tsx, AddTitleSearch.tsx, TasteList.tsx, SavedList.tsx
```

## Possible next steps

- **Deep links** ("Play on Netflix" buttons): TMDb can't provide these (JustWatch
  agreement), but a small-quota API like Watchmode or the Streaming Availability
  API can be layered in *on-demand per click* to add them cheaply.
- **Undo last swipe** on either deck.
- Optional cloud sync of your taste list and watchlist across devices.
- Region-specific provider maps for fully accurate non-US availability.
- "Hide" list management UI and a "surprise me" wildcard.
