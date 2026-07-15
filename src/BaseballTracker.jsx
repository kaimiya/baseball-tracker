import { useState, useMemo, useEffect, useRef } from "react";
import { useLeagueData } from "./useLeagueData.js";
import { useLiveToday } from "./useLiveToday.js";
import { useTheme } from "./theme.js";

const FONT = "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
// Titles use Bricolage Grotesque (self-hosted variable font), but small — at
// reduced sizes its weight reads as premium/characterful rather than overpowering.
const DISPLAY = "'Bricolage Grotesque Variable', " + FONT;
// The "rake" wordmark is the one place that keeps its brand face: Bricolage
// Grotesque 800 with tight negative tracking (per the handoff lockup).
const WORDMARK = "'Bricolage Grotesque Variable', " + FONT;
const MAXW = 1120;

// League payout structure (money league config — not from ESPN). $300 buy-in ×
// 8 teams = $2,400 pot. Four King categories pay $100 to the season leader (ties
// split evenly); the rest ($2,000) is the playoff pool: 1st $1,100, 2nd $600,
// 3rd $300.
const PAYOUTS = {
  buyIn: 300,
  teams: 8,
  pot: 2400,
  perCategory: 100,
  playoffs: [
    { place: "1st place", amount: 1100 },
    { place: "2nd place", amount: 600 },
    { place: "3rd place", amount: 300 },
  ],
};

function calcTotals(weeks) {
  if (!weeks.length) return { hr: 0, avg: 0, wins: 0, era: 0 };
  const hr = weeks.reduce((s, w) => s + w.hr, 0);
  const wins = weeks.reduce((s, w) => s + w.wins, 0);
  const avg = weeks.reduce((s, w) => s + w.avg, 0) / weeks.length;
  const era = weeks.reduce((s, w) => s + w.era, 0) / weeks.length;
  return { hr, avg, wins, era };
}

// Fold today's live MLB delta (d) into an ESPN base total in the 4 categories.
// HR/Wins are counting (add); AVG/ERA are recomputed from components so they
// stay true (total H/AB, total ER/IP). Returns the base unchanged if no delta.
function foldLive(base, d) {
  if (!base || !d) return base;
  const ab = (base.ab || 0) + (d.ab || 0);
  const h = (base.h || 0) + (d.h || 0);
  const outs = (base.outs || 0) + (d.outs || 0);
  const er = (base.er || 0) + (d.er || 0);
  return {
    ...base,
    hr: (base.hr || 0) + (d.hr || 0),
    wins: (base.wins || 0) + (d.w || 0),
    avg: ab ? h / ab : base.avg,
    era: outs ? (9 * er) / (outs / 3) : base.era,
    h, ab, er, outs,
  };
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* --- The Rake mark: coarse-cut capital R on a dot grid (the favicon's cut —
   chunky, legible small). Rendered as inline dots via DotArt so the in-UI mark
   tile lockup matches the favicon. --- */
const R_COARSE = ["111", "101", "111", "110", "101"];

function MarkTile({ t, size = 32 }) {
  return (
    <div
      style={{
        // Flat blue tile — no gradient/gloss. That treatment is reserved for the
        // favicon app-tile only; in-UI it read too glossy/AI-y.
        width: size, height: size, borderRadius: size * 0.26,
        background: t.markTile,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <DotArt rows={R_COARSE} height={size * 0.5} color={t.markDot} />
    </div>
  );
}

// Generic dot-grid glyph in the mark's language (any bit-row art). `pulse`
// staggers a gentle opacity wave across the dots — used by the loader.
const SPLITS_GLYPH = ["11111", "00000", "11111", "00000", "11111"]; // stacked rows / table
function DotArt({ rows, height = 18, color = "#0076B6", pulse = false }) {
  const R = rows.length, C = rows[0].length;
  const unit = height / (R + (R - 1) * 0.12);
  const gap = unit * 0.12;
  const w = C * unit + (C - 1) * gap;
  const cells = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (rows[r][c] !== "1") continue;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * (unit + gap)} y={r * (unit + gap)} width={unit} height={unit} rx={unit * 0.16}
          fill={color}
          className={pulse ? "bt-dot-pulse" : undefined}
          style={pulse ? { animationDelay: `${(r + c) * 0.09}s` } : undefined}
        />
      );
    }
  }
  return <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden="true" style={{ display: "block" }}>{cells}</svg>;
}

// Loading screen (per the loading handoff): a single dot-icon slot flips through
// the brand icon set while one witty line shimmers underneath.
const LOADER_ICONS = [
  ["00100", "01110", "11111", "01110", "00100"],          // field (diamond)
  ["01110", "11011", "10101", "11011", "01110"],          // game (baseball)
  ["00100", "01110", "11111", "00100", "00100"],          // gaining (up arrow)
  ["11111", "11111", "01110", "00100", "01110", "11111"], // title (trophy)
];
const LOADER_DOT = 7; // dot size for the loader icons
// The loader draws every glyph on one fixed canvas sized to the tallest/widest
// icon, so the SVG footprint never changes as icons cycle (see LoaderIcon).
const LOADER_MAX_ROWS = Math.max(...LOADER_ICONS.map(r => r.length));
const LOADER_COLS = LOADER_ICONS[0][0].length;
const LOADER_LINES = [
  "Tallying the dingers…",
  "Counting who actually paid…",
  "Auditing the commissioner…",
  "Doing the math your league won't…",
  "Following the money…",
];

// One brand icon rendered on a FIXED canvas (tallest × widest across the icon
// set) with the glyph centered inside it. Because the SVG footprint is identical
// for every icon, nothing reflows and flexbox never has to re-center a
// different-sized box on each swap — that sub-pixel re-centering was the source
// of the hairline jump. Dots ~5px, radius 16%, gap 12%.
function LoaderIcon({ rows, dot = 5, color = "#0076B6" }) {
  const R = rows.length, C = rows[0].length;
  const gap = Math.max(1, dot * 0.12);
  const cell = dot + gap;
  const w = LOADER_COLS * dot + (LOADER_COLS - 1) * gap;
  const h = LOADER_MAX_ROWS * dot + (LOADER_MAX_ROWS - 1) * gap;
  // Center this glyph within the fixed canvas.
  const xOff = ((LOADER_COLS - C) / 2) * cell;
  const yOff = ((LOADER_MAX_ROWS - R) / 2) * cell;
  const cells = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (rows[r][c] !== "1") continue;
      cells.push(<rect key={`${r}-${c}`} x={xOff + c * cell} y={yOff + r * cell} width={dot} height={dot} rx={dot * 0.16} fill={color} />);
    }
  }
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: "block" }}>{cells}</svg>;
}

function RakeLoading({ t }) {
  const [i, setI] = useState(0);
  // One line, chosen at random per load (no mid-load rotation).
  const line = useMemo(() => LOADER_LINES[Math.floor(Math.random() * LOADER_LINES.length)], []);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % LOADER_ICONS.length), 620);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ fontFamily: FONT, background: t.panel, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "26px", padding: "40px" }}>
      {/* Fixed-height slot (tallest icon = the 6-row trophy) so shorter icons
          stay vertically centered and nothing jumps when they swap. */}
      <div style={{ perspective: "400px", height: `${6 * LOADER_DOT + 5 * Math.max(1, LOADER_DOT * 0.12)}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* keyed on the icon index so it remounts + replays the flip each swap */}
        <div key={i} className="bt-flip" style={{ display: "inline-flex" }}>
          <LoaderIcon rows={LOADER_ICONS[i]} dot={LOADER_DOT} color={t.leader} />
        </div>
      </div>
      <div
        className="bt-shimmer"
        style={{
          fontFamily: FONT, fontWeight: 400, fontSize: "14px",
          backgroundImage: `linear-gradient(100deg, ${t.shimmerBase} 0%, ${t.shimmerBase} 40%, ${t.textPrimary} 50%, ${t.shimmerBase} 60%, ${t.shimmerBase} 100%)`,
        }}
      >
        {line}
      </div>
    </div>
  );
}

/* --- Icons (inline SVG, currentColor) --- */
function RefreshIcon({ size = 15, spinning }) {
  return (
    <svg className={spinning ? "bt-spin" : undefined} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
function SunIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function InfoIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="11.5" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// Header action button: 30px square, hairline border, 8px radius (Rake spec).
function IconButton({ label, onClick, t, disabled, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="bt-iconbtn"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "32px", height: "32px", borderRadius: "8px",
        border: "none",
        background: hover && !disabled ? t.iconHover : "transparent",
        color: t.iconColor, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1, transition: "background 0.12s ease, transform 0.1s ease",
      }}
    >
      {children}
    </button>
  );
}

// Team logo with graceful fallback to a sand initial chip, in a fixed footprint
// so columns stay aligned.
function TeamMark({ name, logo, size = 24, t }) {
  const [err, setErr] = useState(false);
  const box = { width: size, height: size, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
  if (logo && !err) {
    return <img className="bt-teammark" src={logo} alt="" onError={() => setErr(true)} style={{ ...box, objectFit: "cover", background: t.avatarBg }} />;
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="bt-teammark" style={{ ...box, background: t.avatarBg, color: t.textMuted, fontWeight: 600, fontSize: Math.round(size * 0.42), fontFamily: FONT }}>
      {initial}
    </span>
  );
}

function SectionLabel({ t, children, sub, size = "15px", style }) {
  return (
    <div style={{ margin: "0 0 14px 0", ...style }}>
      <h2 style={{ fontFamily: DISPLAY, fontSize: size, fontWeight: "700", letterSpacing: "-0.02em", color: t.textPrimary, margin: 0 }}>
        {children}
      </h2>
      {sub && <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px", fontWeight: "400" }}>{sub}</div>}
    </div>
  );
}

// A standings figure with today's live gain shown in a fixed-width slot to its
// right, so the column's numbers stay right-aligned whether or not a delta is
// present. The +N delta is absolutely positioned just past the number's right
// edge so it never shifts the figure out of alignment.
function StatWithDelta({ value, delta, color }) {
  return (
    <span style={{ position: "relative", whiteSpace: "nowrap" }}>
      {value}
      {delta ? (
        <span style={{ position: "absolute", left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: "4px", fontSize: "10px", fontWeight: "700", color, fontVariantNumeric: "tabular-nums" }}>+{delta}</span>
      ) : null}
    </span>
  );
}

export default function BaseballTracker() {
  const league = useLeagueData();
  const live = useLiveToday();
  const { mode, t, toggle } = useTheme();

  const players = league.players;
  const colors = league.colors;
  const logos = league.logos;
  const records = league.records;
  const seeds = league.seeds;
  const managers = league.managers;
  const data = league.data;
  const seasonTotals = league.seasonTotals || {};
  const myTeam = league.myTeam;

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState(null);
  const [flash, setFlash] = useState({});
  const [stScrolled, setStScrolled] = useState(false);
  const [minLoadDone, setMinLoadDone] = useState(false);
  const [pageScrolled, setPageScrolled] = useState(false);
  const splitsRef = useRef(null);
  const splitsTeamRef = useRef(null);
  const prevTotalsRef = useRef(null);

  // Hold the loader on screen long enough to actually read, even when the data
  // returns instantly — then let the board fade in.
  useEffect(() => {
    const id = setTimeout(() => setMinLoadDone(true), 2800);
    return () => clearTimeout(id);
  }, []);

  // Condense the sticky header's league-name headline once the page scrolls.
  useEffect(() => {
    const onScroll = () => setPageScrolled(window.scrollY > 28);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Season totals = ESPN's exact figures, with today's live in-progress MLB
  // stats folded into all four categories so awards + standings reflect live games.
  const totals = useMemo(() => {
    const m = {};
    players.forEach(p => { m[p] = foldLive(seasonTotals[p] || calcTotals(data[p] || []), live.teams?.[p]); });
    return m;
  }, [seasonTotals, data, players, live.teams]);

  const numWeeks = useMemo(
    () => (players.length ? Math.max(...players.map(p => (data[p] || []).length)) : 0),
    [data, players]
  );

  const standingsSorted = useMemo(
    () => [...players].sort((a, b) => {
      const sa = seeds[a] || 999, sb = seeds[b] || 999;
      if (sa !== sb) return sa - sb;
      return (totals[b]?.hr || 0) - (totals[a]?.hr || 0);
    }),
    [players, seeds, totals]
  );

  // No team is selected on load — the page is a shared league view, not tied to
  // any one account. The Weekly Splits panel stays empty until a row is clicked.

  const fmtAvg = v => v.toFixed(3).replace("0.", ".");
  const fmtERA = v => v.toFixed(2);

  // Flash any stat cell whose value changed since the last fetch (skip first load).
  useEffect(() => {
    if (league.status !== "ready") return;
    const cur = totals;
    const prev = prevTotalsRef.current;
    prevTotalsRef.current = cur;
    if (!prev) return;
    const fmtC = (cat, v) => (cat === "avg" ? fmtAvg(v) : cat === "era" ? fmtERA(v) : String(v));
    const next = {};
    players.forEach(p => {
      ["hr", "avg", "wins", "era"].forEach(cat => {
        const a = prev[p]?.[cat], b = cur[p]?.[cat];
        if (a == null || b == null) return;
        if (fmtC(cat, a) !== fmtC(cat, b)) next[`${p}-${cat}`] = b > a ? "up" : "down";
      });
    });
    if (!Object.keys(next).length) return;
    setFlash(next);
    const id = setTimeout(() => setFlash({}), 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.meta?.fetchedAt]);

  function selectTeam(player) {
    setSelectedPlayer(player);
    // Bring the splits into view, offset by the sticky header's height so its
    // top (the team name) isn't hidden behind it.
    // A short delay lets the splits render + lay out (the section grows from the
    // empty state) before we measure, so the scroll target is correct.
    setTimeout(() => {
      const el = splitsTeamRef.current || splitsRef.current;
      if (!el) return;
      const header = document.querySelector("header");
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const y = window.scrollY + el.getBoundingClientRect().top - headerH - 14;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 70);
  }

  // ---- Loading / error ----
  if (league.status === "error") {
    return <Splash t={t} title="Couldn't load league" sub={league.error} error />;
  }
  if (league.status !== "ready" || !players.length || !minLoadDone) {
    return <RakeLoading t={t} />;
  }

  // Column header + cell styles (Sora, tabular figures, regular weight — blue
  // only marks the category leader). No all-caps letter-spacing.
  const th = (align) => ({ padding: "14px 14px 10px", textAlign: align, fontSize: "10.5px", fontWeight: "600", color: t.tableHeadText, whiteSpace: "nowrap" });
  const td = (align) => ({ padding: "0 14px", height: "56px", textAlign: align, fontSize: "13px", color: t.textSecondary, borderBottom: `1px solid ${t.divider}`, whiteSpace: "nowrap" });
  const numCell = { fontVariantNumeric: "tabular-nums", fontWeight: "400", color: t.numberColor, fontSize: "14px" };
  // Highlight every team that ties for a category lead (compared at displayed precision).
  const fmtVal = (cat, v) => (cat === "avg" ? fmtAvg(v) : cat === "era" ? fmtERA(v) : String(v));
  const leadFmt = {};
  ["hr", "avg", "wins", "era"].forEach(cat => {
    let best = null;
    players.forEach(p => {
      const v = totals[p]?.[cat];
      if (v == null) return;
      if (best == null || (cat === "era" ? v < best : v > best)) best = v;
    });
    leadFmt[cat] = best == null ? null : fmtVal(cat, best);
  });
  const leadCell = (cat, player) => (leadFmt[cat] != null && fmtVal(cat, totals[player]?.[cat] ?? 0) === leadFmt[cat] ? { color: t.leader, fontWeight: "700" } : {});
  // Every team tied for a category lead (so leader cards surface all of them).
  const leaderTeams = {};
  ["hr", "avg", "wins", "era"].forEach(cat => {
    const list = players.filter(p => leadFmt[cat] != null && fmtVal(cat, totals[p]?.[cat] ?? 0) === leadFmt[cat]);
    list.sort((a, b) => (seeds[a] || 999) - (seeds[b] || 999));
    leaderTeams[cat] = list;
  });
  // Each section is its own card: off-white surface on the neutral page, rounded,
  // a hairline border and a soft lift. Awards/Standings/Splits each get one.
  const card = { background: t.panel, borderRadius: "18px", border: `1px solid ${t.panelBorder}`, boxShadow: "none" };
  // Today's live per-team gains (HR/Wins). Only widen the HR/Wins columns for
  // the delta slot on days when something has actually moved.
  const liveTeams = live.teams || {};
  const showDeltas = Object.values(liveTeams).some(x => x && (x.hr || x.w));

  const synced = league.meta?.fetchedAt
    ? new Date(league.meta.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  const leagueName = league.meta?.leagueName || "Fantasy Baseball League";
  const metaParts = [];
  if (league.meta?.seasonId) metaParts.push(`${league.meta.seasonId} Season`);
  if (league.meta?.teamCount) metaParts.push(`${league.meta.teamCount} Teams`);
  const metaLine = metaParts.join("  ·  ");

  const sel = selectedPlayer;
  const selWeeks = data[sel];
  const selTot = totals[sel];

  const catLabel = (cat) => (cat === "era" ? "Best ERA" : cat === "hr" ? "Home Runs" : cat === "avg" ? "Batting Avg" : "Wins");

  return (
    <div className="bt-root" style={{ fontFamily: FONT, background: t.pageBg, minHeight: "100vh", color: t.textPrimary, "--rk-divider": t.divider, "--rk-accent": t.accent, "--rk-icon-hover": t.iconHover }}>

      {/* Sticky product header: brand lockup on top, league name as the
          headline below. The headline condenses once the page scrolls. */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: t.panel, borderBottom: `1px solid ${t.panelBorder}` }}>
        {/* Brand bar */}
        <div style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="bt-gutter" style={{ maxWidth: MAXW, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "11px", paddingBottom: "11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <MarkTile t={t} size={26} />
              <span style={{ fontFamily: WORDMARK, fontSize: "19px", fontWeight: "800", letterSpacing: "-0.045em", color: t.textPrimary, lineHeight: 1 }}>rake</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "11px", flexShrink: 0 }}>
              {live.meta?.gamesLive > 0 && (
                <span title={`${live.meta.gamesLive} MLB games in progress — live stats folded in`} style={{ display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                  <span className="bt-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: t.live, display: "inline-block" }} />
                  <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.02em", color: t.live }}>LIVE</span>
                </span>
              )}
              <IconButton label={mode === "light" ? "Dark mode" : "Light mode"} onClick={toggle} t={t}>
                {mode === "light" ? <MoonIcon /> : <SunIcon />}
              </IconButton>
            </div>
          </div>
        </div>
        {/* League headline — condenses on scroll; the sync status sits at the
            bottom-right, baseline-aligned with the season/teams meta line. */}
        <div className="bt-gutter" style={{ maxWidth: MAXW, margin: "0 auto", paddingTop: pageScrolled ? "9px" : "14px", paddingBottom: pageScrolled ? "9px" : "16px", transition: "padding 0.22s ease", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: "700", letterSpacing: "-0.02em", color: t.textPrimary, lineHeight: 1.25, fontSize: pageScrolled ? "13.5px" : "16px", whiteSpace: pageScrolled ? "nowrap" : "normal", overflow: "hidden", textOverflow: "ellipsis", transition: "font-size 0.22s ease" }}>
              {leagueName}
            </h1>
            {metaLine && (
              <div style={{ fontSize: "12px", color: t.textMuted, overflow: "hidden", maxHeight: pageScrolled ? "0px" : "22px", opacity: pageScrolled ? 0 : 1, marginTop: pageScrolled ? "0px" : "3px", transition: "max-height 0.22s ease, opacity 0.18s ease, margin-top 0.22s ease" }}>
                {metaLine}
              </div>
            )}
          </div>
          {synced && (
            <button
              className="bt-refresh-btn"
              onClick={league.refresh}
              disabled={league.refreshing}
              title="Refresh now"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", padding: 0, cursor: league.refreshing ? "default" : "pointer", font: "inherit", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {league.refreshing && <RefreshIcon size={11} spinning />}
              {league.refreshing ? "Syncing…" : `Updated ${synced}`}
            </button>
          )}
        </div>
      </header>

      <main className="bt-main bt-rise" style={{ maxWidth: MAXW, margin: "0 auto", padding: "34px 36px 48px" }}>

        {/* King Category Awards */}
        <section className="bt-sec" style={{ marginBottom: "30px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: "17px", fontWeight: "700", letterSpacing: "-0.02em", color: t.textPrimary, margin: 0 }}>King Category Awards</h2>
            <button
              className="bt-payinfo"
              onClick={() => setPayoutsOpen(true)}
              title="View payouts"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "transparent", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontSize: "12px", color: t.textMuted, flexShrink: 0 }}
            >
              Payouts
              <span className="bt-info-ic" style={{ display: "inline-flex" }}>
                <InfoIcon size={13} />
              </span>
            </button>
          </div>
          <div className="bt-board" style={{ ...card, marginTop: "14px" }}>
            <div className="bt-awardpad" style={{ padding: "24px 2px 22px" }}>
              <div className="bt-leaders" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
                {["hr", "avg", "wins", "era"].map((cat, i) => {
                  const tied = leaderTeams[cat];
                  return (
                    <div key={cat} className="bt-award" style={{ animationDelay: `${0.06 + i * 0.07}s` }}>
                      <div style={{ fontSize: "11.5px", fontWeight: "500", color: t.textMuted }}>{catLabel(cat)}</div>
                      <div className="bt-award-num" style={{ fontSize: "42px", fontWeight: "500", color: t.leader, lineHeight: "1.05", letterSpacing: "-0.03em", margin: "8px 0 14px", fontVariantNumeric: "tabular-nums" }}>
                        {leadFmt[cat] ?? "—"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                        {tied.map(team => (
                          <button
                            key={team}
                            className="bt-award-team"
                            onClick={() => selectTeam(team)}
                            style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left", width: "100%", minWidth: 0 }}
                          >
                            <TeamMark name={team} logo={logos[team]} size={20} t={t} />
                            <span style={{ fontSize: "12.5px", color: t.textPrimary, fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{team}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="bt-section-divider" />

        {/* Standings */}
        <section className="bt-sec" style={{ marginBottom: "30px" }}>
          <SectionLabel t={t} sub="Select a team to see its weekly splits">Standings</SectionLabel>

          {/* Aligned columns everywhere. On mobile the card goes transparent
              (cardless) via CSS, leaving the columns + sand row dividers. */}
          <div className="bt-board" style={{ ...card, overflow: "hidden" }}>
            <div className={"bt-scroll" + (stScrolled ? " bt-scrolled" : "")} style={{ padding: "4px 12px 12px" }} onScroll={e => { const v = e.currentTarget.scrollLeft > 1; setStScrolled(p => (p === v ? p : v)); }}>
              <table className="bt-table bt-standings" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="bt-c-rank" style={{ ...th("left"), position: "sticky", left: 0, zIndex: 4, background: t.panel }}>#</th>
                    <th className="bt-freeze-edge bt-c-team" style={{ ...th("left"), position: "sticky", left: "30px", zIndex: 4, background: t.panel }}>Team</th>
                    <th className="bt-hide-mobile bt-c-record" style={th("left")}>Record</th>
                    <th className="bt-c-stat" style={th("left")}>HR</th>
                    <th className="bt-c-stat" style={th("left")}>Avg</th>
                    <th className="bt-c-stat" style={th("left")}>Wins</th>
                    <th className="bt-c-stat" style={th("left")}>ERA</th>
                  </tr>
                </thead>
                <tbody>
                  {standingsSorted.map((player, idx) => {
                    const tot = totals[player];
                    const isSel = player === sel;
                    const isLast = idx === standingsSorted.length - 1;
                    const bg = isSel ? t.rowSelected : hoverRow === player ? t.rowHover : "transparent";
                    const solidBg = isSel ? `linear-gradient(0deg, ${t.rowSelected}, ${t.rowSelected}), ${t.panel}` : hoverRow === player ? t.rowHover : t.panel;
                    const cell = (align) => ({ ...td(align), borderBottom: isLast ? "none" : `1px solid ${t.divider}` });
                    const fcls = (cat) => { const d = flash[`${player}-${cat}`]; return d ? `bt-flash-${d}` : undefined; };
                    return (
                      <tr
                        key={player}
                        className="bt-row-in"
                        onClick={() => selectTeam(player)}
                        onMouseEnter={() => setHoverRow(player)}
                        onMouseLeave={() => setHoverRow(null)}
                        style={{ cursor: "pointer", background: bg, transition: "background 0.18s ease", animationDelay: `${idx * 0.045}s` }}
                      >
                        <td className="bt-c-rank" style={{ ...cell("left"), position: "sticky", left: 0, zIndex: 2, background: solidBg, boxShadow: isSel ? `inset 3px 0 0 ${t.selectedBar}` : "none", color: t.textMuted, fontWeight: "400", fontVariantNumeric: "tabular-nums", fontSize: "14px", transition: "box-shadow 0.18s ease, background 0.18s ease" }}>{idx + 1}</td>
                        <td className="bt-freeze-edge bt-c-team" style={{ ...cell("left"), position: "sticky", left: "30px", zIndex: 2, background: solidBg, transition: "background 0.18s ease" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            <TeamMark name={player} logo={logos[player]} size={24} t={t} />
                            <span className="bt-team-name" style={{ fontWeight: "500", color: t.textPrimary, fontSize: "15px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player}</span>
                          </div>
                        </td>
                        <td className="bt-hide-mobile" style={{ ...cell("left"), color: t.textMuted, fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>{records[player] || "—"}</td>
                        <td className={fcls("hr")} style={{ ...cell("left"), ...numCell, ...leadCell("hr", player) }}>{showDeltas ? <StatWithDelta value={tot.hr} delta={liveTeams[player]?.hr} color={t.delta} /> : tot.hr}</td>
                        <td className={fcls("avg")} style={{ ...cell("left"), ...numCell, ...leadCell("avg", player) }}>{fmtAvg(tot.avg)}</td>
                        <td className={fcls("wins")} style={{ ...cell("left"), ...numCell, ...leadCell("wins", player) }}>{showDeltas ? <StatWithDelta value={tot.wins} delta={liveTeams[player]?.w} color={t.delta} /> : tot.wins}</td>
                        <td className={fcls("era")} style={{ ...cell("left"), ...numCell, ...leadCell("era", player) }}>{fmtERA(tot.era)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="bt-section-divider" />

        {/* Weekly Splits */}
        <section ref={splitsRef}>
          <SectionLabel t={t} sub="Finished weeks match ESPN exactly. The current week is live — its AVG/ERA update as games play and may differ from ESPN until all of the week's games are final.">Weekly Splits</SectionLabel>
          {sel && selWeeks ? (
            <div className="bt-board" style={{ ...card, overflow: "hidden" }}>
              <div ref={splitsTeamRef} className="bt-splitshead" style={{ padding: "18px 26px 16px", borderBottom: `1px solid ${t.divider}`, display: "flex", alignItems: "center", gap: "13px" }}>
                <TeamMark name={sel} logo={logos[sel]} size={34} t={t} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: t.textPrimary }}>{sel}</div>
                  <div style={{ fontSize: "11.5px", color: t.textMuted, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                    {[records[sel] && `${records[sel]}${seeds[sel] ? ` · ${ordinal(seeds[sel])} of ${league.meta?.teamCount || players.length}` : ""}`, managers[sel]].filter(Boolean).join("  ·  ")}
                  </div>
                </div>
              </div>
              <div className="bt-scroll" style={{ padding: "6px 12px 10px" }}>
                <table className="bt-table bt-weekly" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th className="bt-c-week" style={{ ...th("left"), paddingLeft: "14px" }}>Week</th>
                      <th className="bt-c-stat" style={th("left")}>HR</th>
                      <th className="bt-c-stat" style={th("left")}>Avg</th>
                      <th className="bt-c-stat" style={th("left")}>Wins</th>
                      <th className="bt-c-stat" style={th("left")}>ERA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selWeeks.keys()].reverse().map((i) => {
                      const isCurrent = i + 1 === numWeeks;
                      const w = isCurrent ? foldLive(selWeeks[i], live.teams?.[sel]) : selWeeks[i];
                      return (
                        <tr key={i}>
                          <td style={{ ...td("left"), paddingTop: "9px", paddingBottom: "9px", height: "auto" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: "500", color: t.textPrimary, fontSize: "13px" }}>Week {i + 1}</span>
                              {isCurrent && (
                                <span style={{ fontSize: "9px", fontWeight: "600", color: t.currentChipText, background: t.currentChipBg, padding: "2px 6px", borderRadius: "5px" }}>Current</span>
                              )}
                            </div>
                            {league.weekLabels?.[i] && (
                              <div style={{ fontSize: "10.5px", color: t.textFaint, marginTop: "2px" }}>{league.weekLabels[i]}</div>
                            )}
                          </td>
                          <td style={{ ...td("left"), ...numCell }}>{w.hr}</td>
                          <td style={{ ...td("left"), ...numCell }}>{fmtAvg(w.avg)}</td>
                          <td style={{ ...td("left"), ...numCell }}>{w.wins}</td>
                          <td style={{ ...td("left"), ...numCell }}>{fmtERA(w.era)}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: `2px solid ${t.divider}` }}>
                      <td style={{ ...td("left"), borderBottom: "none", fontSize: "11px", fontWeight: "600", color: t.textMuted }}>Season</td>
                      <td style={{ ...td("left"), borderBottom: "none", ...numCell, fontWeight: "600", color: t.textPrimary }}>{selTot.hr}</td>
                      <td style={{ ...td("left"), borderBottom: "none", ...numCell, fontWeight: "600", color: t.textPrimary }}>{fmtAvg(selTot.avg)}</td>
                      <td style={{ ...td("left"), borderBottom: "none", ...numCell, fontWeight: "600", color: t.textPrimary }}>{selTot.wins}</td>
                      <td style={{ ...td("left"), borderBottom: "none", ...numCell, fontWeight: "600", color: t.textPrimary }}>{fmtERA(selTot.era)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bt-board" style={{ ...card, background: t.glass, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: t.glassEdge, padding: "56px 24px", textAlign: "center" }}>
              <div style={{ display: "inline-flex", padding: "14px", borderRadius: "14px", background: t.avatarBg, marginBottom: "18px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
                  <line x1="3" y1="9.5" x2="21" y2="9.5" />
                  <line x1="9" y1="9.5" x2="9" y2="19.5" />
                </svg>
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: "15px", fontWeight: "600", color: t.textPrimary }}>No team selected yet</div>
              <div style={{ marginTop: "6px", fontSize: "13px", lineHeight: "1.55", color: t.textMuted, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                Pick any team from the standings to see its week-by-week HR, AVG, Wins, and ERA.
              </div>
            </div>
          )}
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${t.panelBorder}` }}>
        <div className="bt-foot" style={{ maxWidth: MAXW, margin: "0 auto", padding: "24px 36px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <MarkTile t={t} size={24} />
            <span style={{ fontFamily: WORDMARK, fontSize: "17px", fontWeight: "800", letterSpacing: "-0.04em", color: t.textSecondary }}>rake</span>
          </div>
          <div style={{ fontSize: "10.5px", color: t.textMuted, lineHeight: 1.5 }}>
            Live category standings · data from ESPN Fantasy &amp; MLB
          </div>
        </div>
      </footer>

      {payoutsOpen && <PayoutsModal t={t} onClose={() => setPayoutsOpen(false)} />}
    </div>
  );
}

// Payouts reference, opened from the header. Closes on backdrop click or Escape.
function PayoutsModal({ t, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cat = (c) => (c === "era" ? "Best ERA" : c === "hr" ? "Home Runs" : c === "avg" ? "Batting Avg" : "Wins");
  const row = (label, amount, last) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: last ? "none" : `1px solid ${t.divider}` }}>
      <span style={{ fontSize: "13.5px", color: t.textPrimary, fontWeight: "500" }}>{label}</span>
      <span style={{ fontSize: "15px", color: t.leader, fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>${amount.toLocaleString()}</span>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,16,10,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payouts"
        onClick={(e) => e.stopPropagation()}
        className="bt-rise"
        style={{ background: t.panel, borderRadius: "18px", border: `1px solid ${t.panelBorder}`, boxShadow: t.boardShadow, width: "100%", maxWidth: "560px", maxHeight: "88vh", overflow: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 14px", borderBottom: `1px solid ${t.divider}` }}>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: "18px", fontWeight: "600", color: t.textPrimary }}>Payouts</div>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "3px" }}>${PAYOUTS.buyIn} buy-in · {PAYOUTS.teams} teams · ${PAYOUTS.pot.toLocaleString()} pot</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "transparent", color: t.iconColor, cursor: "pointer", flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="bt-payouts">
          <div className="bt-pay-col" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: "11.5px", fontWeight: "600", color: t.textMuted, marginBottom: "8px" }}>King Category Awards</div>
            {["hr", "avg", "wins", "era"].map((c, i) => row(cat(c), PAYOUTS.perCategory, i === 3))}
            <div style={{ fontSize: "11.5px", color: t.textFaint, marginTop: "12px", lineHeight: "1.5" }}>Season leader in each category. A tie splits the ${PAYOUTS.perCategory} evenly.</div>
          </div>
          <div className="bt-pay-col" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: "11.5px", fontWeight: "600", color: t.textMuted, marginBottom: "8px" }}>Playoff Payouts</div>
            {PAYOUTS.playoffs.map((p, i) => row(p.place, p.amount, i === PAYOUTS.playoffs.length - 1))}
            <div style={{ fontSize: "11.5px", color: t.textFaint, marginTop: "12px", lineHeight: "1.5" }}>Final regular-season standings determine seeding.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error state only (the loading state uses RakeLoading).
function Splash({ t, title, sub }) {
  return (
    <div style={{ fontFamily: FONT, background: t.pageBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.textPrimary, padding: "40px" }}>
      <div style={{ textAlign: "center", maxWidth: "440px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", color: t.live }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: "17px", fontWeight: "600", color: t.live }}>{title}</div>
        {sub && <div style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6", color: t.textMuted, wordBreak: "break-word" }}>{sub}</div>}
      </div>
    </div>
  );
}
