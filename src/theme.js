import { useCallback, useEffect, useState } from "react";

// Rake brand system. Warm paper, deep ink, one confident Honolulu blue — blue
// is reserved for what's live, leading, or winning; everything else is sand +
// ink. Editorial emphasis: hairline dividers, not boxed/bordered cards. Dark is
// a true ink surface (no navy), blue lifted to #4FA6D4 for legibility on ink.
export const THEMES = {
  light: {
    pageBg: "#F4F5F7",       // cool light grey page (crisp, modern)
    panel: "#FFFFFF",        // clean white card surface
    panelBorder: "#E6E8EC",  // board edge
    divider: "#ECEDF0",      // cool hairline dividers
    textPrimary: "#0D1117",  // near-black ink — high contrast
    textSecondary: "#3A414C",// row values / body
    textMuted: "#656C78",    // cool grey meta
    textFaint: "#99A0AB",    // micro labels
    accent: "#0076B6",       // Honolulu blue — THE accent
    accentHover: "#015B8C",
    accentText: "#ffffff",
    leader: "#0076B6",       // leading/winning figure
    delta: "#2E9E5B",        // today's live gain (+N) — green, distinct from the blue leader figures
    live: "#D23B22",         // LIVE badge dot + label
    rowHover: "#F5F6F8",
    rowSelected: "#EAF2FB",  // soft blue tint — selected/active team
    selectedBar: "#0076B6",
    tableHeadText: "#99A0AB",
    iconColor: "#656C78",
    iconHover: "#F0F1F4",
    iconBorder: "#E6E8EC",
    boardShadow: "0 30px 70px rgba(15,17,23,.18)",
    cardShadow: "0 4px 16px rgba(15,17,23,.06), 0 1px 2px rgba(15,17,23,.05)",
    numberColor: "#3A414C",
    avatarBg: "#EDEFF2",
    currentChipBg: "#EAF2FB",
    currentChipText: "#0076B6",
    markTile: "#0076B6",
    markDot: "#F6F2E9",
    dotTexture: "rgba(13,17,23,0.07)", // faint dot-matrix motif (echoes the R mark)
    glass: "rgba(255,255,255,0.6)",    // translucent card (frosted over the page)
    glassEdge: "inset 0 1px 0 rgba(255,255,255,0.8)",
    shimmerBase: "#C6CAD2",            // loader shimmer base (glint = textPrimary)
  },
  dark: {
    pageBg: "#0B0D10",       // cool near-black slate page — cards sit on this
    panel: "#14171C",        // cool dark card surface
    panelBorder: "#23272E",
    divider: "#20242B",
    textPrimary: "#E9ECF1",  // cool off-white
    textSecondary: "#A5ACB8",
    textMuted: "#6E7682",
    textFaint: "#545C68",
    accent: "#4FA6D4",
    accentHover: "#7CC3E8",
    accentText: "#0B0C0F",
    leader: "#4FA6D4",
    delta: "#5FC98A",        // today's live gain (+N) — green, brighter for dark bg
    live: "#EF5A44",
    rowHover: "#181C22",
    rowSelected: "rgba(79,166,212,0.12)",
    selectedBar: "#4FA6D4",
    tableHeadText: "#545C68",
    iconColor: "#A5ACB8",
    iconHover: "#181C22",
    iconBorder: "#23272E",
    boardShadow: "0 30px 70px rgba(0,0,0,.5)",
    cardShadow: "0 4px 16px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.4)",
    numberColor: "#A5ACB8",
    avatarBg: "#23272E",
    currentChipBg: "rgba(79,166,212,0.14)",
    currentChipText: "#7CC3E8",
    markTile: "#0076B6",
    markDot: "#F6F2E9",
    dotTexture: "rgba(233,236,241,0.05)",
    glass: "rgba(20,23,28,0.45)",
    glassEdge: "inset 0 1px 0 rgba(255,255,255,0.08)",
    shimmerBase: "#545C68",
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
    // Mobile drops the cards and sits on one surface (the panel color); expose
    // it as a var so CSS can swap the page background at the mobile breakpoint.
    document.documentElement.style.setProperty("--rk-surface", th.panel);
    // The desktop page background — used for the soft full-bleed section bands
    // on mobile (a gentle tonal step down from the panel surface, not heavy sand).
    document.documentElement.style.setProperty("--rk-page", th.pageBg);
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
