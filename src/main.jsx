import React from "react";
import ReactDOM from "react-dom/client";
// Self-hosted fonts (Google's CDN is blocked in this environment) — Vite bundles
// and serves these from our own origin, so they always load.
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource-variable/bricolage-grotesque"; // family: 'Bricolage Grotesque Variable'
import BaseballTracker from "./BaseballTracker.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BaseballTracker />
  </React.StrictMode>
);
