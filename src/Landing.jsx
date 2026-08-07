import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "./theme.js";
import { DEMO_TEAMS, DEMO_SEASON, DEMO_WEEK_LABELS, WEEKS } from "./demoSeason.js";

// The club that's actually running — linked, not embedded. Real names and real
// numbers live behind /if-can-can; this page is a sample.
const DEMO_SLUG = "if-can-can";
// Where access requests land until a collector exists. See submit().
const ACCESS_INBOX = "hi@kailimiyamoto.com";
// Row height has to flex with the viewport. The stage is centred inside a
// 100vh frame with overflow:hidden, so on a short phone (360×640) a fixed 52px
// row made the stage 707px tall — the top 379px, i.e. the entire board, was
// clipped away with no way to scroll to it.
const ROW_H_DESKTOP = 52;
const ROW_H_COMPACT = 40;
const rowHFor = (h) => (h < 700 ? ROW_H_COMPACT : ROW_H_DESKTOP);
// Scroll budget, in vh. The reel used to cost seven screens, which is far more
// than it takes to get the point. Two phases now: the opening draws apart, then
// the season runs. Total track = 100 (the frame itself) + OPEN + SEASON.
const OPEN_VH = 70;     // the blue opening splitting
const SEASON_VH = 150;  // all 16 weeks — about a screen and a half
// What each category pays in the club that's running. One league's bet, not the
// product's model — this belongs in league config once clubs are configurable.
const PER_CATEGORY = 100;
// Three steps, once a season. The nav has always promised this section.
const STEPS = [
  { n: "01", head: "Connect the league", body: "Sign in to ESPN once. Rake reads your league's box score directly — no exports, no spreadsheet to keep current." },
  { n: "02", head: "Name the bets", body: "Pick the categories you're betting on and what each one pays. Most clubs run four. Yours can run one or ten." },
  { n: "03", head: "Read the board", body: "Standings re-rank themselves as games finish. Everyone in the league sees the same number at the same time." },
];
const CATS = [
  { key: "hr", label: "Home Runs", dir: "desc" },
  { key: "avg", label: "Batting Avg", dir: "desc" },
  { key: "wins", label: "Wins", dir: "desc" },
  { key: "era", label: "Best ERA", dir: "asc" },
];

// The product isn't baseball — it's whatever the bet is measured on. Baseball is
// simply the season that's running, so it's the one marked live.
// `when` pins each sport to its season on the calendar — "Football" alone was
// a promise with no date, and two undated promises in a row read as vapor.
const SPORTS = [
  { sport: "Baseball", icon: "baseball", when: "Live now", live: true, bets: ["Most home runs", "Best batting average", "Most wins", "Best ERA"] },
  { sport: "Football", icon: "football", when: "This fall", bets: ["Most passing yards", "Most sacks", "Fewest turnovers", "Most rushing TDs"] },
  { sport: "Basketball", icon: "basketball", when: "This winter", bets: ["Most threes", "Best field goal %", "Most assists", "Most blocks"] },
];

// Drawn, not sourced. Sport photography is where unlicensed stock creeps in —
// this page already lost a press shot with unverified rights — and a stock
// celebration frame is what every fantasy product uses. These are strokes, the
// same language as the theme toggle, so they inherit the page's hairline
// system, take currentColor (muted, or accent on the live one), and stay sharp
// at any size for about 300 bytes.
const SPORT_PATHS = {
  // Seams kept short and shallow. Running them the full height with a deep
  // inward bow turned the ball into a capsule — two long verticals reading as
  // the sides of a cylinder rather than as stitching.
  baseball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M6.9 7.1C8.5 9.4 8.5 14.6 6.9 16.9" />
      <path d="M17.1 7.1C15.5 9.4 15.5 14.6 17.1 16.9" />
    </>
  ),
  // No horizontal spine through the middle: a lens outline with a centred
  // horizontal bar and short ticks reads unmistakably as an EYE with a pupil.
  // Four upright laces carry the same meaning without the illusion.
  // Deeper body. The control points sat at y6.5/17.5, but a cubic only reaches
  // about three quarters of the way to its handle, so the outline topped out
  // near y7.9 — 18 wide by 8 tall, roughly 2.2:1, which is a lens, not a ball.
  // Pulling the handles out to y4.6 makes the curve actually arrive at 6.5, for
  // 18 × 11 ≈ 1.64:1 — the real proportion of a football.
  football: (
    <>
      <path d="M3 12C6.5 4.6 17.5 4.6 21 12C17.5 19.4 6.5 19.4 3 12Z" />
      {/* Three laces, not four, and spaced 2 units apart instead of 1.6.
          Four short ticks packed into the middle read as a cluster — a pupil,
          or a smudge — rather than as stitching. Fewer, longer, further apart
          is what actually says "football". */}
      <path d="M10 9.5v5M12 9.2v5.6M14 9.5v5" />
    </>
  ),
  basketball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M5.7 5.7C8.2 8.5 8.2 15.5 5.7 18.3" />
      <path d="M18.3 5.7C15.8 8.5 15.8 15.5 18.3 18.3" />
    </>
  ),
};

// ── The group chat ──────────────────────────────────────────────────────────
// The argument BEFORE the box score. These are the messages every league has
// on a Sunday night, and they're the setup that makes "nobody argues with the
// box score" a punchline instead of a claim. Roles, never names.
// `at` is the scroll progress the message lands on, 0–1 through the section.
// `size` is a ratio, not pixels — the CSS multiplies it, so the hierarchy
// between messages survives every breakpoint. Hard pixel sizes got flattened to
// a single value by the mobile rule, which made four voices read as one.
// Deliberately uneven: a chat is people half-shouting over each other, and four
// messages at the same weight read as a feature list.
const CHAT = [
  { text: "whos counting up\nour weekly bets??", at: 0.10, x: 57, y: 12, size: 17 },
  { text: "bro that doesnt add up", at: 0.22, x: 5, y: 32, size: 33 },   // the loud one
  { text: "i had him at 41 homers", at: 0.34, x: 62, y: 38, size: 20 },  // right side, mid
  { text: "commissioner\nprivileges\nstrikes again", at: 0.45, x: 7, y: 58, size: 22 },
  // Was at 0.60 and 15px — the smallest thing on screen, arriving at the loudest
  // moment. Worse, it eased in over 0.07 and so reached full opacity at 0.67
  // while the clear began at 0.66: it started fading before it finished
  // appearing, and never once existed at full strength.
  { text: "hows the\ncommissioner\nalways winning", at: 0.54, x: 58, y: 66, size: 24 },
];
// The face flips on the LAST message — derived from the array so retiming that
// message keeps the cut attached to it.
const CHAT_SHOUT = CHAT[CHAT.length - 1].at;
// Then it HOLDS — the shout and the last line sit together for a beat before
// anything moves. That pause is the whole joke; clearing straight away reads as
// a transition rather than a punchline.
// The last message is fully up at 0.61, so nothing moves until 0.72 — eleven
// percent of the section where the shout and all five lines just sit there.
// That pause IS the punchline; without it the section reads as a transition.
const CHAT_CLEAR = 0.72;      // everything fades out, all the way to black
const CHAT_STATEMENT = 0.84;  // and only then does the line arrive
// Finishing at 0.98 meant the statement was still fading up as the section
// unpinned — it was never on screen, at full strength, standing still. It now
// completes by 0.90 and holds for the last tenth, which is the part you read.

// Split so each word can be revealed on its own. A single block fading up is
// the cheapest move there is; words rising out of a clipped edge, staggered,
// is the one that reads as considered.
const STATEMENT = "Nobody argues with the box score.".split(" ");

function SportIcon({ kind }) {
  return (
    <svg
      className="rk-lp-sport-icon" width="32" height="32" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {SPORT_PATHS[kind]}
    </svg>
  );
}

// Where a league can live. Only ESPN is wired up today; the rest are named
// because a league owner's first question is whether their platform is here.
const PLATFORMS = [
  { name: "ESPN Fantasy", logo: "/logos/espn-fantasy-black.svg", logoDark: "/logos/espn-fantasy-white.svg", live: true },
  { name: "Yahoo Fantasy" },
  { name: "Sleeper" },
  { name: "Fantrax" },
];

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const fmtVal = (k, v) =>
  v == null ? "—"
  : k === "avg" ? v.toFixed(3).replace(/^0/, "")
  : k === "era" ? v.toFixed(2)
  : String(Math.round(v));

const statOf = (row, k) =>
  k === "avg" ? row.h / row.ab : k === "era" ? (27 * row.er) / row.outs : row[k];

// Every team's rank in every category at every week, precomputed once at module
// load. The reel needs a team's rank at week N and week N+1 sixty times a
// second; sorting eight teams per frame per category is work that never
// changes, so it happens here instead.
const RANKS = (() => {
  const out = {};
  CATS.forEach(({ key, dir }) => {
    out[key] = Array.from({ length: WEEKS }, (_, w) => {
      const sorted = DEMO_TEAMS
        .map(({ name }) => ({ name, v: statOf(DEMO_SEASON[name][w], key) }))
        .sort((a, b) => (dir === "asc" ? a.v - b.v : b.v - a.v));
      const m = {};
      sorted.forEach((t, i) => { m[t.name] = i; });
      return m;
    });
  });
  return out;
})();

// The favicon's cut of the R — coarse 4px rounded dots on a 32 grid, rather
// than the finer 5×7 pixel grid the header used to draw. Same drawing as
// public/favicon.svg so the tab icon and the page agree.
const MARK_DOTS = [
  [9, 4], [14, 4], [19, 4],
  [9, 9], [19, 9],
  [9, 14], [14, 14], [19, 14],
  [9, 19], [14, 19],
  [9, 24], [19, 24],
];

// `invert` for the mark sitting ON the accent — the tile is blue, so against a
// blue ground it disappears. Inverted it becomes a white tile with a blue
// glyph, the same flip the primary button makes.
function Mark({ t, size = 26, invert = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {!invert && (
        <defs>
          <linearGradient id="rk-mark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#34A3DB" />
            <stop offset=".5" stopColor="#0A80BF" />
            <stop offset="1" stopColor="#015B8C" />
          </linearGradient>
        </defs>
      )}
      <rect width="32" height="32" rx="8" fill={invert ? t.accentText : "url(#rk-mark-grad)"} />
      <g fill={invert ? t.accent : "#F6F2E9"}>
        {MARK_DOTS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" />)}
      </g>
    </svg>
  );
}

export default function Landing() {
  const { mode, t, toggle } = useTheme();
  const toggleLabel = mode === "light" ? "Dark mode" : "Light mode";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [cat, setCat] = useState("hr");

  // ── The reel ───────────────────────────────────────────────────────────────
  // A tall track wrapping a sticky, viewport-height frame. The page stops and
  // the season moves through it: scroll position IS the calendar. Down runs the
  // season forward, up rewinds it. Bound to scroll POSITION rather than a
  // clock, so it tracks your hand instead of playing a cutscene — the previous
  // version fired a .62s animation once on an IntersectionObserver and was then
  // inert forever.
  const trackRef = useRef(null);
  const [still, setStill] = useState(false);
  // Nothing below is React state. Driving a 60fps scrub through setState
  // re-renders eight rows, four tabs and every section on every frame, and the
  // reel visibly stuttered. These are written straight to the DOM instead, so a
  // scroll frame touches only the handful of properties that actually changed.
  const catRef = useRef("hr");
  const openRef = useRef(null);
  const halfRefs = useRef([]);
  const stageRef = useRef(null);
  const boardRef = useRef(null);
  const rowRefs = useRef({});
  const weekRef = useRef(null);
  const markRef = useRef(null);
  const ruleRef = useRef(null);
  const cueRef = useRef(null);
  const frameRef = useRef(null);
  const chatTrackRef = useRef(null);
  const chatCalmRef = useRef(null);
  const chatYellRef = useRef(null);
  const chatMsgRefs = useRef([]);
  const chatResolveRef = useRef(null);
  const chatDotsRef = useRef(null);
  const chatWordRefs = useRef([]);
  const chatSubRef = useRef(null);
  // The painter reads row height from a ref (never a stale closure); the render
  // reads the state copy. Both update together on resize / orientation change.
  const [rowH, setRowH] = useState(() =>
    rowHFor(typeof window === "undefined" ? 900 : window.innerHeight));
  const rowHRef = useRef(rowH);
  useEffect(() => { rowHRef.current = rowH; }, [rowH]);
  useEffect(() => {
    const onResize = () => setRowH(rowHFor(window.innerHeight));
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  const figRef = useRef(null);
  const railLabelRef = useRef(null);
  const leaderRef = useRef(null);
  const marginRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // One writer for the whole reel. Reads scroll, writes transforms and text.
  const paint = useRef(() => {});
  paint.current = () => {
    const el = trackRef.current;
    if (!el) return;
    const vh = window.innerHeight;
    const span = Math.max(el.offsetHeight - vh, 1);
    const scrolled = still ? span : clamp(-el.getBoundingClientRect().top, 0, span);
    const openSpan = (OPEN_VH / 100) * vh;

    // Smoothstep, so the halves ease apart instead of tracking the wheel 1:1 —
    // linear made the opening feel like dragging a panel rather than opening one.
    const raw = clamp(scrolled / openSpan, 0, 1);
    const open = raw * raw * (3 - 2 * raw);
    halfRefs.current.forEach((h, i) => {
      if (h) h.style.transform = `translateY(${(i === 0 ? -1 : 1) * open * 100}%)`;
    });
    if (openRef.current) openRef.current.style.visibility = open >= 0.999 ? "hidden" : "visible";
    // The board settles up and into place as the panel opens — scale alone read
    // as a zoom; the small rise gives it somewhere to arrive from.
    if (stageRef.current) stageRef.current.style.transform =
      `translateY(${((1 - open) * 18).toFixed(2)}px) scale(${(0.975 + open * 0.025).toFixed(4)})`;
    if (cueRef.current) cueRef.current.style.opacity = clamp(1 - open * 2.5, 0, 1).toFixed(3);

    const season = clamp((scrolled - openSpan) / Math.max(span - openSpan, 1), 0, 1);
    const wf = season * (WEEKS - 1);
    const wi = Math.floor(wf);
    const frac = wf - wi;
    const a = Math.min(wi, WEEKS - 1);
    const b = Math.min(wi + 1, WEEKS - 1);
    const cat = catRef.current;
    const ranks = RANKS[cat];
    const lerp = (x, y) => x + (y - x) * frac;

    const standings = [];
    DEMO_TEAMS.forEach(({ name }) => {
      const node = rowRefs.current[name];
      if (!node) return;
      // Rank is interpolated BETWEEN weeks, so an overtake slides across the
      // scroll that contains it. Snapping to integer ranks and smoothing with a
      // CSS transition meant every pass restarted a .45s animation mid-scroll,
      // which is what actually felt broken.
      const ra = ranks[a][name], rb = ranks[b][name];
      // Rank uses an EASED fraction, values stay linear. Interpolating rank
      // linearly meant two crossing rows sat on top of each other for a long
      // stretch of scroll — and with opaque row grounds, the one underneath
      // simply vanished. Since scroll is the clock, you could stop dead on that
      // frame and see seven rows with one swallowed. Smootherstep spends its
      // speed in the middle of the pass, so the rows are only coincident for a
      // few pixels of scroll and the overtake reads as a flick rather than a
      // slow merge. Values keep tracking the wheel 1:1 so the counters still
      // climb steadily.
      const e = frac * frac * frac * (frac * (frac * 6 - 15) + 10);
      const r = ra + (rb - ra) * e;
      // Mid-pass choreography: the CLIMBING row rides on top with a faint
      // tint that peaks at the crossing, so a pass reads as one card sliding
      // over another — never two rows printed through each other. The row
      // being passed drops underneath.
      const mid = ra !== rb && frac > 0.001 && frac < 0.999;
      // Rows stay flush left through a pass. Nudging the descending row sideways
      // to keep it visible only exposed its value column past the edge of the
      // row on top — two figures printed across each other, which reads as a
      // glitch. FULL occlusion is the intended effect: one card slides over
      // another. The fix for the crossing was never to half-hide a row, it was
      // to spend less scroll there, which the easing above does.
      node.style.transform = `translateY(${(r * rowHRef.current).toFixed(2)}px)`;
      node.style.zIndex = mid ? (rb < ra ? "3" : "1") : "";
      node.style.backgroundColor = mid && rb < ra
        ? `color-mix(in srgb, var(--rk-hover) ${Math.round(Math.sin(Math.PI * frac) * 100)}%, var(--rk-page))`
        : "";
      const lead = r < 0.5;
      if (node.dataset.lead !== String(lead)) {
        node.dataset.lead = String(lead);
        node.classList.toggle("is-first", lead);
      }
      const rk = String(Math.round(r) + 1);
      if (node.firstChild.textContent !== rk) node.firstChild.textContent = rk;

      const A = DEMO_SEASON[name][a], B = DEMO_SEASON[name][b];
      const v = cat === "avg" ? lerp(A.h, B.h) / lerp(A.ab, B.ab)
              : cat === "era" ? (27 * lerp(A.er, B.er)) / lerp(A.outs, B.outs)
              : lerp(A[cat], B[cat]);
      const cell = node.lastChild;
      const txt = fmtVal(cat, v);
      if (cell.textContent !== txt) cell.textContent = txt;
      standings.push({ name, v });
    });

    // The rail: the leading number, huge, ticking with the scroll — and who
    // holds it, by how much. The board rows answer "who's where"; the rail
    // answers "what's the number to beat", which is the product's actual
    // headline at any moment of the season.
    const dir = CATS.find((c) => c.key === cat).dir;
    standings.sort((x, y) => (dir === "asc" ? x.v - y.v : y.v - x.v));
    const top = standings[0], second = standings[1];
    if (top && second) {
      const fig = fmtVal(cat, top.v);
      if (figRef.current && figRef.current.textContent !== fig) figRef.current.textContent = fig;
      if (leaderRef.current && leaderRef.current.textContent !== top.name) leaderRef.current.textContent = top.name;
      const gap = fmtVal(cat, Math.abs(top.v - second.v));
      const marginTxt = /^[0.]*$|^\.000$/.test(gap)
        ? `level with ${second.name}`
        : `${gap} clear of ${second.name}`;
      if (marginRef.current && marginRef.current.textContent !== marginTxt) marginRef.current.textContent = marginTxt;
      const railLabel = `${CATS.find((c) => c.key === cat).label} · leader`;
      if (railLabelRef.current && railLabelRef.current.textContent !== railLabel) railLabelRef.current.textContent = railLabel;
    }

    if (ruleRef.current) ruleRef.current.style.transform = `scaleX(${season.toFixed(4)})`;
    const label = DEMO_WEEK_LABELS[Math.min(wi, WEEKS - 1)];
    if (weekRef.current && weekRef.current.textContent !== label) weekRef.current.textContent = label;
    if (markRef.current) {
      const done = season > 0.985;
      const mark = done ? "Season final" : `Week ${Math.min(wi + 1, WEEKS)} of ${WEEKS}`;
      if (markRef.current.textContent !== mark) {
        markRef.current.textContent = mark;
        markRef.current.classList.toggle("is-done", done);
      }
      // The finish gets a beat: the winning row flashes once as the season
      // closes. Class-driven so scrolling back and forward replays it.
      if (boardRef.current) boardRef.current.classList.toggle("is-final", done);
      // Lights out. The stage snaps to the dark ground as the winning pass
      // completes — a hard cut, not a fade, timed to the flash — and the dark
      // band is the very next thing after the track, so the finish bleeds
      // straight into "Nobody argues with the box score." Rewinding restores
      // daylight; the whole season replays in reverse.
      if (frameRef.current) frameRef.current.classList.toggle("is-dark", done);
    }

    // ── The group chat ──────────────────────────────────────────────────────
    // Its own pinned track, deliberately short — this is a gag, not a second
    // epic. Messages arrive one at a time, the face flips to the shout ON the
    // last one, then the noise clears and the line answers it.
    const ct = chatTrackRef.current;
    if (ct) {
      const cSpan = Math.max(ct.offsetHeight - vh, 1);
      const cp = still ? 1 : clamp(-ct.getBoundingClientRect().top, 0, cSpan) / cSpan;

      CHAT.forEach((m, i) => {
        const node = chatMsgRefs.current[i];
        if (!node) return;
        // Each message eases in over a short window and holds, then the whole
        // set clears together once the line takes over.
        const t = clamp((cp - m.at) / 0.07, 0, 1);
        const eased = t * t * (3 - 2 * t);
        const out = clamp((cp - CHAT_CLEAR) / 0.08, 0, 1);
        node.style.opacity = String(eased * (1 - out));
        node.style.transform = `translateY(${((1 - eased) * 16 - out * 18).toFixed(1)}px) scale(${(0.94 + eased * 0.06).toFixed(3)})`;
      });

      // Hard cut, not a crossfade — a dissolve between two expressions is a
      // morph, and a morph has no comic timing. The swap has to land as a cut.
      const shout = cp >= CHAT_SHOUT;
      if (chatCalmRef.current) chatCalmRef.current.style.opacity = shout ? "0" : "1";
      if (chatYellRef.current) chatYellRef.current.style.opacity = shout ? "1" : "0";

      // The face rises in, holds through the shout, then clears COMPLETELY.
      // It used to fade only to 25% and start receding while the statement was
      // already coming up, so the two overlapped and the screen was never
      // actually empty — the line landed on top of a ghost instead of arriving
      // out of black.
      const rise = clamp(cp / 0.12, 0, 1);
      const settle = rise * rise * (3 - 2 * rise);
      const recede = clamp((cp - CHAT_CLEAR) / 0.10, 0, 1);
      const holder = chatCalmRef.current?.parentElement;
      if (holder) {
        holder.style.opacity = String(settle * (1 - recede));
        holder.style.transform =
          `translateY(${((1 - settle) * 40 - recede * 18).toFixed(1)}px) scale(${(0.9 + settle * 0.1 - recede * 0.05).toFixed(3)})`;
      }
      // The texture goes with it, or the "black" still has a halo in it.
      if (chatDotsRef.current) chatDotsRef.current.style.opacity = String(1 - recede);

      // The statement assembles word by word. The container no longer fades —
      // fading the whole block AND sliding it was two soft moves stacked, which
      // is what "premium" motion never is. The words are clipped, so before
      // their own window opens there is genuinely nothing on screen.
      const r = clamp((cp - CHAT_STATEMENT) / 0.14, 0, 1);
      chatWordRefs.current.forEach((w, i) => {
        if (!w) return;
        // Each word gets its own window, offset by index. easeOutExpo: a fast
        // departure that decelerates hard into place — the curve that reads as
        // weight arriving rather than a linear slide.
        const t = clamp((r - i * 0.055) / 0.42, 0, 1);
        const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        w.style.transform = `translateY(${((1 - e) * 108).toFixed(2)}%)`;
      });
      // The supporting line waits until the headline is essentially seated.
      if (chatSubRef.current) {
        const s = clamp((r - 0.55) / 0.35, 0, 1);
        const se = s * s * (3 - 2 * s);
        chatSubRef.current.style.opacity = String(se);
        chatSubRef.current.style.transform = `translateY(${((1 - se) * 12).toFixed(1)}px)`;
      }
    }
  };

  useEffect(() => {
    paint.current();
    if (still) return;
    let raf = null;
    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(() => { raf = null; paint.current(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [still]);

  // Switching category is the one moment rows SHOULD tween — the whole board
  // re-sorts at a standstill. Enable the transition just for that beat.
  const [switching, setSwitching] = useState(false);
  function pickCat(key) {
    catRef.current = key;
    setCat(key);
    setSwitching(true);
    paint.current();
    clearTimeout(pickCat.t);
    pickCat.t = setTimeout(() => setSwitching(false), 420);
  }

  // Marks the section you're looking at, the way the club's nav does.
  const [activeNav, setActiveNav] = useState("");
  useEffect(() => {
    const ids = ["how", "board", "request"];
    const onScroll = () => {
      const line = window.innerHeight * 0.35;
      let current = "";
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      });
      setActiveNav(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // STOPGAP until a real collector is wired: hand the address to a prefilled
  // mail draft. It used to set `sent` and nothing else — the visitor read
  // "You're on the list" and the address was discarded on the spot, which is
  // worse than having no form at all. A mailto at least cannot lose anything.
  function submit(e) {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    const subject = encodeURIComponent("rake — request access");
    const body = encodeURIComponent(`Requesting access to rake.\n\nEmail: ${address}\n`);
    window.location.href = `mailto:${ACCESS_INBOX}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="rk-root rk-landing" style={{ fontFamily: "var(--rk-font)", background: t.pageBg, minHeight: "100vh", color: t.textSecondary }}>

      {/* The mark, not the wordmark — the word is already the first thing the
          opening says at 100px, so repeating it 60px above was the page
          introducing itself twice.
          Left gutter, not centred: it now shares one edge with the headline,
          sub, buttons and cue. A centred mark was the club header's convention
          carried over, and the only centred thing on a left-aligned panel — it
          made the top of the opening read as unrelated to the bottom. */}
      <div className="rk-lp-brandbar is-accent">
        <span style={{ display: "inline-flex" }} aria-label="rake" role="img">
          <Mark t={t} size={30} invert />
        </span>
        <button className="rk-iconbtn" onClick={toggle} aria-label={toggleLabel} title={toggleLabel}>
          {mode === "light"
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
        </button>
      </div>

      {/* The reel. Scroll is time. */}
      <section
        className="rk-reel-track"
        id="board"
        ref={trackRef}
        style={{ height: still ? "auto" : `${100 + OPEN_VH + SEASON_VH}vh` }}
      >
        <div className={"rk-reel-frame" + (still ? " is-still" : "")} ref={frameRef}>

          {/* The opening: one blue card, split at the seam, drawn apart by
              scroll. Identical content in both halves so it reads as a single
              image until it parts. */}
          {!still && (
            <div className="rk-open" ref={openRef}>
              {["is-top", "is-bot"].map((half, i) => (
                <div
                  key={half}
                  ref={(n) => { halfRefs.current[i] = n; }}
                  className={`rk-open-half ${half}`}
                >
                  <div className="rk-open-inner">
                    {/* The bottom half repeats the words so the two clipped
                        views read as one image — repeated for the eye, not for
                        a screen reader. */}
                    <h1 className="rk-open-title" aria-hidden={i === 1 ? "true" : undefined}>
                      Doing the math your league won't.
                    </h1>
                    {/* Sub and buttons share a row, tops aligned. Stacking the
                        buttons under the sub leaves the right half of a wide
                        panel empty; pinning them to the right gutter (what they
                        did before) orphaned them in that emptiness with nothing
                        to relate to. Paired, they read as the answer to the
                        sentence beside them and the row holds the full width. */}
                    <div className="rk-open-row">
                      <p className="rk-open-sub" aria-hidden={i === 1 ? "true" : undefined}>
                        Live standings for the side bets your league runs, read
                        off the box score.
                      </p>
                    {/* The buttons render in BOTH halves. They only ever appear
                        below the seam, so the top half's copy is always clipped
                        away — it exists purely to keep the two flows identical.
                        Putting them in the bottom half alone worked while they
                        were absolutely positioned, but the mobile rule makes
                        them static: they then joined the bottom half's flex
                        flow, lifted its content 37px relative to the top's, and
                        the seam tore mid-sentence, eating a whole line of the
                        sub. Same content in both halves is the invariant the
                        whole illusion rests on. */}
                    <div
                      className="rk-open-cta"
                      aria-hidden={i === 0 ? "true" : undefined}
                      {...(i === 0 ? { inert: "" } : {})}
                    >
                      <a href="#request" className="rk-open-cta-primary" tabIndex={i === 0 ? -1 : undefined}>Request access &rarr;</a>
                      <Link to={`/${DEMO_SLUG}`} className="rk-open-cta-secondary" tabIndex={i === 0 ? -1 : undefined}>View a live club</Link>
                    </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* The cue says what the scroll BUYS you, not just that scrolling
                  is possible. A bare 1px drip is too quiet on a panel whose
                  whole premise is that it opens — and nothing told a visitor
                  the payoff was worth the distance. On the left axis with
                  everything else. Fades as soon as they oblige. */}
              <div className="rk-open-cue" ref={cueRef} aria-hidden="true">
                <span className="rk-open-cue-line"><i /></span>
                <span className="rk-open-cue-label">Scroll — the season plays</span>
              </div>
            </div>
          )}

          <div className="rk-reel-stage" ref={stageRef}>
            <div className="rk-reel-meta">
              <span className="rk-reel-week" ref={weekRef}>{DEMO_WEEK_LABELS[0]}</span>
              <span className="rk-reel-rule" aria-hidden="true"><span ref={ruleRef} /></span>
              <span className="rk-reel-mark" ref={markRef}>{`Week 1 of ${WEEKS}`}</span>
            </div>

            <div className="rk-reel-tabs">
              {CATS.map((c) => (
                <button
                  key={c.key}
                  className={"rk-lp-spot-tab" + (cat === c.key ? " is-active" : "")}
                  onClick={() => pickCat(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="rk-reel-main">
              {/* The rail: the number to beat, at display size, with who holds
                  it and by how much. The painter drives all four lines. */}
              <div className="rk-reel-rail">
                <span className="rk-reel-rail-label" ref={railLabelRef}>Home Runs · leader</span>
                <div className="rk-reel-figure" ref={figRef}>—</div>
                <div className="rk-reel-leader" ref={leaderRef}>—</div>
                <div className="rk-reel-margin" ref={marginRef}>&nbsp;</div>
              </div>

            {/* Rows are rendered once and never re-rendered — the painter owns
                their transform, rank and figure. Order in the DOM is fixed;
                position comes entirely from the transform. */}
            <div
              className={"rk-reel-board" + (switching ? " is-switching" : "")}
              ref={boardRef}
              style={{ height: `${DEMO_TEAMS.length * rowH}px` }}
            >
              {DEMO_TEAMS.map(({ name, crest }) => (
                <div
                  key={name}
                  ref={(n) => { rowRefs.current[name] = n; }}
                  className="rk-reel-row"
                  style={{ height: `${rowH}px` }}
                >
                  <span className="rk-reel-rank">1</span>
                  <img src={crest} alt="" className="rk-reel-crest" loading="eager" />
                  <span className="rk-reel-name">{name}</span>
                  <span className="rk-reel-value">—</span>
                </div>
              ))}
            </div>
            </div>

            {/* The foot mirrors the columns above it: the link sits under the
                rail, the caption under the board it describes. Running both
                from the far left meant the caption started under the rail and
                annotated nothing. */}
            <div className="rk-reel-foot">
              <Link to={`/${DEMO_SLUG}`} className="rk-lp-cta-secondary">View a live club</Link>
              <span className="rk-reel-caption">
                A sample season · ${PER_CATEGORY} a category
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* The group chat. Sits between the reel's dark finish and the band, so
          all three share one continuous dark run: the season settles, the
          league argues about it, the box score answers. MOCKUP — the faces are
          placeholders; swap in /faces/calm.webp and /faces/yell.webp. */}
      <section className="rk-chat-track" ref={chatTrackRef} style={{ height: still ? "auto" : "230vh" }}>
        <div className={"rk-chat-frame" + (still ? " is-still" : "")}>
          <span className="rk-chat-dots" ref={chatDotsRef} aria-hidden="true" />
          {/* Two layers, both loaded, opacity-swapped by the painter — the
              cut has to be instant, and decoding a 1.4MP PNG at the punchline
              would stall it. onError hides a missing file rather than showing
              a broken-image icon. */}
          <div className="rk-chat-face">
            <span className="rk-chat-layer" ref={chatCalmRef}>
              <img src="/faces/calm.webp" alt="" className="rk-chat-img"
                   onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </span>
            <span className="rk-chat-layer" ref={chatYellRef}>
              <img src="/faces/yell.webp" alt="" className="rk-chat-img"
                   onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </span>
          </div>
          {CHAT.map((m, i) => (
            <span
              key={m.text}
              ref={(n) => { chatMsgRefs.current[i] = n; }}
              className="rk-chat-msg"
              style={{ left: `${m.x}%`, top: `${m.y}%`, "--s": m.size }}
            >
              {m.text}
            </span>
          ))}
          {/* Each word rides in a clipped box, so it rises from behind a hard
              edge rather than fading in place. Scrubbed by scroll, staggered
              word by word — the line assembles itself as you arrive. */}
          <div className="rk-chat-resolve" ref={chatResolveRef}>
            <span className="rk-chat-line">
              {STATEMENT.map((w, i) => (
                <span className="rk-chat-word" key={`${w}-${i}`}>
                  <i ref={(n) => { chatWordRefs.current[i] = n; }}>{w}</i>
                </span>
              ))}
            </span>
            <span className="rk-chat-sub" ref={chatSubRef}>
              The number everyone in the league is looking at is the same number, at the same time, from the same source.
            </span>
          </div>
        </div>
      </section>

      {/* The bet travels. Below the band — breadth only lands once you know
          what the thing is. */}
      <section className="rk-lp-sports">
        <div className="rk-lp-sports-head rk-rise">A bet is a stat, a direction and a payout.<br />That works in any sport.</div>
        <p className="rk-lp-sports-sub rk-rise">Baseball is the season that's running. The machinery doesn't care which one it is.</p>
        <div className="rk-lp-sports-grid">
          {SPORTS.map((s) => (
            <div key={s.sport} className={"rk-lp-sport rk-rise" + (s.live ? " is-live" : "")}>
              <SportIcon kind={s.icon} />
              <div className="rk-lp-sport-name">{s.sport} — {s.when}</div>
              <ul className="rk-lp-sport-bets">
                {s.bets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Where a league can live. Honest about what's connected today. */}
      <section className="rk-lp-platforms">
        <div className="rk-lp-platforms-label rk-rise">Connect your league</div>
        <div className="rk-lp-platforms-row rk-rise">
          {PLATFORMS.map((p2) => (
            <span key={p2.name} className={"rk-lp-platform" + (p2.live ? " is-live" : "")}>
              {p2.logo && <img src={mode === "dark" ? p2.logoDark : p2.logo} alt="" className="rk-lp-platform-logo" />}
              <span className="rk-lp-platform-name">{p2.name}</span>
              <span className="rk-lp-platform-state">{p2.live ? "Connected" : "Soon"}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Request access — a ruled line, matching the product's unfilled controls */}
      <section className="rk-lp-request is-accent" id="request">
        <div className="rk-lp-request-head rk-rise">Request access</div>
        <p className="rk-lp-request-sub rk-rise">
          Baseball is already running. Football is the one to get set up for — leave an address and we'll open it before the draft.
        </p>
        {/* The confirmation says what actually happened. "You're on the list"
            was a claim the page couldn't keep — the send is in the visitor's
            hands until a collector exists. */}
        <form className="rk-lp-form rk-rise" onSubmit={submit}>
          {sent ? (
            <div className="rk-lp-sent">Your mail app should be open — send it and you're on the list.</div>
          ) : (
            <div className="rk-lp-field">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="rk-lp-input"
              />
              <button type="submit" className="rk-lp-submit">Request access →</button>
            </div>
          )}
        </form>
      </section>

      {/* Same footer as the club — mark + wordmark left, two lines of fine print
          right, 48px of separation above the divider. */}
      <div className="rk-lp-foot">
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <Mark t={t} size={26} />
          <span className="rk-wordmark" style={{ fontSize: "19px" }}>rake</span>
        </div>
        <div className="rk-lp-legal">
          Side-bet standings for fantasy leagues · data from ESPN Fantasy &amp; MLB<br />
          Independent — not affiliated with any league or network.
        </div>
      </div>
    </div>
  );
}
