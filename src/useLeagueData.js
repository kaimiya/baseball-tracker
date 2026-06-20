import { useCallback, useEffect, useState } from "react";

// Fetches live league data from our own /api/league proxy. Loads on mount
// (so the app is current on page load) and exposes refresh() for a manual
// re-sync without a full page reload.
export function useLeagueData() {
  const [state, setState] = useState({
    status: "loading", // "loading" | "ready" | "error"
    players: [],
    colors: {},
    logos: {},
    records: {},
    seeds: {},
    data: {},
    myTeam: null,
    weekLabels: [],
    meta: null,
    error: null,
    refreshing: false,
  });

  const load = useCallback((isRefresh) => {
    setState((s) => ({ ...s, ...(isRefresh ? { refreshing: true } : { status: "loading" }) }));
    let alive = true;
    // Manual refresh forces a fresh ESPN pull; the initial load may use the cache.
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
          data: body.data || {},
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

  return { ...state, refresh: () => load(true) };
}
