import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "./theme.js";
import { useLeagueData } from "./useLeagueData.js";

// The club that's actually running. The landing page's proof is that these
// numbers are real and moving, so it reads from the same feed the board does.
const DEMO_SLUG = "if-can-can";
// What each category pays in the club that's running. The figures are bets, not
// stats — without the stake attached they're just four numbers.
// Each frame is one beat of the loop: the full running order, and the averages
// that justify it. Only the first VISIBLE_ROWS are on screen, so as the order
// shuffles, teams genuinely climb into and drop out of view — which is the
// behaviour this section exists to demonstrate.
const VISIBLE_ROWS = 5;
const DEMO_FRAMES = [
  { order: [0, 1, 2, 3, 4, 5, 6, 7], vals: [".264", ".263", ".253", ".252", ".251", ".249", ".247", ".241"] },
  { order: [1, 0, 4, 2, 3, 6, 5, 7], vals: [".267", ".264", ".261", ".256", ".252", ".250", ".249", ".241"] },
  { order: [4, 1, 5, 0, 2, 3, 7, 6], vals: [".272", ".269", ".266", ".264", ".258", ".252", ".250", ".247"] },
  { order: [5, 4, 1, 7, 0, 2, 6, 3], vals: [".275", ".273", ".270", ".266", ".264", ".259", ".251", ".248"] },
  { order: [7, 5, 6, 4, 1, 0, 3, 2], vals: [".278", ".276", ".272", ".269", ".266", ".264", ".255", ".250"] },
  { order: [6, 7, 0, 5, 2, 4, 1, 3], vals: [".281", ".277", ".274", ".271", ".268", ".265", ".262", ".254"] },
];
const PER_CATEGORY = 100;
const TOTAL_ON_THE_LINE = 400;
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  // Matches the club's nav: the item for the section you're looking at is
  // marked, rather than every item sitting inert until clicked.
  const [activeNav, setActiveNav] = useState("");
  // Marks the section you're looking at, the way the club's nav does.
  useEffect(() => {
    const ids = ["how", "request"];
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
  // A scripted loop, deliberately NOT the live feed. This section's job is to
  // show what the product does — teams overtaking each other as averages move —
  // and then send you to the real club. Live averages barely shift day to day,
  // so wiring this to real data would mean it never visibly animated.
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % DEMO_FRAMES.length), 2600);
    return () => clearInterval(id);
  }, []);

  const ready = league.status === "ready" && league.players.length > 0;

  // Four real teams supply the names and crests; the running order and the
  // averages come from DEMO_FRAMES, not from these figures.
  const ranked = ready
    ? [...league.players]
        .sort((a, b) => (league.seeds[a] || 999) - (league.seeds[b] || 999))
        .slice(0, 8)
        .map((p) => ({ team: p, logo: league.logos[p] }))
    : [];

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

      {/* The board itself, live. A club is a leaderboard with money on it, and
          that only reads if you can see the leaderboard. */}
      <section className="rk-lp-board" id="club">
        {/* Says what the section is, then names the club — the eyebrow used to
            float above a centred title with no relationship to it. */}
        <div className="rk-lp-board-head">
          <div className="rk-lp-board-name">Watch the standings move</div>
          <p className="rk-lp-board-sub">
            Every category re-ranks itself as games finish. Here's one running now.
          </p>
        </div>

        {/* Every team holds its own row; only the row's vertical position
            changes when the category does. Rows are keyed by team so React
            never remounts them, which is what lets the transform transition
            instead of snapping. */}
        <div className="rk-lp-card">
          <div className="rk-lp-race" style={{ height: `${VISIBLE_ROWS * 50}px` }}>
            {ranked.map((row, teamIdx) => {
              const pos = DEMO_FRAMES[frame].order.indexOf(teamIdx);
              const val = DEMO_FRAMES[frame].vals[pos];
              // Off-screen ranks stay mounted so they can slide back in.
              const offscreen = pos >= VISIBLE_ROWS;
              return (
                <div
                  key={row.team}
                  className={"rk-lp-racerow" + (pos === 0 ? " is-first" : "")}
                  style={{ transform: `translateY(${pos * 50}px)`, opacity: offscreen ? 0 : 1 }}
                >
                  <span className="rk-lp-racerank">{pos + 1}</span>
                  {row.logo && <img src={row.logo} alt="" className="rk-lp-racecrest" />}
                  <span className="rk-lp-racename">{row.team}</span>
                  <span className="rk-lp-racevalue">{val}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* What those columns are worth — the reason it's a club, not a spreadsheet. */}
        <div className="rk-lp-board-cta">
          <Link to={`/${DEMO_SLUG}`} className="rk-lp-board-open">Open {ready ? league.meta?.leagueName || "the full club" : "the full club"} &rarr;</Link>
        </div>

        <div className="rk-lp-stakes">
          {CATS.map((c) => (
            <span key={c.key} className="rk-lp-stake-item">
              <span className="rk-lp-stake-cat">{c.label}</span>
              <span className="rk-lp-stake-amt">${PER_CATEGORY}</span>
            </span>
          ))}
        </div>
      </section>

      {/* The bet travels. The live figures above are baseball because that's the
          club that's running — this says the same machinery works anywhere, in
          the board's own column rhythm. */}
      <section className="rk-lp-sports" id="how">
        <div className="rk-lp-sports-head">A bet is a stat, a direction and a payout.<br />That works in any sport.</div>
        <p className="rk-lp-sports-sub">Add any category your league tracks on the side.</p>
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
          Want to start tracking your league's side bets for the upcoming football season?
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
