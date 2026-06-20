import { useState, useMemo, useEffect, useRef } from "react";
import { useLeagueData } from "./useLeagueData.js";
import { useTheme } from "./theme.js";

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MAXW = 1040;

function calcTotals(weeks) {
  if (!weeks.length) return { hr: 0, avg: 0, wins: 0, era: 0 };
  const hr = weeks.reduce((s, w) => s + w.hr, 0);
  const wins = weeks.reduce((s, w) => s + w.wins, 0);
  const avg = weeks.reduce((s, w) => s + w.avg, 0) / weeks.length;
  const era = weeks.reduce((s, w) => s + w.era, 0) / weeks.length;
  return { hr, avg, wins, era };
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
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

function GhostButton({ label, onClick, t, disabled, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "32px", height: "32px", borderRadius: "8px", border: "none",
        background: hover && !disabled ? t.iconHover : "transparent",
        color: t.iconColor, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1, transition: "background 0.12s",
      }}
    >
      {children}
    </button>
  );
}

// Team logo with graceful fallback to a colored dot, in a fixed footprint so
// columns stay aligned.
function TeamMark({ logo, color, size = 20 }) {
  const [err, setErr] = useState(false);
  const box = { width: size, height: size, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" };
  if (logo && !err) {
    return <img src={logo} alt="" onError={() => setErr(true)} style={{ ...box, borderRadius: "50%", objectFit: "cover", background: "#fff" }} />;
  }
  const dot = Math.round(size * 0.5);
  return <span style={box}><span style={{ width: dot, height: dot, borderRadius: "50%", background: color }} /></span>;
}

function SectionLabel({ t, children, style }) {
  return (
    <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.3px", color: t.textPrimary, margin: "0 0 14px 0", ...style }}>
      {children}
    </h2>
  );
}

export default function BaseballTracker() {
  const league = useLeagueData();
  const { mode, t, toggle } = useTheme();

  const players = league.players;
  const colors = league.colors;
  const logos = league.logos;
  const records = league.records;
  const seeds = league.seeds;
  const managers = league.managers;
  const data = league.data;
  const myTeam = league.myTeam;

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [flash, setFlash] = useState({});
  const [stScrolled, setStScrolled] = useState(false);
  const splitsRef = useRef(null);
  const prevTotalsRef = useRef(null);

  const totals = useMemo(() => {
    const m = {};
    players.forEach(p => { m[p] = calcTotals(data[p] || []); });
    return m;
  }, [data, players]);

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
    // Bring the splits into view on smaller screens.
    requestAnimationFrame(() => splitsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  // ---- Loading / error ----
  if (league.status === "error") {
    return <Splash t={t} title="Couldn't load league" sub={league.error} error />;
  }
  if (league.status !== "ready" || !players.length) {
    return <Splash t={t} title="Loading league" sub="Pulling live standings from ESPN Fantasy" loading />;
  }

  const th = (align) => ({ padding: "11px 14px", textAlign: align, fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: t.tableHeadText, whiteSpace: "nowrap" });
  const td = (align) => ({ padding: "0 14px", height: "52px", textAlign: align, fontSize: "13px", color: t.textSecondary, borderBottom: `1px solid ${t.divider}`, whiteSpace: "nowrap" });
  const numCell = { fontVariantNumeric: "tabular-nums", fontWeight: "600", color: t.numberColor, fontSize: "14px" };
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
  const leadCell = (cat, player) => (leadFmt[cat] != null && fmtVal(cat, totals[player]?.[cat] ?? 0) === leadFmt[cat] ? { color: t.leader, fontWeight: "800" } : {});
  // Every team tied for a category lead (so leader cards surface all of them).
  const leaderTeams = {};
  ["hr", "avg", "wins", "era"].forEach(cat => {
    const list = players.filter(p => leadFmt[cat] != null && fmtVal(cat, totals[p]?.[cat] ?? 0) === leadFmt[cat]);
    list.sort((a, b) => (seeds[a] || 999) - (seeds[b] || 999));
    leaderTeams[cat] = list;
  });
  const panel = { background: t.panel, borderRadius: "12px", border: `1px solid ${t.panelBorder}`, boxShadow: t.shadow };

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

  return (
    <div style={{ fontFamily: FONT, background: t.pageBg, minHeight: "100vh", color: t.textPrimary }}>
      <div style={{ height: "2px", background: t.topStrip }} />

      {/* Header */}
      <header style={{ background: t.panel, borderBottom: `1px solid ${t.panelBorder}` }}>
        <div className="bt-headrow" style={{ maxWidth: MAXW, margin: "0 auto", padding: "20px 24px" }}>
          <div style={{ minWidth: 0 }}>
            <h1 className="bt-title" style={{ margin: 0, fontSize: "22px", fontWeight: "700", letterSpacing: "-0.4px", color: t.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {leagueName}
            </h1>
            {metaLine && (
              <div style={{ fontSize: "12.5px", color: t.textMuted, marginTop: "4px", fontWeight: "500" }}>{metaLine}</div>
            )}
          </div>
          <div className="bt-headctrls" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {synced && (
              <span style={{ fontSize: "11.5px", color: t.textMuted, marginRight: "4px", whiteSpace: "nowrap" }}>
                {league.refreshing ? "Syncing…" : `Updated ${synced}`}
              </span>
            )}
            <GhostButton label="Refresh data" onClick={league.refresh} t={t} disabled={league.refreshing}>
              <RefreshIcon spinning={league.refreshing} />
            </GhostButton>
            <GhostButton label={mode === "light" ? "Dark mode" : "Light mode"} onClick={toggle} t={t}>
              {mode === "light" ? <MoonIcon /> : <SunIcon />}
            </GhostButton>
          </div>
        </div>
      </header>

      <main className="bt-main" style={{ maxWidth: MAXW, margin: "0 auto", padding: "28px 24px 56px" }}>

        {/* League leaders */}
        <section style={{ marginBottom: "30px" }}>
          <SectionLabel t={t}>League Leaders</SectionLabel>
          <div className="bt-leaders" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px" }}>
            {["hr", "avg", "wins", "era"].map(cat => {
              const label = cat === "era" ? "Best ERA" : cat === "hr" ? "Home Runs" : cat === "avg" ? "Batting Avg" : "Wins";
              const tied = leaderTeams[cat];
              return (
                <div
                  key={cat}
                  style={{
                    background: t.panel, borderRadius: "12px",
                    borderTop: `2px solid ${t.accent}`, borderRight: `1px solid ${t.panelBorder}`,
                    borderBottom: `1px solid ${t.panelBorder}`, borderLeft: `1px solid ${t.panelBorder}`,
                    boxShadow: t.shadow, padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: t.textMuted, letterSpacing: "0.6px", textTransform: "uppercase" }}>{label}</div>
                    {tied.length > 1 && (
                      <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.4px", color: t.accent, background: `${t.accent}1f`, padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase" }}>{tied.length}-way tie</span>
                    )}
                  </div>
                  <div style={{ fontSize: "30px", fontWeight: "800", color: t.leader, lineHeight: "1.1", marginTop: "6px", fontVariantNumeric: "tabular-nums" }}>
                    {leadFmt[cat] ?? "—"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "11px" }}>
                    {tied.map(team => (
                      <button
                        key={team}
                        onClick={() => selectTeam(team)}
                        style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left", width: "100%" }}
                      >
                        <TeamMark logo={logos[team]} color={colors[team]} size={18} />
                        <span style={{ fontSize: "12.5px", color: t.textSecondary, fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Standings */}
        <section style={{ marginBottom: "30px" }}>
          <SectionLabel t={t}>Standings</SectionLabel>
          <div style={{ ...panel, overflow: "hidden" }}>
            <div className={"bt-scroll" + (stScrolled ? " bt-scrolled" : "")} onScroll={e => { const v = e.currentTarget.scrollLeft > 1; setStScrolled(p => (p === v ? p : v)); }}>
            <table className="bt-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.panelBorder}` }}>
                  <th className="bt-c-rank" style={{ ...th("left"), width: "30px", minWidth: "30px", position: "sticky", left: 0, zIndex: 4, background: t.panel }}>#</th>
                  <th className="bt-freeze-edge bt-c-team" style={{ ...th("left"), position: "sticky", left: "30px", zIndex: 4, background: t.panel }}>Team</th>
                  <th className="bt-hide-mobile" style={th("left")}>Record</th>
                  <th style={th("right")}>HR</th>
                  <th style={th("right")}>AVG</th>
                  <th style={th("right")}>Wins</th>
                  <th style={th("right")}>ERA</th>
                </tr>
              </thead>
              <tbody>
                {standingsSorted.map((player, idx) => {
                  const tot = totals[player];
                  const isSel = player === sel;
                  const isLast = idx === standingsSorted.length - 1;
                  const bg = isSel ? t.rowSelected : hoverRow === player ? t.rowHover : "transparent";
                  // Opaque background for the frozen (sticky) cells so scrolling stats slide cleanly underneath.
                  const solidBg = isSel ? `linear-gradient(0deg, ${t.rowSelected}, ${t.rowSelected}), ${t.panel}` : hoverRow === player ? t.rowHover : t.panel;
                  const cell = (align) => ({ ...td(align), borderBottom: isLast ? "none" : `1px solid ${t.divider}` });
                  const fcls = (cat) => { const d = flash[`${player}-${cat}`]; return d ? `bt-flash-${d}` : undefined; };
                  return (
                    <tr
                      key={player}
                      onClick={() => selectTeam(player)}
                      onMouseEnter={() => setHoverRow(player)}
                      onMouseLeave={() => setHoverRow(null)}
                      style={{ cursor: "pointer", background: bg, transition: "background 0.1s" }}
                    >
                      <td className="bt-c-rank" style={{ ...cell("left"), width: "30px", minWidth: "30px", position: "sticky", left: 0, zIndex: 2, background: solidBg, boxShadow: isSel ? `inset 3px 0 0 ${t.selectedBar}` : "none", color: t.textMuted, fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{idx + 1}</td>
                      <td className="bt-freeze-edge bt-c-team" style={{ ...cell("left"), position: "sticky", left: "30px", zIndex: 2, background: solidBg }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          <TeamMark logo={logos[player]} color={colors[player]} size={22} />
                          <span className="bt-team-name" style={{ fontWeight: "600", color: t.textPrimary, fontSize: "13.5px" }}>{player}</span>
                        </div>
                      </td>
                      <td className="bt-hide-mobile" style={{ ...cell("left"), color: t.textMuted, fontVariantNumeric: "tabular-nums", fontSize: "12.5px" }}>{records[player] || "—"}</td>
                      <td className={fcls("hr")} style={{ ...cell("right"), ...numCell, ...leadCell("hr", player) }}>{tot.hr}</td>
                      <td className={fcls("avg")} style={{ ...cell("right"), ...numCell, ...leadCell("avg", player) }}>{fmtAvg(tot.avg)}</td>
                      <td className={fcls("wins")} style={{ ...cell("right"), ...numCell, ...leadCell("wins", player) }}>{tot.wins}</td>
                      <td className={fcls("era")} style={{ ...cell("right"), ...numCell, ...leadCell("era", player) }}>{fmtERA(tot.era)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
          <div style={{ fontSize: "11.5px", color: t.textFaint, marginTop: "10px", marginLeft: "2px" }}>
            Select a team to see its week-by-week splits below.
          </div>
        </section>

        {/* Weekly splits for the selected team */}
        <section ref={splitsRef}>
          <SectionLabel t={t}>Weekly Splits</SectionLabel>
          {sel && selWeeks ? (
          <div style={{ ...panel, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.panelBorder}`, display: "flex", alignItems: "center", gap: "13px" }}>
              <TeamMark logo={logos[sel]} color={colors[sel]} size={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "9px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: t.textPrimary, letterSpacing: "-0.2px" }}>{sel}</span>
                  {records[sel] && (
                    <span style={{ fontSize: "12.5px", color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
                      {records[sel]}{seeds[sel] ? ` (${ordinal(seeds[sel])} of ${league.meta?.teamCount || players.length})` : ""}
                    </span>
                  )}
                </div>
                {managers[sel] && <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>{managers[sel]}</div>}
              </div>
            </div>
            <div className="bt-scroll">
            <table className="bt-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.panelBorder}` }}>
                  <th style={th("left")}>Week</th>
                  <th style={th("right")}>HR</th>
                  <th style={th("right")}>AVG</th>
                  <th style={th("right")}>Wins</th>
                  <th style={th("right")}>ERA</th>
                </tr>
              </thead>
              <tbody>
                {[...selWeeks.keys()].reverse().map((i) => {
                  const w = selWeeks[i];
                  return (
                  <tr key={i}>
                    <td style={{ ...td("left"), paddingTop: "8px", paddingBottom: "8px", height: "auto" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "700", color: t.textPrimary, fontSize: "13px" }}>Week {i + 1}</span>
                        {i + 1 === numWeeks && (
                          <span style={{ fontSize: "9.5px", fontWeight: "700", letterSpacing: "0.5px", color: t.accent, background: `${t.accent}1f`, padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" }}>Current</span>
                        )}
                      </div>
                      {league.weekLabels?.[i] && (
                        <div style={{ fontSize: "11px", color: t.textFaint, marginTop: "2px" }}>{league.weekLabels[i]}</div>
                      )}
                    </td>
                    <td style={{ ...td("right"), ...numCell }}>{w.hr}</td>
                    <td style={{ ...td("right"), ...numCell }}>{fmtAvg(w.avg)}</td>
                    <td style={{ ...td("right"), ...numCell }}>{w.wins}</td>
                    <td style={{ ...td("right"), ...numCell }}>{fmtERA(w.era)}</td>
                  </tr>
                  );
                })}
                <tr style={{ borderTop: `2px solid ${t.panelBorder}` }}>
                  <td style={{ ...td("left"), borderBottom: "none",fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: t.textMuted }}>Season</td>
                  <td style={{ ...td("right"), borderBottom: "none",...numCell, fontWeight: "800" }}>{selTot.hr}</td>
                  <td style={{ ...td("right"), borderBottom: "none",...numCell, fontWeight: "800" }}>{fmtAvg(selTot.avg)}</td>
                  <td style={{ ...td("right"), borderBottom: "none",...numCell, fontWeight: "800" }}>{selTot.wins}</td>
                  <td style={{ ...td("right"), borderBottom: "none",...numCell, fontWeight: "800" }}>{fmtERA(selTot.era)}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
          ) : (
            <div style={{ ...panel, padding: "44px 24px", textAlign: "center", color: t.textMuted, fontSize: "13.5px" }}>
              Select a team from the standings above to see its weekly splits.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Splash({ t, title, sub, error, loading }) {
  return (
    <div style={{ fontFamily: FONT, background: t.pageBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.textPrimary, padding: "40px" }}>
      <div style={{ textAlign: "center", maxWidth: "440px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px", color: error ? "#dc2626" : t.textMuted }}>
          {loading ? <RefreshIcon size={26} spinning /> : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          )}
        </div>
        <div style={{ fontSize: "17px", fontWeight: "700", color: error ? "#dc2626" : t.textPrimary }}>{title}</div>
        {sub && <div style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6", color: t.textMuted, wordBreak: "break-word" }}>{sub}</div>}
      </div>
    </div>
  );
}
