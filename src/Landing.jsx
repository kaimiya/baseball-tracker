import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "./theme.js";
import { useLeagueData } from "./useLeagueData.js";
import { useLiveToday } from "./useLiveToday.js";

// The club that's actually running. The landing page's proof is that these
// numbers are real and moving, so it reads from the same feed the board does.
const DEMO_SLUG = "if-can-can";
const CATS = [
  { key: "hr", label: "Home Runs" },
  { key: "avg", label: "Batting Avg" },
  { key: "wins", label: "Wins" },
  { key: "era", label: "Best ERA" },
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

  const fmtAvg = (v) => v.toFixed(3).replace("0.", ".");
  const fmtERA = (v) => v.toFixed(2);

  // Best value per category across the league — the same figures the board's
  // Leaders row shows, so the landing and the club can never disagree.
  const ready = league.status === "ready" && league.players.length > 0;
  const leaders = {};
  if (ready) {
    CATS.forEach(({ key }) => {
      let best = null;
      league.players.forEach((p) => {
        const v = (league.seasonTotals[p] || {})[key];
        if (v == null) return;
        if (best == null || (key === "era" ? v < best : v > best)) best = v;
      });
      leaders[key] = best == null ? null
        : key === "avg" ? fmtAvg(best)
        : key === "era" ? fmtERA(best)
        : String(best);
    });
  }

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
      <nav className="rk-lp-navbar">
        <Link to={`/${DEMO_SLUG}`} className="rk-nav">The Club</Link>
        <a href="#how" className="rk-nav">How It Works</a>
        <a href="#request" className="rk-nav">Request Access</a>
        {live.meta?.gamesLive > 0 && (
          <span className="rk-badge-live"><span className="rk-live-dot" />Live</span>
        )}
      </nav>

      {/* Statement. Set in the board's own language — uppercase, bold, tight. */}
      <section className="rk-lp-statement">
        <h1 className="rk-lp-h1">
          Doing the math<br />your league won't.
        </h1>
      </section>

      {/* The live board's own figures, at full scale. This is the hero image —
          there isn't a screenshot because the numbers themselves are the proof. */}
      <section className="rk-lp-figures">
        {CATS.map(({ key, label }) => (
          <div key={key} className="rk-lp-fig">
            <div className="rk-lp-fig-label">{label}</div>
            <div className="rk-lp-fig-value">{ready ? (leaders[key] ?? "—") : "—"}</div>
          </div>
        ))}
      </section>

      {/* Attribution for the numbers above, and the way in */}
      <section className="rk-lp-strip">
        <div className="rk-lp-strip-l">
          Live from <Link to={`/${DEMO_SLUG}`} className="rk-lp-inline">
            {ready ? league.meta?.leagueName || "If Can Can" : "If Can Can"}
          </Link>{ready && league.meta?.teamCount ? ` · ${league.meta.teamCount} teams` : ""} · Updated continuously
        </div>
        <div className="rk-lp-strip-r">Home runs · Batting average · Wins · ERA</div>
      </section>

      {/* Three claims, in the board's column rhythm */}
      <section className="rk-lp-points" id="how">
        <div className="rk-lp-point">
          <div className="rk-lp-num">01</div>
          <div className="rk-lp-point-head">Locked before opening day</div>
          <div className="rk-lp-point-body">Categories and stakes go in first and can't be edited after the fact.</div>
        </div>
        <div className="rk-lp-point">
          <div className="rk-lp-num">02</div>
          <div className="rk-lp-point-head">Read off the box score</div>
          <div className="rk-lp-point-body">Pulled every morning. Nobody types a number in by hand, so there is nothing to argue about.</div>
        </div>
        <div className="rk-lp-point">
          <div className="rk-lp-num">03</div>
          <div className="rk-lp-point-head">Every category pays out</div>
          <div className="rk-lp-point-body">Each one settles on its own, so you don't have to win the league to get paid.</div>
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
