import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "./theme.js";

// The club that's actually running. The landing page's whole proof is that this
// is real and live, so the preview links straight into it rather than showing a
// mockup.
const DEMO_SLUG = "if-can-can";

// Numbered value props, per the design's 01/02/03 row.
const POINTS = [
  {
    n: "01",
    head: "Locked before opening day",
    body: "Categories and stakes go in first and can't be edited after the fact.",
  },
  {
    n: "02",
    head: "Read off the box score",
    body: "Pulled every morning. Nobody types a number in by hand, so there is nothing to argue about.",
  },
  {
    n: "03",
    head: "Every category pays out",
    body: "Each one settles on its own, so you don't have to win the league to get paid.",
  },
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
  const { t } = useTheme();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: point this at a real collector (Formspree/Resend/etc). Until then it
    // acknowledges locally rather than silently dropping the address.
    setSent(true);
  }

  return (
    <div className="rk-root rk-landing" style={{ fontFamily: "var(--rk-font)", background: t.pageBg, minHeight: "100vh", color: t.textSecondary }}>

      {/* Header — wordmark left, single action right */}
      <header className="rk-lp-bar">
        <span style={{ display: "inline-flex", alignItems: "center", gap: "9px" }}>
          <MarkTile t={t} size={26} />
          <span className="rk-wordmark" style={{ fontSize: "23px" }}>rake</span>
        </span>
        <a href="#request" className="rk-lp-navlink">Request access</a>
      </header>

      {/* Hero — copy left, the live product bleeding off the right edge */}
      <section className="rk-lp-hero">
        <div className="rk-lp-copy">
          <h1 className="rk-lp-h1">Doing the math your league won't.</h1>
          <p className="rk-lp-lede">
            Live standings for the side bets your league runs — home runs, batting average, wins and ERA.
          </p>
          <p className="rk-lp-sub">
            Read off the box score every morning, so nobody has to take anybody's word for it.
          </p>

          <form id="request" className="rk-lp-form" onSubmit={submit}>
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
        </div>

        {/* The real club, rendered live — the proof is that it isn't a mockup.
            Inert (pointer-events off) so the frame reads as an image; the whole
            thing is wrapped in a link through to the club itself. */}
        <div className="rk-lp-preview">
          <Link to={`/${DEMO_SLUG}`} className="rk-lp-frame" aria-label="Open the live club">
            <iframe src={`/${DEMO_SLUG}`} title="If Can Can, No Can Garbage Can — live" loading="lazy" tabIndex={-1} />
          </Link>
        </div>
      </section>

      {/* 01 / 02 / 03 */}
      <section className="rk-lp-points">
        {POINTS.map((p) => (
          <div key={p.n} className="rk-lp-point">
            <div className="rk-lp-num">{p.n}</div>
            <div className="rk-lp-point-head">{p.head}</div>
            <div className="rk-lp-point-body">{p.body}</div>
          </div>
        ))}
      </section>

      <footer className="rk-lp-foot">
        <span className="rk-wordmark" style={{ fontSize: "19px", color: t.textPrimary }}>rake</span>
        <span className="rk-lp-legal">Independent — not affiliated with any league or network</span>
      </footer>
    </div>
  );
}
