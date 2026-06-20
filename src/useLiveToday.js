import { useCallback, useEffect, useState } from "react";

// Polls /api/live (MLB real-time data) frequently while the tab is visible, so
// today's in-game numbers stay genuinely live.
const POLL_MS = 30000;

export function useLiveToday() {
  const [state, setState] = useState({ status: "loading", teams: {}, meta: null, error: null });

  const load = useCallback(() => {
    fetch("/api/live", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`);
        return b;
      })
      .then((b) =>
        setState({
          status: "ready",
          teams: b.teams || {},
          meta: { date: b.date, gamesLive: b.gamesLive, gamesFinal: b.gamesFinal, gamesTotal: b.gamesTotal, fetchedAt: b.fetchedAt },
          error: null,
        })
      )
      .catch((e) => setState((s) => ({ ...s, status: s.status === "ready" ? "ready" : "error", error: String(e.message || e) })));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  return state;
}
