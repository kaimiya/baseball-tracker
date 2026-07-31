import React from "react";
import ReactDOM from "react-dom/client";
// Self-hosted fonts (Google's CDN is blocked in this environment) — served from
// our own origin so they always load. Neue Haas Unica (UI text) is @font-face'd
// in index.html from public/fonts/; Bricolage stays for the "rake" wordmark only.
import "@fontsource/sora/400.css";                 // loader line keeps the previous face
import "@fontsource-variable/bricolage-grotesque"; // family: 'Bricolage Grotesque Variable'
import BaseballTracker from "./BaseballTracker.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BaseballTracker />
  </React.StrictMode>
);
