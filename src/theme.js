import { useCallback, useEffect, useState } from "react";

// Rake brand system. Warm paper, deep ink, one confident Honolulu blue — blue
// is reserved for what's live, leading, or winning; everything else is sand +
// ink. Editorial emphasis: hairline dividers, not boxed/bordered cards. Dark is
// a true ink surface (no navy), blue lifted to #4FA6D4 for legibility on ink.
export const THEMES = {
  light: {
    pageBg: "#F5F2EB",       // soft light off-white (drops the heavy sand feel)
    panel: "#FBFAF6",        // off-white card surface
    panelBorder: "#EAE3D5",  // board edge
    divider: "#E7E0D1",      // sand hairline dividers (the structure lives here)
    textPrimary: "#1A1611",  // ink
    textSecondary: "#544D3F",// row values / body
    textMuted: "#8A7F68",    // warm grey meta
    textFaint: "#A79C85",    // micro labels
    accent: "#0076B6",       // Honolulu blue — THE accent
    accentHover: "#015B8C",
    accentText: "#ffffff",
    leader: "#0076B6",       // leading/winning figure
    delta: "#2E9E5B",        // today's live gain (+N) — green, distinct from the blue leader figures
    live: "#D23B22",         // LIVE badge dot + label
    rowHover: "#F2ECDE",
    rowSelected: "#E9F2F8",  // soft blue tint — selected/active team
    selectedBar: "#0076B6",
    tableHeadText: "#A79C85",
    iconColor: "#8A7F68",
    iconHover: "#F2ECDE",
    iconBorder: "#E7E0D2",
    boardShadow: "0 30px 70px rgba(26,22,17,.22)",
    cardShadow: "0 4px 16px rgba(26,22,17,.06), 0 1px 2px rgba(26,22,17,.05)",
    numberColor: "#544D3F",
    avatarBg: "#EFEADD",
    currentChipBg: "#E5F1F8",
    currentChipText: "#0076B6",
    markTile: "#0076B6",
    markDot: "#F6F2E9",
    dotTexture: "rgba(26,22,17,0.09)", // faint dot-matrix motif (echoes the R mark)
    glass: "rgba(251,250,246,0.5)",    // translucent card (frosted over the page)
    glassEdge: "inset 0 1px 0 rgba(255,255,255,0.6)",
    shimmerBase: "#BDB4A1",            // loader shimmer base (glint = textPrimary)
  },
  dark: {
    pageBg: "#100E0B",       // deep ink page — cards sit on this
    panel: "#1A1611",
    panelBorder: "#2C261C",
    divider: "#2C261C",
    textPrimary: "#F6F2E9",
    textSecondary: "#B8AE9A",
    textMuted: "#8A7F68",
    textFaint: "#6E6656",
    accent: "#4FA6D4",
    accentHover: "#7CC3E8",
    accentText: "#0B0C0F",
    leader: "#4FA6D4",
    delta: "#5FC98A",        // today's live gain (+N) — green, brighter for dark bg
    live: "#E1543B",
    rowHover: "#221D15",
    rowSelected: "rgba(79,166,212,0.12)",
    selectedBar: "#4FA6D4",
    tableHeadText: "#6E6656",
    iconColor: "#B8AE9A",
    iconHover: "#221D15",
    iconBorder: "#2C261C",
    boardShadow: "0 30px 70px rgba(0,0,0,.5)",
    cardShadow: "0 4px 16px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.4)",
    numberColor: "#B8AE9A",
    avatarBg: "#2C261C",
    currentChipBg: "rgba(79,166,212,0.14)",
    currentChipText: "#7CC3E8",
    markTile: "#0076B6",
    markDot: "#F6F2E9",
    dotTexture: "rgba(246,242,233,0.05)",
    glass: "rgba(26,22,17,0.45)",
    glassEdge: "inset 0 1px 0 rgba(255,255,255,0.08)",
    shimmerBase: "#6E6656",
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
