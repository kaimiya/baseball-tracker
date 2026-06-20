import { useCallback, useEffect, useState } from "react";

// How often to silently re-pull while the tab is open (keeps the live week current).
const AUTO_REFRESH_MS = 60000;

// Fetches live league data from our own /api/league proxy. Loads on mount,
// auto-refreshes in the background while visible, and exposes refresh() for a
// manual re-sync.
export function useLeagueData() {
  const [state, setState] = useState({
    status: "loading", // "loading" | "ready" | "error"
    players: [],
    colors: {},
    logos: {},
    records: {},
    seeds: {},
    managers: {},
    data: {},
    seasonTotals: {},
    myTeam: null,
    weekLabels: [],
    meta: null,
    error: null,
    refreshing: false,
  });

  // isRefresh → force a fresh ESPN pull. silent → don't show the spinner
  // (used by auto-refresh; the stat flash is the visible cue instead).
  const load = useCallback((isRefresh, silent) => {
    if (isRefresh && !silent) setState((s) => ({ ...s, refreshing: true }));
    else if (!isRefresh) setState((s) => ({ ...s, status: "loading" }));
    let alive = true;
    fetch(isRefresh ? "/api/league?fresh=1" : "/api/league", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(body.detail ? `${body.error} — ${body.detail}` : body.error || `HTTP ${r.status}`);
        }
        return body;
      })
      .then((body) => {
        if (!alive) return;
        setState({
          status: "ready",
          players: body.players || [],
          colors: body.colors || {},
          logos: body.logos || {},
          records: body.records || {},
          seeds: body.seeds || {},
          managers: body.managers || {},
          data: body.data || {},
          seasonTotals: body.seasonTotals || {},
          myTeam: body.myTeam || null,
          weekLabels: body.weekLabels || [],
          meta: body.meta || null,
          error: null,
          refreshing: false,
        });
      })
      .catch((e) => {
        if (!alive) return;
        // On a refresh failure, keep the existing data; only hard-fail the first load.
        setState((s) => ({
          ...s,
          status: s.status === "ready" ? "ready" : "error",
          error: String(e.message || e),
          refreshing: false,
        }));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = load(false);
    return cleanup;
  }, [load]);

  // Auto-refresh: silently re-pull on an interval while the tab is visible, and
  // immediately when it regains focus. Paused while hidden to avoid wasted calls.
  useEffect(() => {
    let timer = null;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => { stop(); timer = setInterval(() => { if (document.visibilityState === "visible") load(true, true); }, AUTO_REFRESH_MS); };
    const onVis = () => {
      if (document.visibilityState === "visible") { load(true, true); start(); }
      else stop();
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  return { ...state, refresh: () => load(true) };
}
