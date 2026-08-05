# Fantasy Baseball League Tracker

A live, single-page view of a private ESPN fantasy baseball league, focused on **four categories only: HR, Batting AVG, Wins, ERA**. Built by Kaili Miyamoto (principal designer) for the league "If Can Can, No Can Garbage Can". Deployed at **https://if-can-can.vercel.app**.

This is a **standalone project** — it has nothing to do with `solo-sherpa` (an unrelated repo the early sessions happened to be rooted in). Open this folder as its own project.

## Stack & architecture
- **Vite + React 18**, one inline-styled component: `src/BaseballTracker.jsx`.
- **Serverless proxy pattern** so secrets stay server-side: handlers live in `/api/*.js` (Vercel functions in prod; the same files are run by Vite dev middleware locally via `vite.config.js`).
- Theming via `src/theme.js` (light/dark tokens + localStorage), fonts/reset/responsive CSS in `index.html`.

## Key files
- `src/BaseballTracker.jsx` — the whole UI (header, King Category Awards, Standings, Weekly Splits).
- `src/useLeagueData.js` — fetches `/api/league` on mount + silent 60s auto-refresh.
- `src/useLiveToday.js` — polls `/api/live` (~30s) for today's live MLB deltas.
- `api/_espn.js` — ESPN Fantasy client + mapper (`buildLeague`). Stat IDs: HR=5, AVG=2, W=53, ERA=47; rate components H=1, AB=0, ER=45, outs(IP×3)=34.
- `api/_mlb.js` — MLB Stats API client (`statsapi.mlb.com`). Real-time per–at-bat data.
- `api/live.js` — `GET /api/live`: today's per-team live stats (ESPN active lineup × MLB live).
- `api/league.js` — `GET /api/league`: full league snapshot (season totals + weekly splits).
- `api/logo.js` — image proxy for ESPN mystique-api logos (they 401 without cookies).

## Data model & math (verified correct — do not "fix" casually)
- **Season totals come from ESPN's `team.valuesByStat`** (exact, volume-weighted). AVG = total H/AB, ERA = 9×ER/IP. **Never average weekly rate stats** — that was a real bug; averaging the 12 weekly AVGs ≠ the season AVG.
- **Weekly splits** come from `schedule[].{home,away}.cumulativeScore.scoreByStat`, which requires BOTH `view=mScoreboard` AND `view=mMatchupScore` WITH a `scoringPeriodId`.
- **The four categories must be consistent** across King Category Awards (season leaders), Standings (season totals), and Weekly Splits (per week). If they don't match, the app makes no sense. This is the core product principle.

## Live fold (the `+/-` deltas + LIVE badge)
ESPN's public `lm-api-reads` feed lags their own app, so we fold **today's MLB games** on top of ESPN's base to stay real-time:
- Base = ESPN `valuesByStat`. Live add = today's MLB games (**Live AND Final** — finals are included because ESPN doesn't absorb a game the instant it ends; excluding them left a gap).
- **HR & Wins**: added exactly. **AVG & ERA**: recomputed from components (H/AB, ER/IP) — never faked. `foldLive()` in `BaseballTracker.jsx` does this.
- The per-row green `+N` deltas (Standings) and the current-week fold (Weekly Splits) come from `live.teams`.
- Small caveat: HR/Wins live numbers are exact; AVG/ERA are close but approximate, with a brief handoff moment when a game goes final before ESPN counts it.

### ⚠️ Timezone: use the US Pacific date for "today", not UTC
`api/live.js` computes the date with `toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })`. Do **not** use `toISOString()` — after ~5pm Pacific, UTC has rolled to tomorrow and we'd fetch the next day's empty slate, silently dropping every live stat and the LIVE badge.

## Layout notes (desktop)
- Standings and Weekly Splits share the same fixed column geometry so **HR/AVG/Wins/ERA line up vertically between the two tables**. Both use `table-layout: fixed` (desktop only) with the stat columns at `9%` starting at `64%` (tight, grouped on the right, left-justified). Record sits right after Team; its wide column is the reading gap. See the `@media (min-width: 601px)` block in `index.html`.
- **Mobile** (`≤600px`): tables stay `table-layout: auto` and scroll horizontally.

## ⚠️ Deployment & workflow constraints
- **Push via GitHub Desktop, signed in as `kaimiya`** — NOT terminal `git push`. The cached terminal credential is a work account (`kmiyamoto_microsoft`) that 403s on this personal repo.
- **Secrets are server-side only.** `ESPN_S2` and `SWID` live in `.env.local` (gitignored) and Vercel env vars. Never put them in the client bundle, never print/echo the values, never paste them in chat.
- **Vercel** auto-deploys `main`. Custom domain: `if-can-can.vercel.app`. `/api/live` needs only the public MLB API + the existing ESPN env vars.
- League specifics: leagueId `72471798`, season `2026`, Kaili's teamId `3` (= "Bayside Crawniks"). Bench/IL lineup slots excluded from the live fold: `{16, 17}`.

## Local dev
- `npm run dev` → http://localhost:5173 (see `.claude/launch.json`). `npm run build` to verify.
- `npm run storybook` → :6006 (a paused design-system exploration lives on the `design-system` branch; `main` uses the simpler theming).
