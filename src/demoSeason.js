// ─────────────────────────────────────────────────────────────────────────────
// The demo season — a STORYBOARD, not a simulation.
//
// INVENTED teams, INVENTED numbers. This file must never be wired to
// /api/league. The landing page is a sample, not a club: publishing a private
// league's real names and standings isn't ours to do. The real board lives
// behind /if-can-can and that's the only place real data belongs.
//
// Because it's a demo, every move in it is placed on purpose. The source of
// truth is the SCHEDULE below — an opening order and a list of passes, one per
// beat. The numbers are derived from the schedule, not the other way round.
//
// Two failure modes this replaces, both measured off the previous version:
//   · RANDOM churn — seven positions changing in one week reads as noise. You
//     can't watch it, so it means nothing.
//   · DEAD AIR — ten consecutive weeks where nothing moved at all, which was
//     most of the scroll.
// One clean pass per beat, evenly spaced, with a deliberate hold before the
// finish so the ending lands.
//
//   THE STORY — Can Of Corn owns April. Warning Track takes over and leads for
//   the rest of the season. Rally Caps starts 7th and climbs all year. Warning
//   Track holds them off for three straight weeks — then loses it on the last
//   day, 268 to 266.
//
// Every category has its own winner, so the tabs are worth clicking. Rally Caps
// wins the home runs and has the worst ERA in the league; Golden Sombrero is
// last in homers and first in ERA. Different bets, different winners — which is
// the entire point of paying out by category.
// ─────────────────────────────────────────────────────────────────────────────

export const WEEKS = 16;

export const DEMO_WEEK_LABELS = [
  "Mar 27 – Apr 6",  "Apr 7 – Apr 17",  "Apr 18 – Apr 28", "Apr 29 – May 9",
  "May 10 – May 20", "May 21 – May 31", "Jun 1 – Jun 11",  "Jun 12 – Jun 22",
  "Jun 23 – Jul 3",  "Jul 4 – Jul 14",  "Jul 15 – Jul 25", "Jul 26 – Aug 5",
  "Aug 6 – Aug 16",  "Aug 17 – Aug 27", "Aug 28 – Sep 7",  "Sep 8 – Sep 28",
];

const CRESTS = {
  "Rally Caps": "/logos/demo/1.png",
  "Warning Track": "/logos/demo/2.png",
  "The Cutoff Man": "/logos/demo/3.png",
  "Foul Territory": "/logos/demo/4.png",
  "Bush League": "/logos/demo/5.png",
  "Can Of Corn": "/logos/demo/6.png",
  "Pinch Runners": "/logos/demo/1.png",
  "Golden Sombrero": "/logos/demo/2.png",
};

export const DEMO_TEAMS = Object.keys(CRESTS).map((name) => ({ name, crest: CRESTS[name] }));

// A pass is [week, team] — that team moves up one place, swapping with whoever
// is directly above it. One per beat, so you always see exactly one team pass
// exactly one other and can follow it.
//
// ── HOME RUNS ───────────────────────────────────────────────────────────────
// Rally Caps 7th → 1st across the season. Weeks 14 and 15 hold deliberately:
// Rally sits 2nd and closes the gap without passing, so the last beat lands.
const HR_OPENING = [
  "Can Of Corn", "Warning Track", "The Cutoff Man", "Bush League",
  "Golden Sombrero", "Foul Territory", "Rally Caps", "Pinch Runners",
];
const HR_PASSES = [
  [2,  "Warning Track"],    // takes the lead off Can Of Corn and keeps it to the wire
  [3,  "The Cutoff Man"],
  [4,  "Rally Caps"],       // the climb starts — 7th to 6th
  [5,  "Rally Caps"],
  [6,  "Foul Territory"],
  [7,  "Rally Caps"],
  [8,  "Rally Caps"],       // into the top three
  [9,  "Foul Territory"],
  [10, "Foul Territory"],
  [11, "Rally Caps"],       // 2nd, and now it's a two-horse race
  [12, "Bush League"],
  [13, "Pinch Runners"],
  //   14, 15 — held. Rally closes on Warning Track but can't get past.
  [16, "Rally Caps"],       // the last day
];
// Leader's running total, the spread from 1st to 8th, and the final gaps. The
// spread WIDENS over a season of counting stats — April is a scrum, September
// is settled — and the top gap closes to 2 so the finish is a photo.
const HR_SHAPE = { lead: [20, 268], spread: [14, 63], gaps: [2, 17, 8, 9, 8, 8, 11] };

// ── WINS ────────────────────────────────────────────────────────────────────
// A different arc and a different winner: Foul Territory starts 7th and wins.
const W_OPENING = [
  "Bush League", "Warning Track", "Can Of Corn", "The Cutoff Man",
  "Rally Caps", "Golden Sombrero", "Foul Territory", "Pinch Runners",
];
const W_PASSES = [
  [2,  "Foul Territory"], [3,  "Foul Territory"], [4,  "Pinch Runners"],
  [5,  "Foul Territory"], [6,  "Rally Caps"],     [7,  "Foul Territory"],
  [9,  "Foul Territory"], [10, "Rally Caps"],     [11, "Foul Territory"],
  [13, "The Cutoff Man"], [15, "Pinch Runners"],
];
const W_SHAPE = { lead: [6, 96], spread: [8, 27], gaps: [5, 3, 4, 4, 3, 4, 4] };

// ── BATTING AVERAGE ─────────────────────────────────────────────────────────
// Rates behave the OPPOSITE way to counting stats: the spread NARROWS as the
// denominator grows. A .300 hitter in April and a .240 hitter in April are 60
// points apart; by September they're 27. That convergence is the honest shape
// of a rate stat and it's why the early weeks look wild.
const AVG_OPENING = [
  "Rally Caps", "Warning Track", "Foul Territory", "The Cutoff Man",
  "Golden Sombrero", "Can Of Corn", "Bush League", "Pinch Runners",
];
const AVG_PASSES = [
  [3, "The Cutoff Man"], [4, "Can Of Corn"],   [6, "The Cutoff Man"],
  [7, "Can Of Corn"],    [8, "The Cutoff Man"], [9, "Pinch Runners"],
  [11, "Warning Track"], [12, "Bush League"],  [14, "Pinch Runners"],
];
const AVG_SHAPE = { lead: [0.312, 0.271], spread: [0.104, 0.027], gaps: [5, 4, 4, 3, 3, 4, 4] };

// ── ERA ─────────────────────────────────────────────────────────────────────
// Lower is better, so the leader's figure is the SMALLEST and the gaps add
// rather than subtract. Converges like batting average, for the same reason.
const ERA_OPENING = [
  "Pinch Runners", "Golden Sombrero", "Can Of Corn", "Warning Track",
  "Bush League", "Foul Territory", "The Cutoff Man", "Rally Caps",
];
const ERA_PASSES = [
  [3, "Golden Sombrero"], [5, "Bush League"],   [7, "Can Of Corn"],
  [8, "Foul Territory"],  [10, "Bush League"],  [12, "The Cutoff Man"],
  [14, "Foul Territory"],
];
const ERA_SHAPE = { lead: [1.86, 3.18], spread: [3.4, 0.88], gaps: [13, 13, 13, 12, 12, 17, 20], asc: true };

// Walk the schedule: apply each pass in order to get the standing at every week.
function orders(opening, passes, weeks) {
  const out = [];
  let cur = [...opening];
  for (let w = 0; w < weeks; w++) {
    passes.filter(([pw]) => pw === w + 1).forEach(([, team]) => {
      const i = cur.indexOf(team);
      if (i > 0) { const n = [...cur]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; cur = n; }
    });
    out.push([...cur]);
  }
  return out;
}

// Turn a week's standing into figures. The leader's total and the 1st-to-8th
// spread are each interpolated across the season; the spread is divided by the
// gap proportions, which ease from even (an April scrum) to the authored final
// gaps. Because every value is derived from the standing, the numbers can never
// disagree with the order — which is what broke the previous board.
function figures(orderByWeek, { lead, spread, gaps, asc }, weeks) {
  const total = gaps.reduce((s, g) => s + g, 0);
  const series = {};
  orderByWeek[0].forEach((n) => { series[n] = new Array(weeks); });
  for (let w = 0; w < weeks; w++) {
    const t = weeks > 1 ? w / (weeks - 1) : 1;
    const L = lead[0] + (lead[1] - lead[0]) * t;
    const S = spread[0] + (spread[1] - spread[0]) * t;
    let acc = 0;
    orderByWeek[w].forEach((name, r) => {
      if (r > 0) acc += (1 / gaps.length) + (gaps[r - 1] / total - 1 / gaps.length) * t;
      series[name][w] = asc ? L + S * acc : L - S * acc;
    });
  }
  return series;
}

const hr = figures(orders(HR_OPENING, HR_PASSES, WEEKS), HR_SHAPE, WEEKS);
const wins = figures(orders(W_OPENING, W_PASSES, WEEKS), W_SHAPE, WEEKS);
const avg = figures(orders(AVG_OPENING, AVG_PASSES, WEEKS), AVG_SHAPE, WEEKS);
const era = figures(orders(ERA_OPENING, ERA_PASSES, WEEKS), ERA_SHAPE, WEEKS);

// Rate stats are stored as their COMPONENTS, never as a rate. The board
// recomputes AVG as H/AB and ERA as 9×ER/IP the same way the real one does, so
// the demo exercises the real math instead of printing a number we invented.
// Averaging weekly rates is wrong, and it's a bug this project already fixed
// once for real.
export const DEMO_SEASON = (() => {
  const season = {};
  DEMO_TEAMS.forEach(({ name }, ti) => {
    // At-bats and innings accumulate steadily; only the rate is choreographed.
    // A little per-team variation so the volume figures aren't identical.
    const abPerWeek = 348 + (ti % 4) * 7;
    const outsPerWeek = 252 + (ti % 3) * 6;
    season[name] = Array.from({ length: WEEKS }, (_, w) => {
      const ab = abPerWeek * (w + 1);
      const outs = outsPerWeek * (w + 1);
      return {
        hr: Math.round(hr[name][w]),
        wins: Math.round(wins[name][w]),
        ab, h: Math.round(avg[name][w] * ab),
        outs, er: Math.round((era[name][w] * outs) / 27),
      };
    });
  });
  return season;
})();
