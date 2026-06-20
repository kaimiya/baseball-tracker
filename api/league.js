// Vercel serverless function: GET /api/league
// Holds the private ESPN cookies server-side and returns UI-ready JSON with
// per-week history. Debug:
//   ?raw=1                     -> raw base league payload
//   ?raw=1&scoringPeriodId=2   -> raw single-week payload (per-week stats)
//   ?fresh=1                   -> bypass the cache (used by the refresh button)
import { fetchBase, fetchPeriod, buildLeague } from "./_espn.js";

// ~60s response cache. The CDN header handles cross-request caching on Vercel;
// this in-memory memo additionally short-circuits repeat hits on a warm instance
// (and gives the same behavior in local dev).
const TTL_MS = 60 * 1000;
const CACHE_HEADER = "s-maxage=60, stale-while-revalidate=300";
let memo = null; // { at: number, payload: object }

export default async function handler(req, res) {
  const leagueId = process.env.ESPN_LEAGUE_ID || "72471798";
  const seasonId = process.env.ESPN_SEASON_ID || "2026";
  const myTeamId = process.env.ESPN_TEAM_ID || "3";
  const espnS2 = process.env.ESPN_S2;
  const swid = process.env.SWID;

  if (!espnS2 || !swid) {
    res.status(500).json({
      error:
        "Server is missing ESPN_S2 / SWID. Add them to .env.local (local) or the Vercel project env vars (production).",
    });
    return;
  }

  try {
    const q = new URL(req.url, "http://localhost").searchParams;

    if (q.get("raw") === "1") {
      const sp = q.get("scoringPeriodId");
      const raw = sp != null
        ? await fetchPeriod({ leagueId, seasonId, espnS2, swid, scoringPeriodId: sp })
        : await fetchBase({ leagueId, seasonId, espnS2, swid });
      res.status(200).json(raw);
      return;
    }

    const force = q.get("fresh") === "1";
    const now = Date.now();

    if (!force && memo && now - memo.at < TTL_MS) {
      res.setHeader("cache-control", CACHE_HEADER);
      res.status(200).json(memo.payload);
      return;
    }

    const payload = await buildLeague({ leagueId, seasonId, espnS2, swid, myTeamId });
    memo = { at: now, payload };
    res.setHeader("cache-control", force ? "no-store" : CACHE_HEADER);
    res.status(200).json(payload);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || "ESPN request failed", detail: e.detail });
  }
}
