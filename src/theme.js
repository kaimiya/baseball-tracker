import { useCallback, useEffect, useState } from "react";

// Restrained, premium palettes. One accent (ESPN red), hairline borders, no
// gradients/glows. Light mirrors the ESPN Fantasy desktop app; dark is a true
// neutral near-black (not navy).
export const THEMES = {
  light: {
    topStrip: "#d50a0a",
    pageBg: "#f1f2f4",
    panel: "#ffffff",
    panelBorder: "#e6e8ec",
    divider: "#edeff2",
    textPrimary: "#15171c",
    textSecondary: "#565c68",
    textMuted: "#878d99",
    textFaint: "#aab0ba",
    accent: "#d50a0a",
    accentText: "#ffffff",
    leader: "#d50a0a",
    rowHover: "#f6f7f9",
    rowSelected: "#fceef0",
    selectedBar: "#d50a0a",
    tableHeadText: "#8a909c",
    iconColor: "#565c68",
    iconHover: "#eef0f2",
    shadow: "0 1px 2px rgba(16,18,23,0.05), 0 1px 3px rgba(16,18,23,0.04)",
    youTagBg: "#eef0f2",
    youTagText: "#7b818d",
    numberColor: "#15171c",
  },
  dark: {
    topStrip: "#ff4d4f",
    pageBg: "#0b0c0f",
    panel: "#15171b",
    panelBorder: "#262a31",
    divider: "#23262d",
    textPrimary: "#f3f4f6",
    textSecondary: "#a7adb8",
    textMuted: "#727885",
    textFaint: "#565c66",
    accent: "#ff4d4f",
    accentText: "#ffffff",
    leader: "#ff5a5c",
    rowHover: "#1b1e24",
    rowSelected: "rgba(255,77,79,0.09)",
    selectedBar: "#ff4d4f",
    tableHeadText: "#727885",
    iconColor: "#a7adb8",
    iconHover: "#20232a",
    shadow: "0 1px 2px rgba(0,0,0,0.5)",
    youTagBg: "#20232a",
    youTagText: "#9aa0ac",
    numberColor: "#f3f4f6",
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
    // Theme the document itself so overscroll/initial paint never flashes light.
    const bg = (THEMES[mode] || THEMES.light).pageBg;
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === "light" ? "dark" : "light")), []);

  return { mode, t: THEMES[mode] || THEMES.light, toggle };
}
