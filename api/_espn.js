// Shared ESPN Fantasy Baseball client + mapper.
// Used by both the Vercel serverless function (api/league.js) and the Vite dev
// middleware. Filename starts with "_" so Vercel does NOT expose it as a route.

const HOST = "https://lm-api-reads.fantasy.espn.com";

// ESPN "flb" (fantasy baseball) stat IDs. JSON keys come back as strings.
export const STAT_IDS = {
  HR: "5",    // batting: home runs
  AVG: "2",   // batting: average
  W: "53",    // pitching: wins
  ERA: "47",  // pitching: earned run average
};

// Color palette assigned to teams by index. The UI's highlight keys off the
// team id (ESPN_TEAM_ID), not the color, so ordering is all that matters here.
const PALETTE = [
  "#f97316", "#3b82f6", "#8b5cf6", "#10b981",
  "#ec4899", "#f59e0b", "#06b6d4", "#6366f1",
];

// Week 1 is a long opening week per the league: Mar 25 – Apr 5, 2026.
// Every week after that is a standard Mon–Sun, starting Apr 6.
const SEASON_YEAR = 2026;
const WEEK1 = { start: [2, 25], end: [3, 5] }; // [monthIndex, day]
const WEEK2_START = [3, 6];

// SWID is normally wrapped in braces, e.g. {ABCD-...}. Accept it either way.
export function normalizeSwid(swid) {
  let s = String(swid || "").trim();
  if (!s) return s;
  if (!s.startsWith("{")) s = "{" + s;
  if (!s.endsWith("}")) s = s + "}";
  return s;
}

async function getJson(url, espnS2, swid) {
  const res = await fetch(url, {
    headers: {
      cookie: `espn_s2=${espnS2}; SWID=${normalizeSwid(swid)}`,
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (fantasy-baseball-tracker)",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(
      res.status === 401
        ? "ESPN rejected the cookies (401). Your ESPN_S2 / SWID are missing, expired, or wrong."
        : `ESPN API error ${res.status} ${res.statusText}`
    );
    err.status = res.status === 401 ? 401 : 502;
    err.detail = body.slice(0, 400);
    throw err;
  }
  return res.json();
}

// Base league snapshot: teams, settings (schedule), status, schedule skeleton.
export function fetchBase({ leagueId, seasonId, espnS2, swid }) {
  const views = ["mTeam", "mStandings", "mSettings", "mScoreboard"];
  const qs = views.map((v) => `view=${v}`).join("&");
  const url = `${HOST}/apis/v3/games/flb/seasons/${seasonId}/segments/0/leagues/${leagueId}?${qs}`;
  return getJson(url, espnS2, swid);
}

// Team rosters for a scoring period (today's lineups, with lineupSlotId per player).
export function fetchRosters({ leagueId, seasonId, espnS2, swid, scoringPeriodId }) {
  const sp = scoringPeriodId != null ? `&scoringPeriodId=${scoringPeriodId}` : "";
  const url = `${HOST}/apis/v3/games/flb/seasons/${seasonId}/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam${sp}`;
  return getJson(url, espnS2, swid);
}

// A single scoring period: schedule matchups carry cumulativeScore.scoreByStat
// (the real per-week category totals) only when scoped to a scoringPeriodId.
export function fetchPeriod({ leagueId, seasonId, espnS2, swid, scoringPeriodId }) {
  // mScoreboard supplies cumulativeScore.scoreByStat (the stat values);
  // mMatchupScore supplies matchupPeriodId so we can pick the right week.
  const url = `${HOST}/apis/v3/games/flb/seasons/${seasonId}/segments/0/leagues/${leagueId}?view=mScoreboard&view=mMatchupScore&scoringPeriodId=${scoringPeriodId}`;
  return getJson(url, espnS2, swid);
}

function num(v) {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

// Rate-stat components so the client can fold in live deltas:
// H=1, AB=0, ER=45, outs(IP*3)=34.
const EMPTY = { hr: 0, avg: 0, wins: 0, era: 0, h: 0, ab: 0, er: 0, outs: 0 };

// Pull the four stats (+ components) out of a matchup's scoreByStat map.
function statsFromScoreByStat(sbs) {
  const score = (id) => num(sbs[id] && sbs[id].score);
  return {
    hr: score(STAT_IDS.HR), avg: score(STAT_IDS.AVG), wins: score(STAT_IDS.W), era: score(STAT_IDS.ERA),
    h: score("1"), ab: score("0"), er: score("45"), outs: score("34"),
  };
}

// Season totals (+ components) from valuesByStat.
function seasonStats(team) {
  const v = team.valuesByStat;
  if (!v) return { ...EMPTY };
  return {
    hr: num(v[STAT_IDS.HR]), avg: num(v[STAT_IDS.AVG]), wins: num(v[STAT_IDS.W]), era: num(v[STAT_IDS.ERA]),
    h: num(v["1"]), ab: num(v["0"]), er: num(v["45"]), outs: num(v["34"]),
  };
}

export function teamName(team) {
  if (team.name && String(team.name).trim()) return String(team.name).trim();
  const full = `${team.location || ""} ${team.nickname || ""}`.trim();
  return full || `Team ${team.id}`;
}

// Logos hosted on mystique-api require ESPN auth (they 401 for the browser).
// Route those through our own image proxy; public CDN logos pass through as-is.
function proxiedLogo(url) {
  if (!url) return null;
  if (url.includes("mystique-api.fantasy.espn.com")) {
    return `/api/logo?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function managerName(team, memberById) {
  const id = team.primaryOwner || (Array.isArray(team.owners) && team.owners[0]);
  const m = id && memberById[id];
  if (!m) return null;
  const full = `${m.firstName || ""} ${m.lastName || ""}`.trim();
  return full || m.displayName || null;
}

function utc(monthIndex, day) {
  return new Date(Date.UTC(SEASON_YEAR, monthIndex, day));
}

function fmtDate(d) {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Human date range for a given 1-based week number.
function weekLabel(n) {
  if (n === 1) {
    return `${fmtDate(utc(...WEEK1.start))} – ${fmtDate(utc(...WEEK1.end))}`;
  }
  const start = utc(...WEEK2_START);
  start.setUTCDate(start.getUTCDate() + (n - 2) * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

// Orchestrates the full live build:
//   1) one base call for teams / schedule settings / current week
//   2) one call per played week (in parallel) for per-week category stats
//   3) assemble into the UI shape, with date labels per week.
export async function buildLeague({ leagueId, seasonId, espnS2, swid, myTeamId }) {
  const base = await fetchBase({ leagueId, seasonId, espnS2, swid });
  const teams = Array.isArray(base.teams) ? base.teams : [];
  const numWeeks = num(base.status && base.status.currentMatchupPeriod);
  const periodMap = (base.settings && base.settings.scheduleSettings && base.settings.scheduleSettings.matchupPeriods) || {};

  // Week N -> the scoring period that holds its final stats (last day of week).
  const weeks = [];
  for (let w = 1; w <= numWeeks; w++) {
    const sps = periodMap[String(w)];
    const sp = Array.isArray(sps) && sps.length ? Math.max(...sps) : w;
    weeks.push({ week: w, sp });
  }

  // Fetch every played week in parallel; tolerate the odd failed week.
  const periodResults = await Promise.all(
    weeks.map(async ({ week, sp }) => {
      try {
        return { week, raw: await fetchPeriod({ leagueId, seasonId, espnS2, swid, scoringPeriodId: sp }) };
      } catch {
        return { week, raw: null };
      }
    })
  );

  // teamId -> { weekNumber -> {hr,avg,wins,era} }
  const byTeamWeek = {};
  for (const { week, raw } of periodResults) {
    if (!raw || !Array.isArray(raw.schedule)) continue;
    for (const m of raw.schedule) {
      if (m.matchupPeriodId !== week) continue;
      for (const side of ["home", "away"]) {
        const s = m[side];
        const sbs = s && s.cumulativeScore && s.cumulativeScore.scoreByStat;
        if (!s || !sbs) continue;
        (byTeamWeek[s.teamId] = byTeamWeek[s.teamId] || {})[week] = statsFromScoreByStat(sbs);
      }
    }
  }

  const players = [];
  const colors = {};
  const logos = {};
  const records = {};
  const seeds = {};
  const managers = {};
  const data = {};
  const seasonTotals = {}; // exact ESPN season figures (valuesByStat), not derived from weeks
  let myTeam = null;

  const memberById = {};
  (base.members || []).forEach(m => { memberById[m.id] = m; });

  teams.forEach((team, i) => {
    let name = teamName(team);
    if (data[name]) name = `${name} (${team.id})`; // avoid duplicate-name key collisions
    players.push(name);
    colors[name] = PALETTE[i % PALETTE.length];
    logos[name] = proxiedLogo(team.logo);

    const rec = team.record && (team.record.overall || team.record.division);
    records[name] = rec ? `${num(rec.wins)}-${num(rec.losses)}-${num(rec.ties)}` : null;
    seeds[name] = num(team.playoffSeed) || null;
    managers[name] = managerName(team, memberById);
    seasonTotals[name] = seasonStats(team); // exact season AVG/ERA/HR/W from ESPN

    const tw = byTeamWeek[team.id] || {};
    const rows = [];
    for (let w = 1; w <= numWeeks; w++) {
      if (tw[w]) rows.push(tw[w]);
    }
    // Fallback to a single season-total "week" if weekly data is missing.
    data[name] = rows.length ? rows : [seasonStats(team)];

    if (String(team.id) === String(myTeamId)) myTeam = name;
  });

  // Display order: by ESPN standings seed (1st at top).
  players.sort((a, b) => (seeds[a] || 999) - (seeds[b] || 999));

  const weekLabels = [];
  for (let w = 1; w <= numWeeks; w++) weekLabels.push(weekLabel(w));
  if (!weekLabels.length) weekLabels.push("Season");

  return {
    players,
    colors,
    logos,
    records,
    seeds,
    managers,
    data,
    seasonTotals,
    myTeam,
    weekLabels,
    meta: {
      leagueName: base.settings && base.settings.name ? base.settings.name : null,
      seasonId: base.seasonId || null,
      teamCount: teams.length,
      weeks: numWeeks,
      fetchedAt: new Date().toISOString(),
    },
  };
}
