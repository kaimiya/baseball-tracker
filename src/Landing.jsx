import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "./theme.js";
import { useLeagueData } from "./useLeagueData.js";
import { useLiveToday } from "./useLiveToday.js";

// The club that's actually running. The landing page's proof is that these
// numbers are real and moving, so it reads from the same feed the board does.
const DEMO_SLUG = "if-can-can";
// How many rows of the running order are on screen at once.
const VISIBLE_ROWS = 6;
const ROW_H = 54;   // a touch over the club's 52; 64 left each row mostly empty air
// What each category pays in the club that's running. One league's bet, not the
// product's model — this belongs in league config once clubs are configurable.
const PER_CATEGORY = 100;
// Three steps, once a season. The nav has always promised this section.
// Invented teams. This is a demo, so it shouldn't publish a real league's
// names — and the placeholder crest keeps it visibly a sample, not a club.
const DEMO_TEAMS = [
  { name: "Rally Caps",       crest: "/logos/demo/1.png", hr: 268, avg: .271, wins: 96, era: 3.18 },
  { name: "Warning Track",    crest: "/logos/demo/2.png", hr: 254, avg: .266, wins: 91, era: 3.31 },
  { name: "The Cutoff Man",   crest: "/logos/demo/3.png", hr: 249, avg: .262, wins: 88, era: 3.44 },
  { name: "Foul Territory",   crest: "/logos/demo/4.png", hr: 241, avg: .259, wins: 84, era: 3.57 },
  { name: "Bush League",      crest: "/logos/demo/5.png", hr: 232, avg: .255, wins: 80, era: 3.69 },
  { name: "Can Of Corn",      crest: "/logos/demo/6.png", hr: 224, avg: .252, wins: 77, era: 3.78 },
  { name: "Pinch Runners",    crest: "/logos/demo/1.png", hr: 216, avg: .249, wins: 73, era: 3.91 },
  { name: "Golden Sombrero",  crest: "/logos/demo/2.png", hr: 205, avg: .244, wins: 69, era: 4.06 },
];

const STEPS = [
  { n: "01", head: "Connect the league", body: "Sign in to ESPN once. Rake reads your league's box score directly — no exports, no spreadsheet to keep current." },
  { n: "02", head: "Name the bets", body: "Pick the categories you're betting on and what each one pays. Most clubs run four. Yours can run one or ten." },
  { n: "03", head: "Read the board", body: "Standings re-rank themselves as games finish. Everyone in the league sees the same number at the same time." },
];
const CATS = [
  { key: "hr", label: "Home Runs", short: "HR" },
  { key: "avg", label: "Batting Avg", short: "AVG" },
  { key: "wins", label: "Wins", short: "W" },
  { key: "era", label: "Best ERA", short: "ERA" },
];

// The product isn't baseball — it's whatever the bet is measured on. Baseball is
// simply the season that's running, so it's the one marked live.
const SPORTS = [
  { sport: "Baseball", live: true, bets: ["Most home runs", "Best batting average", "Most wins", "Best ERA"] },
  { sport: "Football", bets: ["Most passing yards", "Most sacks", "Fewest turnovers", "Most rushing TDs"] },
  { sport: "Basketball", bets: ["Most threes", "Best field goal %", "Most assists", "Most blocks"] },
];

// Where a league can live. Only ESPN is wired up today; the rest are named
// because a league owner's first question is whether their platform is here.
const PLATFORMS = [
  // Only ESPN carries a mark — it's the one that's actually connected, and the
  // only supplied asset that works on this ground. The rest are set as text.
  { name: "ESPN Fantasy", logo: "/logos/espn-fantasy-black.svg", logoDark: "/logos/espn-fantasy-white.svg", live: true },
  { name: "Yahoo Fantasy" },
  { name: "Sleeper" },
  { name: "Fantrax" },
];

function MarkTile({ t, size = 26 }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size * 0.26, background: t.markTile,
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <svg width={size * 0.5} height={size * 0.62} viewBox="0 0 5 7" fill={t.markDot} aria-hidden="true">
        {[[0,0],[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3],[0,4],[2,4],[0,5],[3,5],[0,6],[4,6]]
          .map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width=".82" height=".82" />)}
      </svg>
    </span>
  );
}

export default function Landing() {
  const { mode, t, toggle } = useTheme();
  const toggleLabel = mode === "light" ? "Dark mode" : "Light mode";
  const league = useLeagueData();
  const live = useLiveToday();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  // Matches the club's nav: the item for the section you're looking at is
  // marked, rather than every item sitting inert until clicked.
  const [activeNav, setActiveNav] = useState("");
  // Marks the section you're looking at, the way the club's nav does.
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
  // A DEMO, not the live board. Switching categories only re-sorts the same
  // eight teams, so most switches move one or two rows and read as nothing
  // happening — the section's whole job is to show that the order changes by
  // itself. So: real names and crests from the feed, but a scripted sequence of
  // single adjacent overtakes on top, one per beat, so you always see exactly
  // one team pass one other. The real numbers are inside the club.
  const [cat, setCat] = useState("hr");
  const paused = useRef(false);

  const ready = league.status === "ready" && league.players.length > 0;
  const fmtAvg = (v) => v.toFixed(3).replace("0.", ".");
  const fmtERA = (v) => v.toFixed(2);
  const fmtVal = (k, v) => (v == null ? "—" : k === "avg" ? fmtAvg(v) : k === "era" ? fmtERA(v) : String(Math.round(v)));
  const valOf = (team, k) => DEMO_TEAMS.find((d) => d.name === team)?.[k];

  // The true standing for this category — the order the demo starts from.
  const base = [...DEMO_TEAMS]
    .map((d) => d.name)
    .sort((a, b) => (cat === "era" ? valOf(a, cat) - valOf(b, cat) : valOf(b, cat) - valOf(a, cat)));

  // The running order, mutated one adjacent swap at a time. It has to persist
  // between beats: recomputing "base plus one swap" each time meant the previous
  // swap unwound as the next one applied, so three or four rows moved at once
  // instead of one team passing one other.
  const [order, setOrder] = useState([]);
  useEffect(() => { setOrder(base); }, [cat]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (paused.current) return;
      setOrder((prev) => {
        if (prev.length < 2) return prev;
        // Swap a random adjacent pair inside the visible rows, so the overtake
        // always happens where it can be seen.
        const top = Math.min(VISIBLE_ROWS, prev.length) - 1;
        const k = Math.floor(Math.random() * top);
        const next = [...prev];
        [next[k], next[k + 1]] = [next[k + 1], next[k]];
        return next;
      });
    }, 2400);
    return () => clearInterval(id);
  }, []);

  // The category's values in rank order, held fixed while names move through them.
  const sortedVals = DEMO_TEAMS.map((d) => d[cat])
    .sort((a, b) => (cat === "era" ? a - b : b - a));

  // Split-flap digits in the band. They roll, settle, hold, then roll again —
  // a scoreboard mid-update rather than a static number.
  const [flap, setFlap] = useState([2, 6, 8]);
  const prevFlap = useRef([2, 6, 8]);
  const setFlapTracked = (next) => { setFlap((cur) => { prevFlap.current = cur; return next; }); };
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let settle;
    const roll = () => {
      let ticks = 0;
      const spin = setInterval(() => {
        setFlapTracked([0, 1, 2].map(() => Math.floor(Math.random() * 10)));
        if (++ticks > 3) {
          clearInterval(spin);
          // land on a plausible home-run total, not noise
          setFlapTracked(String(240 + Math.floor(Math.random() * 40)).split("").map(Number));
        }
      }, 480);   // one full two-leaf hand-off (.22s fall + .24s rise)
    };
    settle = setInterval(roll, 4600);
    return () => { clearInterval(settle); };
  }, []);

  // Reveal sections as they enter view. One observer, unobserving as it fires —
  // a section should animate once, not every time it re-enters.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".rk-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Rows deal in on first paint only; after that the swap animation owns them.
  const [dealt, setDealt] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDealt(true), 900); return () => clearTimeout(t); }, []);

  // Pause on interaction, then resume — don't stop for good. Killing autoplay
  // on the first tab click made sense when the board sat mid-page, but it's the
  // hero now and the motion is the pitch: clicking a category left you with a
  // permanently frozen board, which reads as broken rather than considerate.
  const resumeAt = useRef(null);
  const pauseBriefly = () => {
    paused.current = true;
    clearTimeout(resumeAt.current);
    resumeAt.current = setTimeout(() => { paused.current = false; }, 6000);
  };
  useEffect(() => () => clearTimeout(resumeAt.current), []);

  const leader = order[0];
  const runnerUp = order[1];
  let marginText = "";
  if (leader && runnerUp) {
    const d = Math.abs(sortedVals[0] - sortedVals[1]);
    const amount =
      cat === "avg" ? `${Math.round(d * 1000)} points`
      : cat === "era" ? d.toFixed(2).replace(/^0/, "")
      : String(Math.round(d));
    marginText = `${amount} clear of ${runnerUp}`;
  }

  // Same deadline the club counts down to.
  const REGULAR_SEASON_END = new Date(2026, 7, 30);
  const today = new Date();
  const daysLeft = Math.max(0, Math.ceil((REGULAR_SEASON_END - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000));

  function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: wire to a real collector. Acknowledges locally rather than silently
    // dropping the address.
    setSent(true);
  }

  return (
    <div className="rk-root rk-landing" style={{ fontFamily: "var(--rk-font)", background: t.pageBg, minHeight: "100vh", color: t.textSecondary }}>

      {/* Identical construction to the club's header: a centred wordmark row
          with the theme toggle at the right, then a centred row of tracked
          caps beneath it. Same two hairlines, same rhythm. */}
      <div className="rk-lp-brandbar">
        <span />
        <span className="rk-wordmark" style={{ fontSize: "25px", justifySelf: "center" }}>rake</span>
        <button className="rk-iconbtn" onClick={toggle} aria-label={toggleLabel} title={toggleLabel} style={{ justifySelf: "end" }}>
          {mode === "light"
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
        </button>
      </div>

      {/* Hero. The headline and the working board share the first screen: the
          board demonstrates the product in four seconds, which the copy can only
          describe. Splitting them meant a visitor read a pitch and scrolled past
          three explanatory sections before seeing the thing itself. */}
      <section className="rk-lp-hero" id="board">
        <div className="rk-lp-hero-copy">
          <h1 className="rk-lp-h1">
            Doing the math<br />your league won't.
          </h1>
          <p className="rk-lp-sub">
            Live standings for the side bets your league runs — read off the box
            score, so nobody takes anybody's word for it.
          </p>
          <div className="rk-lp-hero-cta">
            <a href="#request" className="rk-lp-cta-primary">Request access &rarr;</a>
            <Link to={`/${DEMO_SLUG}`} className="rk-lp-cta-secondary">View a live club</Link>
          </div>
        </div>

        <div className="rk-lp-hero-board">
          <div className="rk-lp-spot-tabs">
            {CATS.map((c) => (
              <button
                key={c.key}
                className={"rk-lp-spot-tab" + (cat === c.key ? " is-active" : "")}
                onClick={() => { pauseBriefly(); setCat(c.key); }}
              >
                {c.label}
              </button>
            ))}
          </div>
        <div className="rk-lp-board-body">
          {/* Rows are keyed by team and move by transform only — reordering them
              in the DOM would remount and the transition could never run. */}
          <div className="rk-lp-card">
            <div className="rk-lp-race" style={{ height: `${VISIBLE_ROWS * ROW_H + 1}px` }}>
              {order.map((team, i) => (
                <div
                  key={team}
                  className={"rk-lp-racerow" + (i === 0 ? " is-first" : "") + (dealt ? "" : " is-dealt")}
                  style={{
                    height: `${ROW_H}px`,
                    transform: `translateY(${i * ROW_H}px)`,
                    animationDelay: dealt ? undefined : `${i * 55}ms`,
                    opacity: i >= VISIBLE_ROWS ? 0 : 1,
                    // No per-row delay. Staggering by destination index — what
                    // the handoff asked for — means a team dropping from 1st to
                    // 8th sits still for 595ms while everything moves around it
                    // and then falls late, because the rows that travel furthest
                    // are the ones made to wait longest. That stagger suits a
                    // list appearing; a category switch is a re-sort, and a
                    // leaderboard re-sorting should settle as one.
                  }}
                >
                  <span className="rk-lp-racerank">{i + 1}</span>
                  <img src={DEMO_TEAMS.find((d) => d.name === team)?.crest} alt="" className="rk-lp-racecrest" />
                  <span className="rk-lp-racename">{team}</span>
                  {/* Positional, not per-team: the swap moves NAMES between fixed
                      values, so the column always reads top-to-bottom in order.
                      Carrying each team's own number made the board unsorted
                      after a couple of beats — 4th place showing the highest
                      figure, which just looks broken. */}
                  <span className="rk-lp-racevalue">{fmtVal(cat, sortedVals[i])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Caption only — the "view a live club" link lives in the hero CTA pair
            a few inches to the left, and repeating it in the same view read as
            a mistake rather than a second chance to click. */}
        <div className="rk-lp-board-foot">
          <span className="rk-lp-board-meta">${PER_CATEGORY} a category &middot; settled automatically</span>
        </div>
        </div>
      </section>

      {/* Full-bleed band. Dark in both themes — its own ground is the boundary,
          so it needs no hairline. */}
      <section className="rk-lp-band rk-reveal">
        {/* A split-flap board rather than a photograph. The one here was a
            licensed press shot with rights unverified, and a stock celebration
            frame is what every sports product uses. A scoreboard that keeps
            re-settling says "these numbers move" in the product's own language,
            and it's original. */}
        <span className="rk-lp-band-dots" aria-hidden="true" />
        <div className="rk-lp-flap" aria-hidden="true">
          {flap.map((d, i) => {
            const was = prevFlap.current[i];
            return (
              <span key={i} className="rk-lp-flap-cell">
                {/* Settled state underneath: top half already shows the new
                    digit, bottom half still shows the old one. */}
                <span className="rk-flap-half rk-flap-top"><b>{d}</b></span>
                <span className="rk-flap-half rk-flap-bot"><b>{was}</b></span>
                {/* Two hinged leaves over them, keyed so each change replays:
                    the old top falls away, then the new bottom swings up. */}
                <span key={`t${d}-${was}`} className="rk-flap-half rk-flap-top rk-flap-leaf-top"><b>{was}</b></span>
                <span key={`b${d}-${was}`} className="rk-flap-half rk-flap-bot rk-flap-leaf-bot"><b>{d}</b></span>
              </span>
            );
          })}
        </div>
        <div className="rk-lp-band-type">
          <div className="rk-lp-band-head">Nobody argues with the box score.</div>
          <p className="rk-lp-band-sub">The number everyone in the league is looking at is the same number, at the same time, from the same source.</p>
        </div>
      </section>

      {/* The bet travels. Below the band now — breadth only lands once you know
          what the thing is. */}
      <section className="rk-lp-sports rk-reveal">
        <div className="rk-lp-sports-head">A bet is a stat, a direction and a payout.<br />That works in any sport.</div>
        <p className="rk-lp-sports-sub">Baseball is the season that's running. The machinery doesn't care which one it is.</p>
        <div className="rk-lp-sports-grid">
          {SPORTS.map((s) => (
            <div key={s.sport} className={"rk-lp-sport" + (s.live ? " is-live" : "")}>
              <div className="rk-lp-sport-name">{s.sport}{s.live ? " — Live" : ""}</div>
              <ul className="rk-lp-sport-bets">
                {s.bets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Where a league can live. Honest about what's connected today. */}
      <section className="rk-lp-platforms rk-reveal">
        <div className="rk-lp-platforms-label">Connect your league</div>
        <div className="rk-lp-platforms-row">
          {PLATFORMS.map((p) => (
            <span key={p.name} className={"rk-lp-platform" + (p.live ? " is-live" : "")}>
              {p.logo && <img src={mode === "dark" ? p.logoDark : p.logo} alt="" className="rk-lp-platform-logo" />}
              <span className="rk-lp-platform-name">{p.name}</span>
              <span className="rk-lp-platform-state">{p.live ? "Connected" : "Soon"}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Request access — a ruled line, matching the product's unfilled controls */}
      <section className="rk-lp-request rk-reveal" id="request">
        <div className="rk-lp-request-head">Request access</div>
        {/* Names the next season rather than the current one — baseball is
            already running, so the thing to sign up FOR is football. */}
        <p className="rk-lp-request-sub">
          Baseball is already running. Football is the one to get set up for — leave an address and we'll open it before the draft.
        </p>
        <form className="rk-lp-form" onSubmit={submit}>
          {sent ? (
            <div className="rk-lp-sent">You're on the list — we'll be in touch.</div>
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
          <MarkTile t={t} size={26} />
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
