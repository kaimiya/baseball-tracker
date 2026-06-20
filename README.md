# Fantasy Baseball League — live ESPN tracker

React + Vite app that pulls live standings/season stats from the **ESPN Fantasy
Baseball API** for a private league.

## How it works (and why)

ESPN private leagues require two cookies (`ESPN_S2`, `SWID`). Those are secrets —
a Vite app ships all its code to the browser, so the fetch **must** happen
server-side. The flow:

```
Browser → /api/league (your server) → ESPN (with cookies) → mapped JSON → Browser
```

- `api/league.js` — serverless function (Vercel) that holds the cookies and
  returns UI-ready JSON. Browser never sees the cookies.
- `api/_espn.js` — the ESPN fetch + the mapper from ESPN's stat-ID shape to the
  app's `{hr, avg, wins, era}` fields.
- `vite.config.js` — runs that same handler during `npm run dev` so local ==
  production.
- `src/useLeagueData.js` — fetches `/api/league` on page load (always current).

## Local setup

1. `cp .env.example .env.local`
2. Get your ESPN cookies (see below) and paste them into `.env.local`.
3. `npm install && npm run dev` → http://localhost:5173

### Getting ESPN_S2 and SWID from Chrome

1. Log in at **fantasy.espn.com** (so you're authenticated to the private league).
2. Open DevTools: `View → Developer → Developer Tools`, or `⌥⌘I`.
3. Go to the **Application** tab → left sidebar **Storage → Cookies** →
   `https://fantasy.espn.com`.
4. Find the row named **`espn_s2`** → copy its **Value** (long string) → paste as
   `ESPN_S2=` in `.env.local`.
5. Find the row named **`SWID`** → copy its **Value** (looks like `{XXXXXXXX-...}`,
   braces included) → paste as `SWID=` in `.env.local`.
6. Restart `npm run dev`.

> Cookies expire periodically. If the app shows a 401, repeat the steps to refresh them.

### Debugging the data shape

- `http://localhost:5173/api/league?raw=1` — raw base league payload.
- `http://localhost:5173/api/league?raw=1&scoringPeriodId=2` — raw single-week
  payload (per-week category stats live in
  `schedule[].home.cumulativeScore.scoreByStat`).

## Deploying to Vercel

1. Push this folder to a Git repo and import it at vercel.com (framework preset:
   **Vite**, auto-detected). `/api/*` deploys as serverless functions
   automatically.
2. In **Project → Settings → Environment Variables**, add (Production +
   Preview + Development):
   - `ESPN_S2` = your espn_s2 value
   - `SWID` = your SWID value (with braces)
   - `ESPN_LEAGUE_ID` = `72471798`
   - `ESPN_SEASON_ID` = `2026`
   - `ESPN_TEAM_ID` = `3`
3. Deploy. The serverless function reads these from `process.env` — secrets stay
   server-side and are never bundled into the browser.

## Notes

- **Weekly history is live.** `buildLeague()` in `api/_espn.js` makes one base
  call plus one call per played week (in parallel) and reads each week's category
  totals from `cumulativeScore.scoreByStat`. Weekly HR/Wins sum exactly to the
  season totals.
- Week date ranges are generated from a fixed anchor: **Week 1 = Mar 25–Apr 5**,
  then standard Mon–Sun weeks. Adjust `WEEK1` / `WEEK2_START` in `api/_espn.js`
  if the league calendar changes.
- Standings AVG/ERA are the mean of the weekly rates (the app's original model),
  so they can differ by a hair from ESPN's volume-weighted season figure. HR and
  Wins are exact.
- "My team" highlight keys off `ESPN_TEAM_ID` (3), not a hardcoded name.
- Standings are ordered by ESPN seed and show team logos + W-L-T record, mirroring
  the ESPN Fantasy app.
- The app is a read-only live dashboard (no manual add/edit). Header shows the
  last-synced time with a refresh button, plus a light/dark theme toggle
  (persisted to `localStorage`). Theme palettes live in `src/theme.js`.
