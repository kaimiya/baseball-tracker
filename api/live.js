// GET /api/live — today's LIVE per-team stats, pulled from MLB's real-time API
// (statsapi.mlb.com) and matched to each team's active lineup from ESPN. This is
// the live layer ESPN's fantasy feed lags on.
import { fetchRosters, teamName } from "./_espn.js";
import { fetchLiveToday, norm } from "./_mlb.js";

// ESPN flb bench / IL lineup slots — players in these don't count for the day.
const BENCH_SLOTS = new Set([16, 17]);
const KEYS = ["hr", "r", "rbi", "sb", "h", "ab", "w", "k", "er", "outs"];

export default async function handler(req, res) {
  const leagueId = process.env.ESPN_LEAGUE_ID || "72471798";
  const seasonId = process.env.ESPN_SEASON_ID || "2026";
  const espnS2 = process.env.ESPN_S2;
  const swid = process.env.SWID;
  if (!espnS2 || !swid) {
    res.status(500).json({ error: "Server is missing ESPN_S2 / SWID." });
    return;
  }

  try {
    // Use the US (Pacific) calendar date, not UTC. After ~5pm Pacific, UTC has
    // already rolled to "tomorrow", so toISOString() would make us fetch the
    // next day's empty slate and drop every live stat. Pacific keeps us on
    // today's games until they're actually finished.
    const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    const [rosters, live] = await Promise.all([
      fetchRosters({ leagueId, seasonId, espnS2, swid }),
      fetchLiveToday(date),
    ]);

    const teams = {};
    for (const team of rosters.teams || []) {
      const name = teamName(team);
      const agg = Object.fromEntries(KEYS.map((k) => [k, 0]));
      const contributors = [];
      for (const e of (team.roster && team.roster.entries) || []) {
        if (BENCH_SLOTS.has(e.lineupSlotId)) continue;
        const p = e.playerPoolEntry && e.playerPoolEntry.player;
        const s = p && live.byName[norm(p.fullName)];
        if (!s) continue;
        for (const k of KEYS) agg[k] += s[k];
        if (s.hr || s.r || s.rbi || s.sb || s.k || s.w) {
          contributors.push({ name: p.fullName, hr: s.hr, r: s.r, rbi: s.rbi, sb: s.sb, k: s.k, w: s.w });
        }
      }
      teams[name] = { ...agg, contributors };
    }

    // Short edge cache so many viewers share one upstream MLB pull, still ~live.
    res.setHeader("cache-control", "s-maxage=20, stale-while-revalidate=40");
    res.status(200).json({
      teams,
      date,
      gamesLive: live.gamesLive,
      gamesFinal: live.gamesFinal,
      gamesTotal: live.gamesTotal,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || "live fetch failed", detail: e.detail });
  }
}
