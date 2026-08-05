import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "./theme.js";
import { useLeagueData } from "./useLeagueData.js";

// The club that's actually running. The landing page's proof is that these
// numbers are real and moving, so it reads from the same feed the board does.
const DEMO_SLUG = "if-can-can";
// What each category pays in the club that's running. The figures are bets, not
// stats — without the stake attached they're just four numbers.
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

  const fmtAvg = (v) => v.toFixed(3).replace("0.", ".");
  const fmtERA = (v) => v.toFixed(2);

  // Best value per category across the league — the same figures the board's
  // Leaders row shows, so the landing and the club can never disagree.
  const ready = league.status === "ready" && league.players.length > 0;
  const leaders = {};
  if (ready) {
    CATS.forEach(({ key }) => {
      let best = null, who = null;
      league.players.forEach((p) => {
        const v = (league.seasonTotals[p] || {})[key];
        if (v == null) return;
        if (best == null || (key === "era" ? v < best : v > best)) { best = v; who = p; }
      });
      leaders[key] = best == null ? null : {
        value: key === "avg" ? fmtAvg(best) : key === "era" ? fmtERA(best) : String(best),
        team: who,
      };
    });
  }
  // Standings exactly as the club orders them, trimmed to what fits. Showing the
  // board is the only thing that answers "what is this" — four figures alone
  // were a row torn out of a table.
  const standings = ready
    ? [...league.players]
        .sort((a, b) => (league.seeds[a] || 999) - (league.seeds[b] || 999))
        .slice(0, 6)
        .map((p) => ({ team: p, logo: league.logos[p], tot: league.seasonTotals[p] || {} }))
    : [];
  const isLeaderCell = (key, team) => leaders[key] && leaders[key].team === team;

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
        <a href="#how" className="rk-nav">How It Works</a>
        <a href="#request" className="rk-nav">Request Access</a>
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
        <div className="rk-lp-board-head">
          <div>
            <div className="rk-lp-board-eyebrow">A live club</div>
            <div className="rk-lp-board-name">{ready ? league.meta?.leagueName || "If Can Can" : "If Can Can"}</div>
          </div>
          <Link to={`/${DEMO_SLUG}`} className="rk-lp-board-open">Open the full club &rarr;</Link>
        </div>

        <div className="rk-lp-card">
        <div className="rk-lp-table">
          <div className="rk-lp-tr rk-lp-thead">
            <span>#</span><span>Team</span>
            {CATS.map((c) => <span key={c.key} className="rk-lp-num-cell">{c.short}</span>)}
          </div>
          {standings.map((row, i) => (
            <div key={row.team} className="rk-lp-tr">
              <span className="rk-lp-rank">{i + 1}</span>
              <span className="rk-lp-tname">
                {row.logo && <img src={row.logo} alt="" className="rk-lp-crest" />}
                <span className="rk-lp-tname-text">{row.team}</span>
              </span>
              {CATS.map((c) => {
                const v = row.tot[c.key];
                const shown = v == null ? "\u2014" : c.key === "avg" ? fmtAvg(v) : c.key === "era" ? fmtERA(v) : String(v);
                return (
                  <span key={c.key} className={"rk-lp-num-cell" + (isLeaderCell(c.key, row.team) ? " is-leader" : "")}>{shown}</span>
                );
              })}
            </div>
          ))}
        </div>
        </div>

        {/* What those columns are worth — the reason it's a club, not a spreadsheet. */}
        <div className="rk-lp-stakes">
          {CATS.map((c) => (
            <span key={c.key} className="rk-lp-stake-item">
              <span className="rk-lp-stake-cat">{c.label}</span>
              <span className="rk-lp-stake-amt">${PER_CATEGORY}</span>
            </span>
          ))}
          <span className="rk-lp-stake-total">${TOTAL_ON_THE_LINE} on the line &middot; settled automatically</span>
        </div>
      </section>

      {/* The bet travels. The live figures above are baseball because that's the
          club that's running — this says the same machinery works anywhere, in
          the board's own column rhythm. */}
      <section className="rk-lp-sports" id="how">
        <div className="rk-lp-sports-head">A bet is a stat, a direction and a payout.<br />That works in any sport.</div>
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
          <div className="rk-lp-fine">One email either way. Nothing else, ever.</div>
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
