import { useCallback, useEffect, useState } from "react";

// Rake 2.0 type & surface system (handoff 2026-07-30). Neue Haas Unica, one
// Honolulu blue reserved for live/leading/winning, everything else neutral.
// Zero radius, NO shadows — structure comes from 1px hairlines. Titles + team
// names are PURE black (off-black reads faded at title sizes). Dark is a cool
// slate adaptation of the same system (the spec ships light only).
export const THEMES = {
  light: {
    pageBg: "#FFFFFF",       // white ground
    panel: "#FFFFFF",        // paper — card ground
    panelBorder: "#E3E3E3",  // line — every hairline/border
    divider: "#E3E3E3",      // line
    textPrimary: "#000000",  // title — titles + team names, pure black
    textSecondary: "#16181D",// ink — body / stat data
    textMuted: "#565C66",    // grey — secondary text, record, deks
    // muted — eyebrows, column heads, legal. Was #9AA0AA, which sat at 2.63:1
    // on white (well under the 4.5:1 AA floor) and read washed out; this is
    // 4.69:1 while staying a clear step lighter than textMuted above.
    textFaint: "#6E7480",
    accent: "#0076B6",       // Honolulu blue — live/leading/winning ONLY
    accentHover: "#015B8C",
    accentText: "#ffffff",
    leader: "#0076B6",       // leading/winning figure
    delta: "#2E9E5B",        // today's live gain (+N) — green, distinct from the blue leaders
    live: "#0076B6",         // LIVE badge — accent blue, hairline-outlined
    danger: "#C23B22",       // error state only
    rowHover: "#F5F6F8",
    rowSelected: "#F5F6F8",  // same soft grey the hover state uses
    selectedBar: "#0076B6",
    tableHeadText: "#9AA0AA",
    iconColor: "#6E7480",
    iconHover: "#F0F1F4",
    iconBorder: "#E3E3E3",
    boardShadow: "none",
    cardShadow: "none",
    numberColor: "#16181D",  // ink
    avatarBg: "#E3E3E3",
    currentChipBg: "rgba(0,118,182,0.10)",
    currentChipText: "#0076B6",
    markTile: "#0076B6",
    markDot: "#F6F2E9",
    well: "rgba(0,0,0,0.05)",           // inactive / empty container fill
    dotTexture: "rgba(0,0,0,0.09)",
    glass: "rgba(255,255,255,0.6)",
    glassEdge: "none",
    shimmerBase: "#C4C9D2",             // loader shimmer base
    // espn-fantasy.svg is a flat black mark loaded via <img>, so its paths
    // can't be recoloured by CSS — invert it wholesale on dark ground.
    espnFilter: "none",
  },
  dark: {
    pageBg: "#14171C",       // ground = card (no separate frame), matches the white-on-white light ground
    panel: "#14171C",        // paper — dark card ground
    panelBorder: "#23272E",  // line
    divider: "#23272E",
    textPrimary: "#FFFFFF",  // title — pure white
    textSecondary: "#E9ECF1",// ink
    textMuted: "#A5ACB8",    // grey
    textFaint: "#7A828E",    // muted — 4.63:1 on the #14171C ground (was
                             // #6E7682 at 3.91:1, under the 4.5:1 AA floor).
                             // Still a clear step below textMuted (#A5ACB8),
                             // so the grey hierarchy survives the bump.
    accent: "#4FA6D4",
    accentHover: "#7CC3E8",
    accentText: "#0B0C0F",
    leader: "#4FA6D4",
    delta: "#5FC98A",        // green, brighter for dark bg
    live: "#4FA6D4",
    danger: "#EF5A44",
    rowHover: "#181C22",
    rowSelected: "#181C22",  // same soft tone the hover state uses
    selectedBar: "#4FA6D4",
    tableHeadText: "#6E7682",
    iconColor: "#A5ACB8",
    iconHover: "#181C22",
    iconBorder: "#23272E",
    boardShadow: "none",
    cardShadow: "none",
    numberColor: "#E9ECF1",
    avatarBg: "#23272E",
    currentChipBg: "rgba(79,166,212,0.14)",
    currentChipText: "#7CC3E8",
    markTile: "#0076B6",
    markDot: "#F6F2E9",
    well: "rgba(255,255,255,0.05)",
    dotTexture: "rgba(233,236,241,0.05)",
    glass: "rgba(20,23,28,0.6)",
    glassEdge: "none",
    shimmerBase: "#545C68",
    espnFilter: "invert(1)",
  },
};

export function useTheme() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("bt-theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("bt-theme", mode);
    } catch {
      /* ignore */
    }
    // Theme the document itself so overscroll/initial paint never flashes.
    const th = THEMES[mode] || THEMES.light;
    document.documentElement.style.background = th.pageBg;
    document.body.style.background = th.pageBg;
    // Expose the palette as CSS custom properties so the type/surface classes in
    // index.html stay theme-aware (light ⇄ dark) without duplicating hexes.
    const root = document.documentElement.style;
    root.setProperty("--rk-surface", th.panel);
    root.setProperty("--rk-page", th.pageBg);
    root.setProperty("--rk-paper", th.panel);
    root.setProperty("--rk-line", th.divider);
    root.setProperty("--rk-title", th.textPrimary);
    root.setProperty("--rk-ink", th.textSecondary);
    root.setProperty("--rk-grey", th.textMuted);
    root.setProperty("--rk-muted", th.textFaint);
    root.setProperty("--rk-accent", th.accent);
    root.setProperty("--rk-well", th.well);
    root.setProperty("--rk-hover", th.rowHover);
    root.setProperty("--rk-sel", th.rowSelected);
    root.setProperty("--rk-icon-hover", th.iconHover);
    root.setProperty("--rk-glass", th.glass);
  }, [mode]);

  const toggle = useCallback(() => {
    // Suppress transitions for the frame the theme swaps, so elements with a
    // background/box-shadow transition (the sticky standings columns) don't
    // animate light→dark and flash out of step with everything else.
    if (typeof document !== "undefined") {
      const el = document.documentElement;
      el.classList.add("bt-no-transition");
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("bt-no-transition")));
    }
    setMode((m) => (m === "light" ? "dark" : "light"));
  }, []);

  return { mode, t: THEMES[mode] || THEMES.light, toggle };
}
