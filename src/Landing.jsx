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
const ROW_H = 52;
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
  // The board section reads the LIVE feed, one category at a time, and cycles
  // through them. The previous version animated a scripted column of batting
  // averages — it proved a quarter of the product and none of it was real.
  const [cat, setCat] = useState("hr");
  const paused = useRef(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      // A control that keeps moving after you've used it is hostile, so the
      // first tab click stops this permanently.
      if (paused.current) return;
      setCat((c) => CATS[(CATS.findIndex((x) => x.key === c) + 1) % CATS.length].key);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const ready = league.status === "ready" && league.players.length > 0;
  const fmtAvg = (v) => v.toFixed(3).replace("0.", ".");
  const fmtERA = (v) => v.toFixed(2);
  const fmtVal = (k, v) => (v == null ? "—" : k === "avg" ? fmtAvg(v) : k === "era" ? fmtERA(v) : String(Math.round(v)));

  // ERA ascending, everything else descending — "best" differs by category.
  const valOf = (team, k) => (league.seasonTotals?.[team] || {})[k];
  const ranked = ready
    ? [...league.players]
        .filter((p) => valOf(p, cat) != null)
        .sort((a, b) => (cat === "era" ? valOf(a, cat) - valOf(b, cat) : valOf(b, cat) - valOf(a, cat)))
    : [];
  const leader = ranked[0];
  const runnerUp = ranked[1];
  // How far clear the leader is, phrased per category — a hundredth of an ERA
  // and a hundred home runs are both "1" without this.
  let marginText = "";
  if (leader && runnerUp) {
    const d = Math.abs(valOf(leader, cat) - valOf(runnerUp, cat));
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
      {/* On-page anchors first, then the way out to a real club last — it's the
          only item that leaves the page, so it reads as the destination. */}
      <nav className="rk-lp-navbar">
        <a href="#how" className={"rk-nav" + (activeNav === "how" ? " is-active" : "")}>How It Works</a>
        <a href="#board" className={"rk-nav" + (activeNav === "board" ? " is-active" : "")}>The Board</a>
        <a href="#request" className={"rk-nav" + (activeNav === "request" ? " is-active" : "")}>Request Access</a>
        <Link to={`/${DEMO_SLUG}`} className="rk-nav">View a Live Club</Link>
      </nav>

      {/* Statement. Set in the board's own language — uppercase, bold, tight. */}
      <section className="rk-lp-statement">
        <h1 className="rk-lp-h1">
          Doing the math<br />your league won't.
        </h1>
        <p className="rk-lp-sub">
          Live category standings for your league's side bets. Read off the box
          score every morning, so nobody has to take anybody's word for it.
        </p>
        {/* The statement had nothing to act on — the only way in was a nav item. */}
        <div className="rk-lp-hero-cta">
          <a href="#request" className="rk-lp-cta-primary">Request access &rarr;</a>
          <Link to={`/${DEMO_SLUG}`} className="rk-lp-cta-secondary">See a live club</Link>
        </div>
      </section>

      {/* The section the nav has always promised. Three steps, once a season. */}
      <section className="rk-lp-how" id="how">
        <div className="rk-lp-how-head">How it works</div>
        <p className="rk-lp-how-sub">Three steps, once a season. After that it runs off the box score without anybody touching it.</p>
        <div className="rk-lp-how-grid">
          {STEPS.map((st) => (
            <div key={st.n} className="rk-lp-step">
              {/* Line-coloured on purpose: at this size it's ordering texture,
                  not type, so it adds scale without spending the accent. */}
              <div className="rk-lp-step-n">{st.n}</div>
              <div className="rk-lp-step-head">{st.head}</div>
              <p className="rk-lp-step-body">{st.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The board, live. Four categories, four different races over the same
          eight teams — switching between them is the whole point. */}
      <section className="rk-lp-board" id="board">
        <div className="rk-lp-board-head">
          <div className="rk-lp-board-name">The board</div>
          {live.meta?.gamesLive > 0 && (
            <span className="rk-badge-live"><span className="rk-live-dot" />Live</span>
          )}
        </div>
        <p className="rk-lp-board-sub">
          Every category keeps its own running order. Switch between them — the same eight teams, four different races.
        </p>

        <div className="rk-lp-spot-tabs">
          {CATS.map((c) => (
            <button
              key={c.key}
              className={"rk-lp-spot-tab" + (cat === c.key ? " is-active" : "")}
              onClick={() => { paused.current = true; setCat(c.key); }}
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
              {ranked.map((team, i) => (
                <div
                  key={team}
                  className={"rk-lp-racerow" + (i === 0 ? " is-first" : "")}
                  style={{
                    transform: `translateY(${i * ROW_H}px)`,
                    opacity: i >= VISIBLE_ROWS ? 0 : 1,
                    // Cascading top-down is what makes a category switch read
                    // as teams passing each other rather than one reshuffle. At
                    // 45ms the moves overlapped enough to look like two rows
                    // swapping at once, so each is given room to land first.
                    transitionDelay: `${i * 85}ms`,
                  }}
                >
                  <span className="rk-lp-racerank">{i + 1}</span>
                  {league.logos?.[team] && <img src={league.logos[team]} alt="" className="rk-lp-racecrest" />}
                  <span className="rk-lp-racename">{team}</span>
                  <span className="rk-lp-racevalue">{fmtVal(cat, valOf(team, cat))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The headline figure, next to the order it's derived from. */}
          <div className="rk-lp-spot">
            <div className="rk-lp-spot-eyebrow">Leading now</div>
            <div className="rk-lp-spot-figure">{leader ? fmtVal(cat, valOf(leader, cat)) : "—"}</div>
            <div className="rk-lp-spot-team">{leader || "—"}</div>
            {marginText && <div className="rk-lp-spot-margin">{marginText}</div>}
            <div className="rk-lp-spot-stake">
              <span className="rk-lp-spot-stake-l">On this category</span>
              <span className="rk-lp-spot-stake-v">${PER_CATEGORY}</span>
            </div>
          </div>
        </div>

        <div className="rk-lp-board-foot">
          <Link to={`/${DEMO_SLUG}`} className="rk-lp-board-open">
            Open {ready ? league.meta?.leagueName || "the full club" : "the full club"} &rarr;
          </Link>
          {ready && league.meta?.teamCount && (
            <span className="rk-lp-board-meta">{league.meta.teamCount} teams · {league.meta.seasonId} season</span>
          )}
          {daysLeft != null && (
            <span className="rk-lp-board-count">
              <span className="rk-lp-board-count-n">{daysLeft}</span>
              <span className="rk-lp-board-count-l">days left</span>
            </span>
          )}
        </div>
      </section>

      {/* Full-bleed band. Dark in both themes — its own ground is the boundary,
          so it needs no hairline. */}
      <section className="rk-lp-band">
        <div className="rk-lp-band-photo">
          <img src="/band.jpg" alt="" />
          {/* Ground-coloured dots painted over the photo, strongest at the right
              and gone by the midpoint, so the image breaks apart into the
              brand's dot matrix instead of stopping at an edge. */}
          <span className="rk-lp-band-dots" aria-hidden="true" />
        </div>
        <div className="rk-lp-band-type">
          <div className="rk-lp-band-head">Nobody argues with the box score.</div>
          <p className="rk-lp-band-sub">The number everyone in the league is looking at is the same number, at the same time, from the same source.</p>
        </div>
      </section>

      {/* The bet travels. Below the band now — breadth only lands once you know
          what the thing is. */}
      <section className="rk-lp-sports">
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
      <section className="rk-lp-platforms">
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
      <section className="rk-lp-request" id="request">
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
