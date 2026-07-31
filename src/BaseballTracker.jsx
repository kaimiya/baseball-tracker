import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { useLeagueData } from "./useLeagueData.js";
import { useLiveToday } from "./useLiveToday.js";
import { useTheme } from "./theme.js";

// Rake 2.0 UI text is Neue Haas Unica (self-hosted via @font-face in index.html).
// Bricolage Grotesque is the WORDMARK ONLY — never UI text.
const FONT = "'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const WORDMARK = "'Bricolage Grotesque Variable', 'Bricolage Grotesque', sans-serif";
// The screen is a single ~640px editorial column centered on the ground.
const MAXW = 680;

// Last day of THIS LEAGUE's regular season (Aug 30, 2026) — after it the
// playoffs begin, so it's the deadline for the four King category awards.
// Hardcoded deliberately: derived league config, not something read from ESPN.
const REGULAR_SEASON_END = [2026, 8, 30]; // [year, month (1-12), day]

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

// The loader keeps the previous face (Sora) per request, not the UI's Neue Haas.
const LOADER_FONT = "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function RakeLoading({ t }) {
  const [i, setI] = useState(0);
  // One line, chosen at random per load (no mid-load rotation).
  const line = useMemo(() => LOADER_LINES[Math.floor(Math.random() * LOADER_LINES.length)], []);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % LOADER_ICONS.length), 620);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ fontFamily: LOADER_FONT, background: t.panel, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "26px", padding: "40px" }}>
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
          fontFamily: LOADER_FONT, fontWeight: 400, fontSize: "14px",
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

// Custom team picker — a native <select> can't show a logo next to each name,
// so every other list in the app (Standings, Leaders) reads richer than the
// one control meant to pick a team. This is a button + listbox instead, styled
// like .rk-team-select but with a TeamMark per row and per option.
function TeamPicker({ players, logos, value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    // inline-flex, not block: as a block the wrapper picked up inline
    // line-height leading around the button, so centring it against the team
    // name centred the WRAPPER while the button itself sat off-centre.
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        className="rk-team-select rk-team-name-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {value ? "Change" : "Select team"}
      </button>
      {open && (
        <ul className="rk-team-listbox" role="listbox">
          {players.map((p) => (
            <li key={p}>
              <button
                type="button"
                role="option"
                aria-selected={p === value}
                className={"rk-team-option rk-team-name-sm" + (p === value ? " is-sel" : "")}
                onClick={() => { onChange(p); setOpen(false); }}
              >
                <TeamMark name={p} logo={logos[p]} size={18} t={t} />
                <span>{p}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A standings figure with today's live gain tucked directly BENEATH the number
// (not beside it). Stacking below keeps the stat columns tight so the +N never
// collides with the next column on narrow/mobile layouts, and because the delta
// is absolutely positioned (out of flow) the four numbers stay vertically
// aligned across the row whether or not a delta is present.
// A figure with today's live gain. Desktop puts the gain inline to the right
// ("239 +1"); on mobile CSS re-positions it beneath so the narrow stat columns
// don't get crowded. Both layouts live in .rk-stat / .rk-stat-delta.
// `reserve` is decided PER ROW, not globally: a row keeps the gain's slot in
// every one of its cells as soon as any single stat in that row has a gain.
// That way all four figures in a row share one baseline instead of the gaining
// one riding high while its neighbours stay centred — and rows with no gain at
// all skip the slot entirely, so they centre cleanly with no dead space under
// them. Row height is fixed either way, so the table's rhythm doesn't change.
function StatWithDelta({ value, delta, color, reserve }) {
  return (
    <span className="rk-stat">
      <span>{value}</span>
      {reserve ? <span className="rk-stat-delta" style={{ color }}>{delta ? `+${delta}` : ""}</span> : null}
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
  const [minLoadDone, setMinLoadDone] = useState(false);
  const [activeNav, setActiveNav] = useState("awards");
  const [pageScrolled, setPageScrolled] = useState(false);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [orbitActive, setOrbitActive] = useState(0);
  const leadersRef = useRef(null);
  const standingsRef = useRef(null);
  const splitsRef = useRef(null);
  const splitsTeamRef = useRef(null);
  const orbitRef = useRef(null);
  // A callback ref (not a plain useRef) so the tracking effect below fires
  // exactly when the orbit <div> mounts. It used to depend on
  // [players.length], but data can arrive before the artificial minimum
  // loading delay (minLoadDone) finishes — that ran the effect once while
  // the loader was still showing (orbitRef.current still null), and since
  // players.length never changes again, it never got a second chance to
  // attach the listener. Every circle stayed permanently at its default.
  const [orbitMounted, setOrbitMounted] = useState(false);
  const setOrbitRef = (node) => { orbitRef.current = node; setOrbitMounted(!!node); };
  const prevTotalsRef = useRef(null);

  // Weekly Splits team picker: a continuous coverflow — every circle's size/
  // opacity/desaturation is driven directly off its live pixel distance from
  // the track's centre (not a stepped index), so the shrink is smooth exactly
  // like the reference. Applied as direct DOM style in the scroll handler
  // (not React state) so it can update every frame without a re-render.
  // orbitActive (React state) only tracks which one is centred, for the name
  // label and the click target.
  useEffect(() => {
    const el = orbitRef.current;
    if (!el) return;
    let raf = null;
    // Falloff distance in px. Tuned against the ~440px window: too small and
    // the 2nd neighbour all but vanishes; this keeps two circles legible on
    // each side of centre while still reading as a clear focal fan.
    const FALLOFF = 260;
    // INFINITE LOOP: the track renders the roster ORBIT_COPIES times back to
    // back. We park the scroll in the middle copy and, whenever it drifts a
    // full copy-width away from there, jump it back by exactly one copy. The
    // jump is invisible because the copy under the viewport is pixel-identical
    // — so the row can be swiped forever in either direction and never ends.
    const n = players.length;
    const copyWidth = () =>
      n && el.children[n] ? el.children[n].offsetLeft - el.children[0].offsetLeft : 0;
    // Start centred somewhere in the MIDDLE copy (so there's a full copy of
    // runway both ways before the first wrap), but on a RANDOM team each load
    // rather than always the same one — otherwise every visit opens on an
    // identical screen.
    // NB: set scrollLeft directly rather than scrollIntoView — even with
    // block:"nearest", scrollIntoView also scrolls ANCESTORS, so on mount it
    // dragged the whole page down to the picker and the app opened
    // mid-document instead of at the top.
    const centerChild = (i, behavior = "auto") => {
      const c = el.children[i];
      if (!c) return;
      el.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - el.clientWidth / 2, behavior });
    };
    centerChild(n + Math.floor(Math.random() * n));
    const measure = () => {
      raf = null;
      // Re-park into the middle copy before measuring, so the wrap never
      // shows a seam or an end-of-track bounce.
      const w = copyWidth();
      if (w > 0) {
        if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
        else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
      }
      const box = el.getBoundingClientRect();
      const center = box.left + box.width / 2;
      let closest = 0, closestDist = Infinity;
      [...el.children].forEach((child, i) => {
        const r = child.getBoundingClientRect();
        const dist = r.left + r.width / 2 - center;
        const absDist = Math.abs(dist);
        if (absDist < closestDist) { closestDist = absDist; closest = i; }
        const norm = Math.min(absDist / FALLOFF, 1);
        const mark = child.querySelector(".bt-teammark, img");
        if (mark) {
          mark.style.transform = `scale(${1 - norm * 0.38})`;
          mark.style.opacity = String(1 - norm * 0.5);
          // Colour ramps out ~3x faster than the size/opacity falloff, so only
          // the circle actually at centre keeps its colour and everything else
          // reads clearly greyed — the same binary active/inactive language as
          // the nav tabs. Sharing the gentle falloff curve left the immediate
          // neighbours only ~30% desaturated, i.e. still visibly in colour.
          const gray = Math.min(norm * 3.2, 1);
          mark.style.filter = gray > 0.04 ? `grayscale(${gray})` : "none";
        }
      });
      setOrbitActive(closest);
    };
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(measure); };
    el.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => { el.removeEventListener("scroll", onScroll); if (raf != null) cancelAnimationFrame(raf); };
  }, [orbitMounted, players.length]);

  // Hold the loader on screen long enough to actually read, even when the data
  // returns instantly — then let the board fade in.
  useEffect(() => {
    const id = setTimeout(() => setMinLoadDone(true), 2800);
    return () => clearTimeout(id);
  }, []);

  // Condense the sticky nav/title block once the page scrolls past the wordmark.
  useEffect(() => {
    const onScroll = () => setPageScrolled(window.scrollY > 40);
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

  // The orbit picker repeats the roster so it can scroll forever without ever
  // hitting an end (see the wrap logic in the orbit scroll effect). Three
  // copies is the minimum that lets the scroll sit in a middle copy with a
  // full copy of runway on each side before it needs to re-park.
  const ORBIT_COPIES = 3;
  const orbitTeams = useMemo(
    () => Array.from({ length: ORBIT_COPIES }, () => standingsSorted).flat(),
    [standingsSorted]
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
    // Must outlast the 2.6s bt-flash animation, or the class is stripped
    // mid-fade and the tint disappears abruptly instead of easing out.
    const id = setTimeout(() => setFlash({}), 2700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.meta?.fetchedAt]);

  function scrollToRef(ref) {
    const el = ref?.current;
    if (!el) return;
    // Offset by the sticky bar's real height, measured live — a flat 16px was
    // far less than the bar is tall, so nav jumps parked the section heading
    // underneath it and it read as cut off.
    const bar = document.querySelector(".rk-sticky");
    const barH = bar ? bar.getBoundingClientRect().height : 0;
    const y = window.scrollY + el.getBoundingClientRect().top - barH - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  function selectTeam(player) {
    setSelectedPlayer(player);
    setActiveNav("splits");
    setShowAllWeeks(false); // a fresh team starts capped, not mid-expanded
    // A short delay lets the splits render + lay out (the section grows from the
    // empty state) before we measure, so the scroll target is correct.
    setTimeout(() => scrollToRef(splitsTeamRef.current ? splitsTeamRef : splitsRef), 70);
  }

  // Tapping a circle in the orbit picker centres it (so it becomes the large,
  // full-colour "active" one) in addition to loading its data below.
  function selectOrbitTeam(player, index) {
    // Horizontal-only centring (same reason as the mount case above:
    // scrollIntoView would also scroll the page, not just this track).
    const el = orbitRef.current;
    const child = el?.children[index];
    if (el && child) {
      el.scrollTo({ left: child.offsetLeft + child.offsetWidth / 2 - el.clientWidth / 2, behavior: "smooth" });
    }
    selectTeam(player);
  }

  // ---- Loading / error ----
  if (league.status === "error") {
    return <Splash t={t} title="Couldn't load league" sub={league.error} error />;
  }
  if (league.status !== "ready" || !players.length || !minLoadDone) {
    return <RakeLoading t={t} />;
  }

  // Category leaders (blue). Compare at DISPLAYED precision so ties surface all.
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
  const isLeader = (cat, player) => leadFmt[cat] != null && fmtVal(cat, totals[player]?.[cat] ?? 0) === leadFmt[cat];
  const leaderTeams = {};
  ["hr", "avg", "wins", "era"].forEach(cat => {
    const list = players.filter(p => isLeader(cat, p));
    list.sort((a, b) => (seeds[a] || 999) - (seeds[b] || 999));
    leaderTeams[cat] = list;
  });
  // Teams finishing above this line take a playoff payout (1st/2nd/3rd).
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
  const sel = selectedPlayer;
  const selWeeks = data[sel];
  const selTot = totals[sel];

  const catLabel = (cat) => (cat === "era" ? "Best ERA" : cat === "hr" ? "Home Runs" : cat === "avg" ? "Batting Avg" : "Wins");

  // Days until the regular season ends — how long is left to take a category.
  // Compared as local calendar days so it ticks over at the viewer's midnight
  // rather than UTC's, and never goes negative once the season is done.
  const [dY, dM, dD] = REGULAR_SEASON_END;
  const seasonEnd = new Date(dY, dM - 1, dD);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.round((seasonEnd - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  );
  const seasonEndLabel = seasonEnd.toLocaleDateString([], { month: "short", day: "numeric" });


  // Metadata reads as caps: "2026 SEASON · 8 TEAMS · UPDATED 7:38 AM" — the
  // Updated segment doubles as the refresh trigger.
  const metaNodes = metaParts.map((p) => <span key={p}>{p}</span>);
  if (synced) {
    metaNodes.push(
      <button key="upd" className="rk-updated" onClick={league.refresh} disabled={league.refreshing} title="Refresh now" style={{ display: "inline-flex", alignItems: "center", gap: "5px", letterSpacing: "inherit", textTransform: "inherit" }}>
        {league.refreshing && <RefreshIcon size={10} spinning />}
        {league.refreshing ? "Syncing…" : `Updated ${synced}`}
      </button>
    );
  }

  const toggleLabel = mode === "light" ? "Dark mode" : "Light mode";

  return (
    <div className="rk-root" style={{ fontFamily: FONT, background: t.pageBg, minHeight: "100vh", color: t.textSecondary }}>
      <div className="rk-shell">
        <div className="rk-card bt-rise">

          {/* Header — centred wordmark, no chip; scrolls away (the mark also lives in the footer). */}
          <div className="rk-section rk-brandbar" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "16px var(--rk-gutter)" }}>
            <span />
            <span className="rk-wordmark rk-wordmark-top" style={{ fontSize: "25px", justifySelf: "center" }}>rake</span>
            <button className="rk-iconbtn" onClick={toggle} aria-label={toggleLabel} title={toggleLabel} style={{ justifySelf: "end" }}>
              {mode === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>

          {/* Sticky app bar: the nav + league title stay pinned; the title shrinks
              dramatically and the metadata collapses once the page scrolls. */}
          <div className="rk-sticky">
            <nav className="rk-section rk-navbar" style={{ display: "flex", justifyContent: "center", gap: "34px", padding: "13px var(--rk-gutter)" }}>
              <button className={"rk-nav" + (activeNav === "awards" ? " is-active" : "")} onClick={() => { setActiveNav("awards"); scrollToRef(leadersRef); }}>Leaders</button>
              <button className={"rk-nav" + (activeNav === "standings" ? " is-active" : "")} onClick={() => { setActiveNav("standings"); scrollToRef(standingsRef); }}>Standings</button>
              <button className={"rk-nav" + (activeNav === "splits" ? " is-active" : "")} onClick={() => { setActiveNav("splits"); scrollToRef(splitsRef); }}>Splits</button>
              <button className="rk-nav" onClick={() => setPayoutsOpen(true)}>Payouts</button>
            </nav>
            <div className="rk-section rk-identity" style={{ padding: pageScrolled ? "9px var(--rk-gutter)" : "20px var(--rk-gutter)", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "16px", transition: "padding 0.22s ease" }}>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: pageScrolled ? "8px" : "9px" }}>
                <img src="/espn-fantasy.svg" alt="Synced from ESPN Fantasy" title="Synced from ESPN Fantasy" style={{ width: pageScrolled ? "16px" : "18px", height: pageScrolled ? "16px" : "18px", flexShrink: 0, filter: t.espnFilter, transition: "width 0.2s ease, height 0.2s ease" }} />
                {/* flex:1 + minWidth:0 makes this stretch to the REAL remaining
                    width next to the icon, instead of shrink-wrapping to its own
                    content — without flex:1 the meta line's "available width"
                    was actually just its own text width, so shrinking the font
                    could never produce real headroom (the box shrank with it). */}
                <div style={{ minWidth: 0, flex: "1 1 0%" }}>
                  <div className={"rk-league-title" + (pageScrolled ? " is-condensed" : "")}>{leagueName}</div>
                  {/* grid-rows 0fr/1fr collapses this to true zero height on scroll
                      without hardcoding a max-height that can clip wrapped text
                      (a fixed 20px was cutting "Updated" off on narrow screens
                      where the meta line wraps to 2 lines). */}
                  <div style={{ display: "grid", gridTemplateRows: pageScrolled ? "0fr" : "1fr", opacity: pageScrolled ? 0 : 1, transition: "grid-template-rows 0.22s ease, opacity 0.16s ease" }}>
                    {/* Flat gap, not nested — a wrapper-per-item each with its own
                        gap double-counted the spacing between items (item gap +
                        each wrapper's internal gap), which is what left this only
                        2px from wrapping on narrow screens. */}
                    {/* marginTop must go to 0 when collapsed: the 0fr row hides
                        the line but its top margin still occupied space, making
                        the text block taller than the title alone — which threw
                        the ESPN mark ~3.5px below the title's centreline. */}
                    <div className="rk-eyebrow rk-meta-line" style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", overflow: "hidden", minHeight: 0, whiteSpace: "nowrap", textOverflow: "ellipsis", marginTop: pageScrolled ? 0 : undefined }}>
                      {metaNodes.map((n, i) => (
                        <Fragment key={i}>
                          {i > 0 && <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>}
                          {n}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {live.meta?.gamesLive > 0 && (
                <span className="rk-badge-live" title={`${live.meta.gamesLive} MLB games in progress — live stats folded in`}>
                  Live
                </span>
              )}
            </div>
          </div>

          {/* Leaders */}
          <div ref={leadersRef} className="rk-section rk-pad">
            <div className="rk-section-head" style={{ marginBottom: "20px" }}>Leaders</div>
            <div className="rk-awards">
              {["hr", "avg", "wins", "era"].map((cat) => (
                <div key={cat} className="rk-award">
                  <span className="rk-eyebrow" style={{ whiteSpace: "nowrap" }}>{catLabel(cat)}</span>
                  <span className="rk-figure">{leadFmt[cat] ?? "—"}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {leaderTeams[cat].map((team) => (
                      <button key={team} className="rk-award-team rk-team-name-sm" onClick={() => selectTeam(team)}>
                        <TeamMark name={team} logo={logos[team]} size={18} t={t} />
                        <span>{team}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* One quiet caption, not a headline: the four figures above are the
                only numbers meant to carry weight here. Date derived from the
                same constant as the count so the two can't drift apart. */}
            <div className="rk-countdown">
              <span className="rk-countdown-n">{daysLeft}</span>
              <span>{daysLeft === 1 ? "day" : "days"} left · through {seasonEndLabel}</span>
            </div>
          </div>

          {/* Standings */}
          <div ref={standingsRef} className="rk-section rk-pad">
            <div className="rk-section-head">Standings</div>
            <div className="rk-row rk-standings-row rk-head">
              <span className="rk-colhead">#</span>
              <span className="rk-colhead">Team</span>
              <span className="rk-colhead rk-is-record">Record</span>
              <span className="rk-colhead rk-cell-num">HR</span>
              <span className="rk-colhead rk-cell-num">Avg</span>
              <span className="rk-colhead rk-cell-num">Wins</span>
              <span className="rk-colhead rk-cell-num">ERA</span>
            </div>
            {standingsSorted.map((player, idx) => {
              const tot = totals[player];
              const isSel = player === sel;
              const isLast = idx === standingsSorted.length - 1;
              const fcls = (cat) => { const d = flash[`${player}-${cat}`]; return d ? ` bt-flash-${d}` : ""; };
              const statCls = (cat) => "rk-data rk-cell-num" + (isLeader(cat, player) ? " is-leader" : "") + fcls(cat);
              // If anything in this row gained today, every cell in the row
              // reserves the gain slot so the four figures stay on one baseline.
              const rowHasDelta = Boolean(liveTeams[player]?.hr || liveTeams[player]?.w);
              return (
                <Fragment key={player}>
                  <div
                    onClick={() => selectTeam(player)}
                    className={"rk-row rk-standings-row rk-trow" + (isSel ? " is-sel" : "") + (isLast ? " is-last" : "")}
                  >
                    <span className="rk-data is-rank">{idx + 1}</span>
                    <div className="rk-team">
                      <TeamMark name={player} logo={logos[player]} size={22} t={t} />
                      <span className="rk-team-name">{player}</span>
                    </div>
                    <span className="rk-data is-record rk-is-record">{records[player] || "—"}</span>
                    <span className={statCls("hr")}><StatWithDelta value={tot.hr} delta={liveTeams[player]?.hr} color={t.delta} reserve={rowHasDelta} /></span>
                    <span className={statCls("avg")}><StatWithDelta value={fmtAvg(tot.avg)} reserve={rowHasDelta} /></span>
                    <span className={statCls("wins")}><StatWithDelta value={tot.wins} delta={liveTeams[player]?.w} color={t.delta} reserve={rowHasDelta} /></span>
                    <span className={statCls("era")}><StatWithDelta value={fmtERA(tot.era)} reserve={rowHasDelta} /></span>
                  </div>
                </Fragment>
              );
            })}
          </div>

          {/* Weekly Splits */}
          <div ref={splitsRef} className="rk-section rk-pad">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div className="rk-section-head">Weekly Splits</div>
            </div>
            {sel && selWeeks ? (
              <div ref={splitsTeamRef}>
                {/* This caveat is about the live table below, so it only shows once
                    there's a table to explain — otherwise it read as a stray line
                    of text floating above the empty state. */}
                {/* Kept short enough to sit on one line within .rk-caveat's
                    520px readable-measure cap. */}
                <div className="rk-caveat" style={{ margin: "8px 0 18px" }}>Finished weeks match ESPN. The live week's AVG and ERA still move.</div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "2px" }}>
                  <TeamMark name={sel} logo={logos[sel]} size={30} t={t} />
                  <div style={{ minWidth: 0 }}>
                    {/* "Change" sits right beside the name it changes, instead of
                        a separate boxed dropdown in the section header — the
                        control is where the thing it edits already is. */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <span className="rk-team-name">{sel}</span>
                      <TeamPicker players={standingsSorted} logos={logos} value={sel} onChange={selectTeam} t={t} />
                    </div>
                    <div className="rk-eyebrow" style={{ marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
                      {[records[sel] && `${records[sel]}${seeds[sel] ? ` · ${ordinal(seeds[sel])} of ${league.meta?.teamCount || players.length}` : ""}`, managers[sel]].filter(Boolean).join("  ·  ")}
                    </div>
                  </div>
                </div>
                <div className="rk-row rk-splits-row rk-head">
                  <span className="rk-colhead">Week</span>
                  <span className="rk-colhead rk-is-dates">Dates</span>
                  <span className="rk-colhead rk-cell-num">HR</span>
                  <span className="rk-colhead rk-cell-num">Avg</span>
                  <span className="rk-colhead rk-cell-num">Wins</span>
                  <span className="rk-colhead rk-cell-num">ERA</span>
                </div>
                {(() => {
                  const order = [...selWeeks.keys()].reverse();
                  const visible = showAllWeeks ? order : order.slice(0, 5);
                  return visible.map((i) => {
                    const isCurrent = i + 1 === numWeeks;
                    const w = isCurrent ? foldLive(selWeeks[i], live.teams?.[sel]) : selWeeks[i];
                    return (
                      <div key={i} className="rk-row rk-splits-row rk-splits-trow">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <span className="rk-data" style={{ color: t.textPrimary }}>Week {i + 1}</span>
                          {/* A single accent dot instead of a bordered
                              "CURRENT" chip — same signal, far less furniture
                              in a dense table. */}
                          {isCurrent && <span className="rk-week-live" title="Current week" aria-label="Current week" />}
                        </div>
                        <span className="rk-caveat rk-is-dates" style={{ margin: 0, color: t.textFaint }}>{league.weekLabels?.[i] || "—"}</span>
                        <span className="rk-data rk-cell-num">{w.hr}</span>
                        <span className="rk-data rk-cell-num">{fmtAvg(w.avg)}</span>
                        <span className="rk-data rk-cell-num">{w.wins}</span>
                        <span className="rk-data rk-cell-num">{fmtERA(w.era)}</span>
                      </div>
                    );
                  });
                })()}
                <div className="rk-row rk-splits-row rk-splits-total">
                  <span className="rk-colhead" style={{ color: t.textMuted }}>Season</span>
                  <span className="rk-is-dates" />
                  <span className="rk-data rk-cell-num" style={{ color: t.textPrimary, fontWeight: 500 }}>{selTot.hr}</span>
                  <span className="rk-data rk-cell-num" style={{ color: t.textPrimary, fontWeight: 500 }}>{fmtAvg(selTot.avg)}</span>
                  <span className="rk-data rk-cell-num" style={{ color: t.textPrimary, fontWeight: 500 }}>{selTot.wins}</span>
                  <span className="rk-data rk-cell-num" style={{ color: t.textPrimary, fontWeight: 500 }}>{fmtERA(selTot.era)}</span>
                </div>
                {selWeeks.length > 5 && (
                  <div className="rk-view-all-row">
                    <button
                      type="button"
                      className={"rk-view-all" + (showAllWeeks ? " is-open" : "")}
                      aria-expanded={showAllWeeks}
                      onClick={() => setShowAllWeeks((v) => !v)}
                    >
                      {showAllWeeks ? "Show fewer" : `All ${selWeeks.length} weeks`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Every team is one tap away — this IS the picker, not a prompt
              // to go find the dropdown or scroll back to Standings. Sixth
              // pass: a scroll-tracked "orbit" — the circle nearest the
              // track's centre is large and full colour (same binary
              // active/inactive language as the nav tabs above); everything
              // else shrinks and desaturates. Scroll/swipe to bring a
              // different team to centre, tap any circle to jump straight to it.
              // marginTop is a touch more than the 18px heading→content gap the
              // text sections use: a row of 52px crests needs more optical air
              // under a heading than a line of column labels does.
              <div className="rk-team-orbit-wrap" style={{ marginTop: "28px" }}>
                <div className="rk-team-orbit" ref={setOrbitRef}>
                  {/* Roster repeated ORBIT_COPIES times so the track can wrap
                      seamlessly — see the loop logic in the scroll effect. */}
                  {orbitTeams.map((p, i) => (
                    <button
                      key={`${p}-${i}`}
                      type="button"
                      className={"rk-team-orb" + (i === orbitActive ? " is-active" : "")}
                      onClick={() => selectOrbitTeam(p, i)}
                    >
                      <span className="rk-team-orb-avatar">
                        {/* The brand's own dot-matrix motif (same language as
                            the logo/loader), in the single app accent blue —
                            revealed on hover, faded out at its own edge so it
                            blends into the page instead of a hard circle. */}
                        <span className="rk-team-orb-dots" aria-hidden="true" />
                        <TeamMark name={p} logo={logos[p]} size={52} t={t} />
                      </span>
                      <span className="rk-team-orb-name">{p}</span>
                    </button>
                  ))}
                </div>
                {/* Tells the user the row is a picker at all — nothing else
                    signals that it scrolls or that these are tappable. */}
                <div className="rk-orbit-hint">Select a team</div>
              </div>
            )}
          </div>

          {/* Footer — the dot-R mark lives here */}
          {/* marginTop sets the space ABOVE the footer's divider, separating it
              from the last content section without touching the shared 38px
              section rhythm. */}
          <div className="rk-section" style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", gap: "12px", padding: "18px var(--rk-gutter)", marginTop: "48px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <MarkTile t={t} size={26} />
              <span className="rk-wordmark" style={{ fontSize: "19px" }}>rake</span>
            </div>
            <div style={{ justifySelf: "end", textAlign: "right", font: `400 10px/1.5 ${FONT}`, color: t.textFaint }}>
              Live category standings · data from ESPN Fantasy &amp; MLB<br />Not affiliated with ESPN or MLB.
            </div>
          </div>

        </div>
      </div>

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
      <span className="rk-team-name-sm" style={{ color: t.textPrimary }}>{label}</span>
      <span style={{ fontSize: "14px", color: t.leader, fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>${amount.toLocaleString()}</span>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payouts"
        onClick={(e) => e.stopPropagation()}
        className="bt-rise"
        style={{ fontFamily: FONT, background: t.panel, border: `1px solid ${t.panelBorder}`, width: "100%", maxWidth: "520px", maxHeight: "88vh", overflow: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 14px", borderBottom: `1px solid ${t.divider}` }}>
          <div>
            <div className="rk-section-head">Payouts</div>
            <div className="rk-eyebrow" style={{ marginTop: "8px" }}>${PAYOUTS.buyIn} Buy-in · {PAYOUTS.teams} Teams · ${PAYOUTS.pot.toLocaleString()} Pot</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rk-iconbtn"
            style={{ width: "30px", height: "30px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="rk-payouts">
          <div className="rk-pay-col" style={{ padding: "20px 24px" }}>
            <div className="rk-eyebrow" style={{ marginBottom: "12px" }}>Category Leaders</div>
            {["hr", "avg", "wins", "era"].map((c, i) => row(cat(c), PAYOUTS.perCategory, i === 3))}
            <div className="rk-caveat" style={{ marginTop: "12px" }}>Season leader in each category. A tie splits the ${PAYOUTS.perCategory} evenly.</div>
          </div>
          <div className="rk-pay-col" style={{ padding: "20px 24px" }}>
            <div className="rk-eyebrow" style={{ marginBottom: "12px" }}>Playoff Payouts</div>
            {PAYOUTS.playoffs.map((p, i) => row(p.place, p.amount, i === PAYOUTS.playoffs.length - 1))}
            <div className="rk-caveat" style={{ marginTop: "12px" }}>Final regular-season standings determine seeding.</div>
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", color: t.danger }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        </div>
        <div className="rk-section-head" style={{ color: t.danger }}>{title}</div>
        {sub && <div className="rk-caveat" style={{ marginTop: "8px", wordBreak: "break-word" }}>{sub}</div>}
      </div>
    </div>
  );
}
