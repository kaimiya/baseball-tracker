// Live game data from MLB's public Stats API (statsapi.mlb.com). This is the
// real-time source ESPN's own app uses internally but doesn't expose — it
// updates per at-bat, ahead of ESPN's fantasy stats feed.

const MLB = "https://statsapi.mlb.com/api/v1";

// Normalize a player name for matching ESPN ↔ MLB (accents, punctuation, suffixes).
export function norm(s) {
  return (s || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'']/g, "")
    .replace(/-/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function j(url) {
  const r = await fetch(url, { headers: { "user-agent": "fantasy-baseball-tracker" } });
  if (!r.ok) throw new Error(`MLB ${r.status}`);
  return r.json();
}

function ipToOuts(ip) {
  if (ip == null) return 0;
  const [whole, frac] = String(ip).split(".");
  return (parseInt(whole) || 0) * 3 + (parseInt(frac) || 0); // "5.1" -> 16 outs
}

// Build today's per-player live stat line, keyed by normalized name.
export async function fetchLiveToday(date) {
  const sch = await j(`${MLB}/schedule?sportId=1&date=${date}`);
  const allGames = (sch.dates && sch.dates[0] && sch.dates[0].games) || [];
  // Only REGULAR-SEASON games count toward fantasy. The MLB schedule also lists
  // the All-Star Game (gameType "A"), spring training ("S"), and exhibitions
  // ("E") — ESPN Fantasy ignores those, so folding them in over-counts (e.g. an
  // All-Star Game HR/win that never actually counts). Keep gameType "R" only.
  const games = allGames.filter((g) => g.gameType === "R");
  // Count today's games that have produced stats: IN-PROGRESS *and* FINAL.
  // ESPN's public feed lags on both — it does NOT absorb a game the instant it
  // ends (a just-final HR shows in ESPN's own app but not yet in lm-api-reads),
  // so excluding finals leaves a gap where neither source counts the play.
  // Folding live + just-finished games on top of ESPN's (yesterday-ish) base
  // keeps us real-time. Games not yet started (Preview) contribute nothing.
  const counted = games.filter((g) => {
    const s = g.status && g.status.abstractGameState;
    return s === "Live" || s === "Final";
  });

  const boxes = await Promise.all(
    counted.map((g) => j(`${MLB}/game/${g.gamePk}/boxscore`).catch(() => null))
  );

  const byName = {};
  for (const bs of boxes) {
    if (!bs) continue;
    for (const side of ["away", "home"]) {
      const players = (bs.teams && bs.teams[side] && bs.teams[side].players) || {};
      for (const pid in players) {
        const pp = players[pid];
        const nm = norm(pp.person && pp.person.fullName);
        if (!nm) continue;
        const b = (pp.stats && pp.stats.batting) || {};
        const p = (pp.stats && pp.stats.pitching) || {};
        const cur = byName[nm] || (byName[nm] = { hr: 0, r: 0, rbi: 0, sb: 0, h: 0, ab: 0, w: 0, k: 0, er: 0, outs: 0 });
        if (Object.keys(b).length) {
          cur.hr += b.homeRuns || 0; cur.r += b.runs || 0; cur.rbi += b.rbi || 0;
          cur.sb += b.stolenBases || 0; cur.h += b.hits || 0; cur.ab += b.atBats || 0;
        }
        if (Object.keys(p).length) {
          cur.w += p.wins || 0; cur.k += p.strikeOuts || 0;
          cur.er += p.earnedRuns || 0; cur.outs += ipToOuts(p.inningsPitched);
        }
      }
    }
  }

  return {
    byName,
    gamesTotal: games.length,
    gamesLive: games.filter((g) => g.status && g.status.abstractGameState === "Live").length,
    gamesFinal: games.filter((g) => g.status && g.status.abstractGameState === "Final").length,
    date,
  };
}
